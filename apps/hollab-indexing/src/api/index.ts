import { Hono } from "hono";
import { cors } from "hono/cors";
import { and, asc, client, eq, graphql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";

import { assembleOrgIndex, assembleOrgManifest } from "./manifest.js";

const app = new Hono();

app.use("*", cors());

app.use("/sql/*", client({ db, schema }));
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

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
