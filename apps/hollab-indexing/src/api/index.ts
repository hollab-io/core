import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { CID } from "multiformats/cid";
import * as Digest from "multiformats/hashes/digest";
import { and, asc, client, eq, graphql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";

import { assembleOrgIndex, assembleOrgManifest } from "./manifest.js";

const app = new Hono();

app.use("*", cors());

app.use("/sql/*", client({ db, schema }));
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

// ── IPFS pin proxy ──────────────────────────────────────────────────────────
// POST /storage/pin streams a raw byte body to either Pinata (when PINATA_JWT
// is set) or a local filesystem mock (when it isn't — used in dev). Both
// branches return CIDv0; the frontend extracts the 32-byte multihash digest
// for on-chain ContentRef.contentHash so the layout matches in both modes.
//
// Local mode also exposes GET /ipfs/:cid as a stand-in gateway so the frontend
// can fetch blobs by pointing VITE_IPFS_GATEWAY at the indexer URL.

const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const MAX_PIN_BYTES = 5 * 1024 * 1024; // 5 MiB upload cap
const LOCAL_STORAGE_DIR = process.env.LOCAL_IPFS_DIR ?? ".ponder/local-ipfs";

const SHA2_256 = 0x12;

function isLocalMode(): boolean {
    return !process.env.PINATA_JWT;
}

function localCidFor(buffer: Uint8Array): string {
    const digest = createHash("sha256").update(buffer).digest();
    const mh = Digest.create(SHA2_256, new Uint8Array(digest));
    return CID.createV0(mh).toString();
}

async function localStore(buffer: Uint8Array): Promise<string> {
    const cid = localCidFor(buffer);
    await mkdir(LOCAL_STORAGE_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_STORAGE_DIR, cid), buffer);
    return cid;
}

async function pinataStore(buffer: ArrayBuffer): Promise<string> {
    const jwt = process.env.PINATA_JWT!;
    const form = new FormData();
    form.append("file", new Blob([buffer]), "blob");
    form.append("pinataOptions", JSON.stringify({ cidVersion: 0 }));

    const res = await fetch(PINATA_PIN_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
        body: form,
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`pinata upload failed (${res.status}): ${detail}`);
    }
    const result = (await res.json()) as { IpfsHash?: string };
    if (!result.IpfsHash) throw new Error("pinata returned no CID");
    return result.IpfsHash;
}

app.post("/storage/pin", async (c) => {
    const buffer = await c.req.arrayBuffer();
    if (buffer.byteLength === 0) {
        return jsonResponse(c, { error: "empty body" }, 400);
    }
    if (buffer.byteLength > MAX_PIN_BYTES) {
        return jsonResponse(c, { error: "payload too large", maxBytes: MAX_PIN_BYTES }, 413);
    }

    try {
        const cid = isLocalMode()
            ? await localStore(new Uint8Array(buffer))
            : await pinataStore(buffer);
        return jsonResponse(c, { cid });
    } catch (err) {
        return jsonResponse(c, { error: (err as Error).message }, 502);
    }
});

// Local gateway — only serves blobs written by the local mock. In production
// (with PINATA_JWT set), reads should go to a real IPFS gateway, not here.
app.get("/ipfs/:cid", async (c) => {
    if (!isLocalMode()) {
        return jsonResponse(c, { error: "local gateway disabled when PINATA_JWT is set" }, 404);
    }
    const cid = c.req.param("cid");
    try {
        // Validate the CID before touching the filesystem so a path like ".."
        // can't escape LOCAL_STORAGE_DIR.
        CID.parse(cid);
    } catch {
        return jsonResponse(c, { error: "invalid CID" }, 400);
    }
    try {
        const bytes = await readFile(path.join(LOCAL_STORAGE_DIR, cid));
        return new Response(bytes, {
            status: 200,
            headers: { "content-type": "application/octet-stream" },
        });
    } catch {
        return jsonResponse(c, { error: "not found", cid }, 404);
    }
});

