import { Hono } from "hono";
import { cors } from "hono/cors";
import { asc, client, eq, graphql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";

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

    const origin = indexerOrigin(c);
    const body = {
        version: 1,
        chainId: CHAIN_ID,
        indexer: { endpoint: origin || null, type: "ponder" as const },
        orgs: orgs.map((o) => ({
            id: o.id.toString(),
            ensName: `${o.subname}.hollab.eth`,
            name: o.name,
            mission: o.purpose,
            manifest: `/agents/${o.id.toString()}.json`,
        })),
    };
    return jsonResponse(c, body);
});

app.get("/agents/:orgId.json", async (c) => {
    const raw = c.req.param("orgId") ?? "";
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

    const [circles, roles, members, componentSets] = await Promise.all([
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
    ]);

    // Pick the most recently deployed component set if multiple exist.
    const componentSet = componentSets.sort((a, b) =>
        a.deployedAt > b.deployedAt ? -1 : a.deployedAt < b.deployedAt ? 1 : 0,
    )[0];

    const origin = indexerOrigin(c);
    const body = {
        version: 1,
        chainId: CHAIN_ID,
        org: {
            id: org.id.toString(),
            ensName: `${org.subname}.hollab.eth`,
            name: org.name,
            mission: org.purpose,
            creator: org.creator,
            createdAt: Number(org.createdAt),
            memberCount: members.length,
            circleCount: circles.length,
            roleCount: roles.length,
        },
        contracts: {
            circleRegistry: org.circleRegistry,
            roleRegistry: org.roleRegistry,
            governanceProcess: org.governanceProcess,
            meetingFactory: componentSet?.meetingFactory ?? null,
            actionVoting: componentSet?.actionVoting ?? null,
            govToken: org.token,
        },
        circles: circles.map((c) => ({
            id: c.circleId.toString(),
            name: c.name,
            purpose: c.purpose,
            parentId: c.parentCircleId.toString(),
            isAnchor: c.isAnchor,
            roleIds: c.roleIds,
            subCircleIds: c.subCircleIds,
        })),
        roles: roles.map((r) => ({
            id: r.roleId.toString(),
            name: r.name,
            purpose: r.purpose,
            domains: r.domains,
            accountabilities: r.accountabilities,
            circleId: r.circleId.toString(),
            leads: r.leads,
        })),
        members: members.map((m) => ({
            address: m.memberAddress,
            joinedAt: Number(m.addedAt),
        })),
        // openProposals: the `proposal` schema table exists but no contract
        // currently emits the events that populate it (see Day 2 findings in
        // docs/sprint-agent-native-mvp.md). Until a GovernanceProcess proposal
        // lifecycle ships, this array stays empty in v1.
        openProposals: [],
        indexer: {
            endpoint: origin || null,
            type: "ponder" as const,
            graphql: origin ? `${origin}/graphql` : null,
        },
    };

    return jsonResponse(c, body);
});

export default app;
