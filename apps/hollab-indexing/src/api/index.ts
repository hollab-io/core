import { Hono } from "hono";
import { cors } from "hono/cors";
import { client, graphql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";

const app = new Hono();

app.use("*", cors());

app.use("/sql/*", client({ db, schema }));
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

// ── Agent manifest endpoints ────────────────────────────────────────────────
// Runtime-assembled `agent.json` per org, per the sprint spec
// (docs/sprint-agent-native-mvp.md, WS2) and schema v1
// (packages/agent-sdk/docs/agent-manifest-v1.md).
//
// Day 1: stubs that return the correct shape with minimal data. Day 2 fills in
// circles/roles/members/openProposals by querying the DB tables.

app.get("/agents/index.json", async (c) => {
    return c.json({
        version: 1,
        chainId: null,
        orgs: [],
        _stub: "day-1 — Day 2 fills from db.select().from(organization)",
    });
});

app.get("/agents/:orgId.json", async (c) => {
    const orgId = c.req.param("orgId");
    return c.json(
        {
            version: 1,
            chainId: null,
            org: {
                id: orgId,
                ensName: null,
                name: null,
                mission: null,
            },
            contracts: {},
            circles: [],
            roles: [],
            members: [],
            openProposals: [],
            indexer: { endpoint: null, type: "ponder" },
            _stub: "day-1 — Day 2 queries ponder:schema tables by orgId",
        },
        200,
    );
});

export default app;