// ── Agent manifest endpoints ────────────────────────────────────────────────
// Runtime-assembled `agent.json` per org. Schema v1 lives in
// packages/agent-sdk/docs/agent-manifest-v1.md. Sprint spec:
// docs/sprint-agent-native-mvp.md (WS2). Assembled per request from current
// indexer state — no caching.

const CHAIN_ID = Number(process.env.PONDER_CHAIN_ID ?? 31337);

function indexerOrigin(c: { req: { header: (k: string) => string | undefined } }): string {
    const host = c.req.header("host");
    if (!host) return "";
    const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
    return `${proto}://${host}`;
}

function jsonReplacer(_key: string, value: unknown): unknown {
    return typeof value === "bigint" ? value.toString() : value;
}

function jsonResponse(
    c: { json: (body: unknown, status?: number) => Response },
    body: unknown,
    status = 200,
) {
    const text = JSON.stringify(body, jsonReplacer);
    return new Response(text, {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

app.get("/agents/index.json", async (c) => {
    const orgs = await db
        .select({
            id: schema.organization.id,
            name: schema.organization.name,
            subname: schema.organization.subname,
            purpose: schema.organization.purpose,
        })
        .from(schema.organization)
        .orderBy(asc(schema.organization.id));

    const origin = indexerOrigin(c) || null;
    const body = assembleOrgIndex(orgs, { chainId: CHAIN_ID, origin });
    return jsonResponse(c, body);
});

// NOTE: Hono does NOT reliably parse a trailing `.json` suffix on a param
// (`:orgId.json` captures as empty on hono 4.x). Match the whole filename
// segment instead and strip the extension ourselves.
app.get("/agents/:file{[^/]+\\.json}", async (c) => {
    const file = c.req.param("file") ?? "";
    if (file === "index.json") {
        // Shouldn't hit — the more specific /agents/index.json route is
        // registered above — but guard against route-order drift.
        return jsonResponse(c, { error: "use /agents/index.json" }, 404);
    }
    const raw = file.replace(/\.json$/, "");
    let orgIdBig: bigint;
    try {
        orgIdBig = BigInt(raw);
    } catch {
        return jsonResponse(c, { error: "invalid orgId", orgId: raw }, 400);
    }

    const org = await db.query.organization.findFirst({
        where: eq(schema.organization.id, orgIdBig),
    });
    if (!org) {
        return jsonResponse(c, { error: "org not found", orgId: raw }, 404);
    }

    const [circles, roles, members, componentSets, openProposals] = await Promise.all([
        db
            .select()
            .from(schema.circle)
            .where(eq(schema.circle.orgId, orgIdBig))
            .orderBy(asc(schema.circle.circleId)),
        db
            .select()
            .from(schema.role)
            .where(eq(schema.role.orgId, orgIdBig))
            .orderBy(asc(schema.role.roleId)),
        db
            .select()
            .from(schema.orgMember)
            .where(eq(schema.orgMember.orgId, orgIdBig))
            .orderBy(asc(schema.orgMember.addedAt)),
        db
            .select()
            .from(schema.meetingComponentSet)
            .where(eq(schema.meetingComponentSet.orgId, orgIdBig)),
        db
            .select()
            .from(schema.proposal)
            // status=0 → Draft (the only "open" status in the MVP enum subset).
            // See HolacracyTypes.ProposalStatus and ponder.schema.ts.
            .where(and(eq(schema.proposal.orgId, orgIdBig), eq(schema.proposal.status, 0)))
            .orderBy(asc(schema.proposal.submittedAt)),
    ]);

    const origin = indexerOrigin(c) || null;
    const body = assembleOrgManifest(org, circles, roles, members, componentSets, openProposals, {
        chainId: CHAIN_ID,
        origin,
    });
    return jsonResponse(c, body);
});

export default app;
