/**
 * IPFS pin proxy — a standalone Hono sub-app, mounted by the main api in
 * index.ts. Kept Ponder-free (no `ponder:*` virtual-module imports) so it can
 * be exercised in isolation with `storage.request(...)` in tests.
 *
 * POST /storage/pin streams a raw byte body to either Pinata (when PINATA_JWT
 * is set) or a local filesystem mock (when it isn't — used in dev). Both
 * branches return CIDv0; the frontend extracts the 32-byte multihash digest
 * for on-chain ContentRef.contentHash so the layout matches in both modes.
 *
 * Local mode also exposes GET /ipfs/:cid as a stand-in gateway so the frontend
 * can fetch blobs by pointing VITE_IPFS_GATEWAY at the indexer URL.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { CID } from "multiformats/cid";
import * as Digest from "multiformats/hashes/digest";

const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const MAX_PIN_BYTES = 5 * 1024 * 1024; // 5 MiB upload cap
const SHA2_256 = 0x12;

// Read env at call time (not import time) so tests can point LOCAL_IPFS_DIR at a
// temp dir and toggle PINATA_JWT per case.
function localStorageDir(): string {
    return process.env.LOCAL_IPFS_DIR ?? ".ponder/local-ipfs";
}

export function isLocalMode(): boolean {
    return !process.env.PINATA_JWT;
}

/** Deterministic CIDv0 for a buffer: sha2-256 multihash, dag-pb codec. */
export function localCidFor(buffer: Uint8Array): string {
    const digest = createHash("sha256").update(buffer).digest();
    const mh = Digest.create(SHA2_256, new Uint8Array(digest));
    return CID.createV0(mh).toString();
}

async function localStore(buffer: Uint8Array): Promise<string> {
    const cid = localCidFor(buffer);
    const dir = localStorageDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, cid), buffer);
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

const storage = new Hono();

storage.post("/storage/pin", async (c) => {
    const buffer = await c.req.arrayBuffer();
    if (buffer.byteLength === 0) {
        return c.json({ error: "empty body" }, 400);
    }
    if (buffer.byteLength > MAX_PIN_BYTES) {
        return c.json({ error: "payload too large", maxBytes: MAX_PIN_BYTES }, 413);
    }

    try {
        const cid = isLocalMode()
            ? await localStore(new Uint8Array(buffer))
            : await pinataStore(buffer);
        return c.json({ cid });
    } catch (err) {
        return c.json({ error: (err as Error).message }, 502);
    }
});

// Local gateway — only serves blobs written by the local mock. In production
// (with PINATA_JWT set), reads should go to a real IPFS gateway, not here.
storage.get("/ipfs/:cid", async (c) => {
    if (!isLocalMode()) {
        return c.json({ error: "local gateway disabled when PINATA_JWT is set" }, 404);
    }
    const cid = c.req.param("cid");
    try {
        // Validate the CID before touching the filesystem so a path like ".."
        // can't escape the local storage dir.
        CID.parse(cid);
    } catch {
        return c.json({ error: "invalid CID" }, 400);
    }
    try {
        const bytes = await readFile(path.join(localStorageDir(), cid));
        return new Response(bytes, {
            status: 200,
            headers: { "content-type": "application/octet-stream" },
        });
    } catch {
        return c.json({ error: "not found", cid }, 404);
    }
});

export default storage;
