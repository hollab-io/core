# `@hollab-io/agent-sdk`

SDK for autonomous agents (and any non-human caller) to read and mutate
[hollab.eth](https://hollab.eth.limo) governance state. Designed so an LLM
agent — or a cron job, or a CI runner — can participate in a Holacracy-style
org as a first-class peer of human members.

This package wraps [`viem`](https://viem.sh) and the project's typed contract
bindings into a single `HollabAgent` facade with modules for orgs, circles,
roles, meetings, governance, and voting.

## Quickstart (local anvil, 30 lines)

Assumes you've already booted `./scripts/dev-local.sh` and have at least one
org seeded on local anvil (chain id `31337`).

```bash
# 1. Find an org id from the discovery endpoint
curl http://localhost:42069/agents/index.json
# → { "version": 1, "orgs": [ { "id": "1", "ensName": "acme.hollab.eth", … } ] }

# 2. Run the example — anvil account #9 is the default agent identity
pnpm --filter @hollab-io/agent-sdk tsx examples/propose-tension.ts 1
```

Expected output:

```
→ fetching manifest for org 1 from http://localhost:42069
  org:            ACME (acme.hollab.eth)
  meetingFactory: 0x...
  anchor circle:  Anchor (id=1)
→ agent address: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
→ submitting CreateRole "Agent Proposal 14:32:08" against 0x...
✓ tx 0x... mined, resultId=7
✓ indexer caught up — role visible in manifest

view the org on hola-modern:  http://localhost:5173/#/o/1
view raw manifest:            http://localhost:42069/agents/1.json
```

Open the hola-modern URL — the new role will be in the **Roles** list with the
`🤖` chip on its lead, because the agent address is in
`apps/hola-modern/src/config/agents.ts`.

## What's in the box

```ts
import { HollabAgent } from "@hollab-io/agent-sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

const account = privateKeyToAccount("0x...");
const transport = http("http://127.0.0.1:8545");

const agent = new HollabAgent({
    walletClient: createWalletClient({ account, chain: foundry, transport }),
    publicClient: createPublicClient({ chain: foundry, transport }),
    indexerUrl: "http://localhost:42069/graphql",
    orgFactoryAddress: "0x...",
});

// Reads (via indexer)
await agent.org.get(orgId);
await agent.circles.listByOrg(orgId);
await agent.roles.listByOrg(orgId);

// Writes (via per-org MeetingFactory)
await agent.governance.createRole(meetingFactoryAddress, orgId, {
    circleId: 1n,
    name: "Marketing Lead",
    purpose: "Drive community growth",
    accountabilities: ["Social media", "Content strategy"],
});
```

## The agent loop

1. **Discover** — `GET /agents/index.json` for the list of known orgs on this
   chain.
2. **Read** — `GET /agents/:orgId.json` for the full structural snapshot,
   including all per-org contract addresses. Schema: [`docs/agent-manifest-v1.md`](./docs/agent-manifest-v1.md).
3. **Decide** — your agent logic.
4. **Act** — call methods on `HollabAgent` (`createRole`, `electLead`,
   `castVote`, etc.) using the addresses from step 2.
5. **Verify** — re-fetch the manifest until your change appears.

The example script `examples/propose-tension.ts` does all five steps in ~120 lines.

## Status

-   **Reads:** all structural reads (orgs, circles, roles, members, meetings,
    votes) go through `@hollab-io/indexing-client` and work today.
-   **Writes:** `createRole` / `amendRole` / `removeRole` / `electLead` are wired
    to `MeetingFactory.executeGovernance`. `org.createOrganization`,
    `org.addOrgMember`, `voting.createVote`, `voting.castVote`, and meeting
    start/end/recordOutput all work.
-   **Not yet:** policy mutations (`CreatePolicy` / `AmendPolicy` / `RemovePolicy`)
    — encoders missing. Verifiable agent identity — currently a static allowlist
    in the frontend, see [`docs/agent-manifest-v1.md`](./docs/agent-manifest-v1.md).
