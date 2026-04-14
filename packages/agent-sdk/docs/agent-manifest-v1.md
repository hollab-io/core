# `agent.json` Manifest — v1

**Status:** v1 (draft, MVP)
**Served at:** `GET {indexerUrl}/agents/:orgId.json` (runtime-assembled, never cached)
**Discovery:** `GET {indexerUrl}/agents/index.json`
**Implementation:** `apps/hollab-indexing/src/api/index.ts`

## Why it exists

A hollab org is a public, agent-readable governance object. The manifest is the
single entrypoint that lets an agent (or any cold reader) answer three questions
without speaking EVM:

1. **What is this org?** — name, ENS subname, mission, chain.
2. **How is it structured right now?** — circles, roles, members.
3. **Where do I act on it?** — the exact contract addresses, the open proposals,
   and the indexer endpoint to poll.

Everything else an agent needs (ABIs, write paths, encoding) lives in
`@hollab-io/agent-sdk`. The manifest is the **runtime pointer**; the SDK is the
**verb library**.

## Design decisions

-   **Runtime-assembled, not static.** The indexer assembles the JSON per request
    by querying its own DB (Drizzle over Ponder's `onchainTable`s). No build step,
    no cron, no cache in MVP. Fresh writes appear on the next indexer tick.
-   **Lives with the data, not the UI.** The manifest endpoint is served by
    `apps/hollab-indexing`, not the frontend. When the SPA ships to IPFS, agents
    still hit the indexer directly — the frontend is the human surface, the
    manifest is the machine surface.
-   **Versioned top-level.** Every manifest has `"version": 1`. Breaking changes
    bump the version; additive changes do not.
-   **Stable ordering.** Circles ordered by `circleId asc`, roles by `roleId asc`,
    members by `addedAt asc`. Agents can diff two snapshots safely.
-   **bigints as decimal strings.** `org.id`, `circles[].id`, `roles[].id`, etc.
    are all decimal string representations of `uint256` so the manifest is
    JSON-safe without losing precision.
-   **No secrets.** ContentRefs (when proposals ship) are hashes only. Encrypted
    blob bodies live in 0G and are out of scope for the manifest.

## Schema (v1)

```jsonc
{
    "version": 1,
    "chainId": 31337,
    "org": {
        "id": "1", // decimal string (uint256)
        "ensName": "acme.hollab.eth", // <subname>.hollab.eth
        "name": "ACME",
        "mission": "...", // organization.purpose
        "creator": "0x...",
        "createdAt": 1712000000,
        "memberCount": 4,
        "circleCount": 3,
        "roleCount": 7,
    },
    "contracts": {
        "circleRegistry": "0x...", // per-org
        "roleRegistry": "0x...", // per-org
        "governanceProcess": "0x...", // per-org
        "meetingFactory": "0x...", // per-org clone (from MeetingComponentsFactory.deploy)
        "actionVoting": "0x...", // per-org clone
        "govToken": "0x...", // organization.token
    },
    "circles": [
        {
            "id": "1",
            "name": "Anchor",
            "purpose": "...",
            "parentId": "0", // "0" for anchor
            "isAnchor": true,
            "roleIds": ["1", "2"],
            "subCircleIds": ["2"],
        },
    ],
    "roles": [
        {
            "id": "1",
            "name": "Lead Link",
            "purpose": "...",
            "domains": ["..."],
            "accountabilities": ["..."],
            "circleId": "1",
            "leads": ["0x..."],
        },
    ],
    "members": [{ "address": "0x...", "joinedAt": 1712000000 }],
    "openProposals": [], // see "Known v1 limitations" below
    "indexer": {
        "endpoint": "http://localhost:42069",
        "type": "ponder",
        "graphql": "http://localhost:42069/graphql",
    },
}
```

## Discovery endpoint

`GET /agents/index.json`:

```jsonc
{
    "version": 1,
    "chainId": 31337,
    "indexer": { "endpoint": "http://localhost:42069", "type": "ponder" },
    "orgs": [
        {
            "id": "1",
            "ensName": "acme.hollab.eth",
            "name": "ACME",
            "mission": "...",
            "manifest": "/agents/1.json",
        },
    ],
}
```

## Forward compatibility

-   Fields may be added within a major version.
-   Agents MUST ignore unknown fields.
-   Removal or semantic change requires bumping `version`.

## Known v1 limitations (documented, not fixed in this sprint)

-   **`openProposals` is always `[]`.** The Ponder schema has a `proposal` table,
    but no contract currently emits the events that populate it — `MeetingFactory.executeGovernance`
    applies structural changes directly to `RoleRegistry` without going through a
    proposal lifecycle. When `GovernanceProcess` ships proposal/objection events,
    this array will populate without a manifest version bump.
-   **`contracts.govToken` may be the zero address** on orgs that opted out of
    the DAO oversight layer.
-   **Agent identity is a static allowlist** in MVP. The manifest does NOT mark
    which addresses are agents. `apps/hola-modern/src/config/agents.ts` holds the
    allowlist that the public surface uses to render the `🤖` chip on members and
    role leads. Verifiable agent attestations land in v1.1.
