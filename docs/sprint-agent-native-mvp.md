# Sprint Plan — Agent-Native MVP

**Owner:** product
**Window:** 2–3 days
**Date opened:** 2026-04-13
**Status:** ready to dispatch to coding agent
**Target environment:** **local-first (anvil + local indexer + local frontend)**. No testnet, no eth.limo, no mainnet in this sprint.

---

## North Star

A hollab org is a **public, agent-readable governance object**: ENS name, shareable URL, machine-readable manifest, live deliberation surface — all readable cold, without a wallet.

We are borrowing paperclip.ing's _UX posture_ (low-friction, playful, shareable, agent-legible), not its stack. Paperclip is web2. Our job is to match its **time-to-understanding** and **share-loop mechanics** while preserving the onchain substrate underneath.

## Environment & Assumptions

-   **Everything runs locally.** Use `./scripts/dev-local.sh` (anvil + indexer + frontend). No Sepolia, no 0G, no mainnet in this sprint's acceptance criteria.
-   **No ENS subname routing.** Public URLs are path-based only: `http://localhost:5173/#/o/<orgId>`. We are not touching eth.limo / wildcard subdomain resolution in this sprint.
-   **`@hollab-io/agent-sdk` is assumed to be a scaffold.** The first deliverable of WS2 is to verify functional status and make at least one write path (submit proposal) work end-to-end against local anvil. Do not assume anything inside `packages/agent-sdk/src` works until proven.
-   **No "hero org" exists yet.** The sprint seeds its own demo org via an existing deploy script (`packages/contracts` → `CreateOrganization.s.sol` or equivalent against local anvil) as part of Day 1 setup.
-   **No demo agent wallet exists yet.** WS2 includes creating one — a deterministic local anvil account used as "the agent" — and wiring the `🤖 agent` chip heuristic to recognize it.

## Non-Goals (explicit cuts — do not re-enter scope)

-   ❌ **Aztec privacy integration** — descoped from MVP entirely. Kept as v2 moat narrative only.
-   ❌ **eth.limo / ENS wildcard subdomain routing** (`<org>.hollab.eth`) — path-based URLs only in this sprint.
-   ❌ **Testnet or mainnet deployment** — local anvil only.
-   ❌ **0G storage integration for new paths** — if the existing 0G path works locally, reuse it; do not extend it.
-   ❌ **Farcaster frames**
-   ❌ **Per-proposal dynamic OG images** (requires a worker/server) — single static per-org OG card is the MVP ceiling.
-   ❌ **Verifiable agent identity / attestations** — the agent chip is a heuristic/allowlist in MVP.
-   ❌ **Treasury UX polish**
-   ❌ **New governance semantics outside `specs/`**
-   ❌ **Any feature that requires wallet-connect before the user has seen value**

---

## Scope: three parallel workstreams

### WS1 — Public Org Surface (frontend + indexer wiring)

A logged-out stranger lands on an org URL and understands the org in under 10 seconds. **Zero wallet connection** anywhere in this tree.

**Deliverables**

1. **New route:** `#/o/:orgId` — renders without any wallet connection. Must use existing `indexing-client` hooks only. No `wagmi` reads, no `useAccount`, no connect prompts anywhere on the page.
2. **New view:** `PublicOrgView` rendering:
    - Mission (hero), ENS subname label, member avatars (ENS-first)
    - Circle tree (read-only variant of `StructureView`)
    - Live proposals (status, age, objection count)
    - Adopted proposals timeline (last 10)
    - "View on-chain" (opens block explorer — for local anvil, link can be a no-op or to a local explorer if one exists) + "Copy link" affordances
3. **Zero wallet-connect above the fold.** A single progressive CTA appears _beside actionable items only_ — "Propose a tension" / "Join this org". Clicking it is the _only_ thing that triggers RainbowKit from the public surface.
4. **Routing:** extend `useHashRouter` with a `public` route variant. The public path must render outside the authed workspace shell (no sidebar, no topbar connect button — or topbar that hides connect on public routes).

**Critical files**

-   `apps/hola-modern/src/hooks/useHashRouter.ts` — add `{ page: "public"; orgId: string }` variant, parse `#/o/:orgId`
-   `apps/hola-modern/src/views/PublicOrgView.tsx` — **new**
-   `apps/hola-modern/src/views/StructureView.tsx` — extract a read-only subcomponent usable by both authed and public views
-   `apps/hola-modern/src/App.tsx` — dispatch public route to a minimal shell (no auth-dependent chrome)
-   `apps/hola-modern/src/components/Topbar.tsx` — must not render connect button on public routes

**Acceptance**

-   Open `http://localhost:5173/#/o/<orgId>` in an incognito window with no wallet extension installed → page renders fully, no errors, no connect prompts.
-   All data on the page comes from the local indexer; no RPC calls to anvil from this view.
-   Clicking "Propose a tension" is the _only_ path that triggers RainbowKit.

---

### WS2 — Agent Manifest + SDK Demo (agent-native primitive)

Machine-readable org surface and a runnable agent example. This is the load-bearing piece for "agents are first-class users." **Assume `agent-sdk` is scaffold — first task is to find out what actually works.**

**Deliverables**

1. **Status audit of `@hollab-io/agent-sdk`** (Day 1 AM, blocking). Report:
    - What's implemented in `packages/agent-sdk/src`?
    - Which contract interactions are wired?
    - What would it take to submit a proposal end-to-end from a script?
2. **`agent.json` manifest schema v1** — versioned JSON shape, documented in `packages/agent-sdk/docs/agent-manifest-v1.md`. Must include:
    ```
    {
      "version": 1,
      "chainId": <number>,
      "org": {
        "id": "0x...",
        "ensName": "<org>.hollab.eth",
        "mission": "..."
      },
      "contracts": { "circleRegistry": "0x...", "roleRegistry": "0x...", "governanceProcess": "0x...", "governanceMeeting": "0x...", "governor": "0x...", "govToken": "0x..." },
      "circles": [{ "id": "...", "name": "...", "purpose": "...", "parentId": "..." }],
      "roles":   [{ "id": "...", "name": "...", "purpose": "...", "domains": [...], "circleId": "..." }],
      "openProposals": [{ "id": "...", "status": "...", "contentRef": "0x...", "proposer": "0x..." }],
      "indexer": { "endpoint": "http://localhost:42069", "type": "ponder" }
    }
    ```
3. **Manifest endpoint — runtime, served by the indexer.** `agent.json` is **not** a static file. It is assembled and returned on demand at request time, so it always reflects current indexer state. Implementation: add a custom API route to `apps/hollab-indexing` (Ponder supports custom HTTP routes) at:
    - `GET /agents/:orgId.json` → returns the v1 manifest for that org
    - `GET /agents/index.json` → returns a list of all known orgs (id, mission, ensName) for discovery
      The route queries Ponder's internal DB and assembles the JSON per request. No caching in MVP — rely on Ponder's own query speed. This gives agents a stable, fresh, well-known URL (`http://localhost:42069/agents/<orgId>.json` in local dev) that is independent of the frontend. When the frontend SPA is deployed to IPFS, agents still hit the indexer endpoint directly — the manifest lives with the data, not with the UI.
4. **`agent-sdk` end-to-end example:** `packages/agent-sdk/examples/propose-tension.ts`:
    - Reads an org via `agent.json` URL (arg or env)
    - Constructs a proposal (CreateRole or similar minimal structural op) with a ContentRef (the 0G upload can be stubbed to a fake hash in local mode — document this)
    - Submits onchain using a local anvil private key (env var `AGENT_PRIVATE_KEY`, default to anvil account #9)
    - Polls the indexer until the proposal appears, prints its public permalink
5. **Agent identity in MVP = allowlist.** A hardcoded set of "known agent addresses" (the anvil account used in step 4) in a shared config. Public views check proposer against this list; matches get a `🤖 agent` chip. Document this is a placeholder for v1.1 attestations.
6. **`packages/agent-sdk/README.md` quickstart** showing the 30-line example command sequence from fresh clone → running example.

**Critical files**

-   `packages/agent-sdk/src/**` — whatever the audit reveals needs to exist to make the example work
-   `packages/agent-sdk/examples/propose-tension.ts` — **new**
-   `packages/agent-sdk/docs/agent-manifest-v1.md` — **new**
-   `packages/agent-sdk/README.md` — update with quickstart
-   `apps/hollab-indexing/src/api/agents.ts` (or wherever Ponder custom routes live — check `ponder.config.ts` and existing api dir) — **new runtime route handler** for `/agents/:orgId.json` and `/agents/index.json`
-   `apps/hollab-indexing/ponder.config.ts` — register the route if needed
-   `apps/hola-modern/src/config/agents.ts` — **new**, the agent-address allowlist
-   `apps/hola-modern/src/views/PublicOrgView.tsx` — render `🤖 agent` chip when proposer is in allowlist

**Acceptance**

-   `curl http://localhost:42069/agents/<orgId>.json` returns valid JSON conforming to schema v1, **assembled at request time** from current indexer state.
-   Submitting a new proposal against local anvil and re-curling the same URL within a few seconds shows the new proposal without any rebuild or restart — proves runtime assembly.
-   From a fresh `./scripts/dev-local.sh` stack, running `pnpm --filter @hollab-io/agent-sdk tsx examples/propose-tension.ts` submits a proposal against local anvil that appears on the `#/o/<orgId>` public page and in the manifest endpoint within one indexer cycle, tagged with `🤖 agent`.

---

### WS3 — Social Surface & Share Loop

The flywheel. Every link pulls a new viewer in cold. Local-only; sharing itself is tested by opening the URL in another incognito window, not by posting to Twitter.

**Deliverables**

1. **`/explore` route** — `#/explore` — global directory of all orgs from the local indexer, sorted by recent governance activity. Card shows: mission line, ENS subname label, live proposal count, member avatar stack. Zero wallet connect. Click → `#/o/:orgId`.
2. **Public proposal permalink** — `#/o/:orgId/p/:proposalId`. Its own `PublicProposalView`. Publicly readable. Shows tension text, objections, status, timeline, back-link to org. Agent chip if proposer is an agent.
3. **Base OG tags** — inject basic `<meta>` tags in `apps/hola-modern/index.html` for org + title + description. Per-page dynamic OG is out of scope. Optionally: the manifest generator (WS2) also emits one static PNG per org as `apps/hola-modern/public/agents/<orgId>.png` using a simple template — **only if Day 3 has slack**.
4. **"Join community" CTA** on `PublicOrgView` — the single place in the public tree where RainbowKit is allowed to mount. Routes into the existing join flow.

**Critical files**

-   `apps/hola-modern/src/views/ExploreView.tsx` — **new**
-   `apps/hola-modern/src/views/PublicProposalView.tsx` — **new**
-   `apps/hola-modern/src/hooks/useHashRouter.ts` — add `explore` and `publicProposal` route variants
-   `apps/hola-modern/index.html` — base OG tags

**Acceptance**

-   `#/explore` lists all orgs deployed on local anvil and updates when a new one is created (refresh).
-   A proposal permalink opened in a fresh incognito window renders correctly, shows agent chip when applicable, and has no wallet-connect prompt.

---

## Day 1 Findings (2026-04-13)

### Blocker 1 — `@hollab-io/agent-sdk` status audit ✅ RESOLVED (not a blocker)

The SDK is **more real than the plan assumed**. It builds cleanly, tests pass (4/4, encoding round-trips), and the write paths we need for WS2 exist.

**What's implemented** (`packages/agent-sdk/src`):

-   `agent.ts` — `HollabAgent` facade aggregating 6 module classes, stores wallet address.
-   `types.ts` — config/inputs/outputs + `ChangeType` enum.
-   `encoding.ts` — ABI-encodes governance payloads: `encodeCreateRole`, `encodeAmendRole`, `encodeRemoveRole`, `encodeElection`. **No Policy encoders yet.**
-   `modules/governance.ts` — write: `executeGovernance(orgId, changeType, data)` → `MeetingFactory.executeGovernance`. Reads proposals via indexing-client.
-   `modules/org.ts` — writes: `createOrganization`, `addOrgMember`, `removeOrgMember` → `OrganizationFactory`.
-   `modules/meetings.ts` — writes: `startMeeting`, `endMeeting`, `recordOutput` → `MeetingFactory`.
-   `modules/voting.ts` — writes: `createVote`, `castVote`, `grantCollaboratorWeight` → `ActionVoting`.
-   `modules/circles.ts`, `modules/roles.ts` — read-only, delegate to indexing-client.
-   All reads go through indexing-client; no direct contract reads.

**Contract deps real:** imports `meetingFactoryAbi`, `organizationFactoryAbi`, `actionVotingAbi` from `@hollab-io/contracts/actions`. Indexing-client is dynamically imported by every read path.

**Gap list for `examples/propose-tension.ts`:**

1. No wallet/client bootstrap helper — example must construct its own `WalletClient`/`PublicClient` from `AGENT_PRIVATE_KEY` + anvil RPC.
2. No address discovery — example must read `MeetingFactory` / `OrganizationFactory` addresses from `packages/contracts/deployments/<chainId>-infrastructure.json` (local chainId 31337).
3. `executeGovernance` extracts `meetingId` from logs — brittle but works; leave alone.
4. Policy encoders missing — **use `ChangeType.CreateRole` for the demo proposal** (per Open Question #3, CreateRole is the least broken path anyway).
5. No existing example to copy from — write one from scratch.
6. ContentRef: stub to a fake 32-byte hash in local mode, documented in the example comments (matches sprint assumption).

**Decision:** proceed with SDK as-is. WS2 example uses `encodeCreateRole` + `governance.executeGovernance`. No fallback to raw viem needed.

### Blocker 2 — Ponder custom-route support ✅ RESOLVED (fully supported)

Ponder **0.16.6** (`apps/hollab-indexing/package.json:17`). Custom HTTP routes are production-ready and **already in use** in this project.

**Existing setup:** `apps/hollab-indexing/src/api/index.ts` exports a Hono app with `/sql/*` (Drizzle client), `/` + `/graphql`, CORS enabled on `*`. Ponder auto-registers the exported app on startup.

**DB access:** import `db` from `"ponder:api"` — read-only Drizzle ORM client. Schema tables import from `"ponder:schema"`. No raw SQL needed.

**Recipe for `GET /agents/:orgId.json`** — add to the existing `src/api/index.ts`:

```ts
import { eq } from "drizzle-orm";
import { circle, organization, orgMember /*, proposal */, role } from "ponder:schema";

app.get("/agents/:orgId.json", async (c) => {
    const orgId = BigInt(c.req.param("orgId"));
    const org = await db.query.organization.findFirst({ where: eq(organization.id, orgId) });
    if (!org) return c.json({ error: "org not found" }, 404);
    // ...assemble circles, roles, openProposals, contracts block
    return c.json({ version: 1, chainId: 31337, org /* ... */ });
});

app.get("/agents/index.json", async (c) => {
    const orgs = await db.select().from(organization);
    return c.json({ version: 1, orgs });
});
```

**Gotchas:** path params are strings (cast to BigInt); CORS already wildcarded; reserved routes (`/health`, `/ready`, `/status`, `/metrics`) cannot be overridden — `/agents/*` is clear; `db` is read-only.

**Decision:** no sibling Node/Hono fallback needed. Custom routes land in `apps/hollab-indexing/src/api/index.ts` (extend existing file, don't create a new one — matches actual layout, overrides sprint doc's `src/api/agents.ts` path hint).

### Minor doc corrections implied by findings

-   WS2 critical files: `apps/hollab-indexing/src/api/agents.ts` → use `apps/hollab-indexing/src/api/index.ts` (extend existing Hono app). Creating a new file is fine if it re-exports into the main app, but simplest is to add the handlers inline.
-   WS2 demo action: **CreateRole confirmed** as the demo proposal type (Open Question #3 resolved — Policy encoders don't exist yet in the SDK).

### Day 1 progress log

**Shipped (code typechecks clean on `apps/hola-modern` and `apps/hollab-indexing`):**

-   `useHashRouter` extended with `{ page: "public"; orgId }` variant parsing `#/o/:orgId` (`apps/hola-modern/src/hooks/useHashRouter.ts`).
-   New hook `usePublicOrgFromIndexer` — single-org fetch via `indexing-client.getOrganization` (no RPC) (`apps/hola-modern/src/hooks/usePublicOrgFromIndexer.ts`).
-   New `PublicOrgView.tsx` — wallet-less render of mission (anchor purpose), ENS subname, member list, circle list, role count. No wagmi imports, no `useAccount`. All reads through indexing-client hooks.
-   `App.tsx` dispatches `route.page === "public"` **before** the auth gate, inside a minimal shell (no Topbar, no `WalletAuthControl`, no `ChainSwitcher`). No connect chrome leaks onto the public tree.
-   New `packages/agent-sdk/docs/agent-manifest-v1.md` — v1 schema with rationale, discovery endpoint shape, known limitations, forward-compat rules.
-   Stub runtime routes `GET /agents/:orgId.json` and `GET /agents/index.json` added to `apps/hollab-indexing/src/api/index.ts` — return the correct v1 shape with `_stub` markers. Day 2 fills in the DB queries.

**Not shipped Day 1 (deferred to Day 2 per cadence):**

-   Proposals list + adopted timeline on `PublicOrgView` (WS1 Day 2).
-   Read-only extraction of `StructureView` — existing `OrganizationChart.tsx` already reads from `useWorkspaceSnapshot`, which is authed-session state. A clean read-only variant that takes `{ circles, roles, members }` props is still pending and was not needed for the Day 1 minimal render (list-based). Will extract on Day 2 before adding circle-tree visuals to `PublicOrgView`.
-   Seed script for demo orgs. The existing `DeployLocal.s.sol` deploys infra only, not orgs. A `SeedDemoOrgs.s.sol` that uses the `OrganizationFactory` to mint 2 orgs with anchor circles + sample roles + 1 open proposal each is Day 1's remaining task — spec'd but not yet written. This is the only hard prerequisite for actually exercising `PublicOrgView` end-to-end against a running `./scripts/dev-local.sh`.
-   Running the dev loop and documenting gotchas — held until the seed script lands so the full flow can be smoke-tested in one pass.

**Open Questions resolved:**

-   **Q3 (demo action):** CreateRole. Locked by SDK audit — the only structural op with a working encoder.

**Open Questions still open:**

-   **Q1 (`PublicShell` vs flag):** went with inline minimal shell in `App.tsx` (smallest diff, no new component). If Day 3 WS3 adds `#/explore` + `#/o/:orgId/p/:proposalId`, revisit and promote to a shared `PublicShell` component then.
-   **Q2 (ContentRef → text):** not audited yet. Deferred to Day 2 proposals work.

---

## Day-by-day cadence

### Day 1 — foundations + unblock

-   [ ] **Dev loop runs:** `./scripts/dev-local.sh` brings up anvil + indexer + frontend; document any gotchas inline in this file.
-   [ ] **Seed demo data:** script deploys factory + creates at least 2 demo orgs on anvil with circles, roles, and 1+ open proposal each. Capture their orgIds.
-   [ ] WS1: `useHashRouter` extended with `public` variant; `#/o/:orgId` routes to stub `PublicOrgView`
-   [ ] WS1: `PublicOrgView` renders mission + circles + members from indexer — no wallet dependency
-   [ ] WS1: read-only structure subcomponent extracted from `StructureView`
-   [ ] **WS2: `agent-sdk` status audit complete, posted in this doc or a linked note**
-   [ ] **WS2: audit Ponder custom-route capability** (check `apps/hollab-indexing` for existing API routes / `ponder.config.ts`; confirm how to add a custom HTTP endpoint)
-   [ ] WS2: `agent.json` schema v1 documented in `packages/agent-sdk/docs/agent-manifest-v1.md`
-   [ ] WS2: runtime route `GET /agents/:orgId.json` scaffolded in indexer (returns stub JSON with correct shape)

### Day 2 — agent loop closes

-   [ ] WS1: proposals list + adopted timeline on `PublicOrgView`
-   [ ] WS1: Topbar + app shell refuse to render connect button on public routes
-   [ ] WS2: runtime manifest route queries indexer DB and returns full JSON per org; `/agents/index.json` returns the org list
-   [ ] WS2: `propose-tension.ts` example runs end-to-end against local anvil, reading the manifest from the runtime endpoint
-   [ ] WS2: agent allowlist config + `🤖 agent` chip rendering in `PublicOrgView`
-   [ ] WS2: `packages/agent-sdk/README.md` quickstart updated

### Day 3 — flywheel

-   [ ] WS3: `#/explore` route + `ExploreView`
-   [ ] WS3: `#/o/:orgId/p/:proposalId` + `PublicProposalView`
-   [ ] WS3: base OG tags in `index.html`
-   [ ] WS3: "Join community" progressive connect CTA on `PublicOrgView`
-   [ ] **End-to-end smoke test:** fresh anvil → seed orgs → run agent example → open `#/explore` in incognito → click org → click proposal → copy permalink → open in second incognito → all renders without connect
-   [ ] (Stretch) static per-org OG PNG if time permits

---

## Success Metrics (demo criteria, local)

-   ✅ Zero wallet-connect prompts in the entire unauthenticated browsing path (`#/explore` → `#/o/:orgId` → `#/o/:orgId/p/:proposalId`)
-   ✅ Agent example submits a proposal that appears on public view tagged with `🤖 agent` in < 30s from script invocation
-   ✅ `agent.json` is valid, versioned, and served at a stable URL
-   ✅ Time-to-first-meaningful-action on public org page < 15s for a stranger (informal — one person outside the team times it)
-   ✅ Fresh `git clone` → `pnpm install` → `./scripts/dev-local.sh` → seed script → open `#/explore` → all of the above works from a clean machine

## Risks & Tradeoffs

| Risk                                                                      | Mitigation                                                                                                                                                                                                   |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `agent-sdk` is more broken than expected; Day 2 example doesn't run       | Day 1 audit surfaces this. If severe, WS2 becomes "ship a minimal script using raw viem + contracts bindings, wrap in SDK later."                                                                            |
| Ponder's custom-route support is limited or undocumented                  | Fallback: tiny sibling Node/Hono server in `apps/hollab-indexing` (or a new `apps/agent-api`) that reads from the same Ponder DB. Still runtime, still local, slightly more infra. Decide Day 1 after audit. |
| Local indexer lag between tx and indexer read creates flaky acceptance    | Poll with short timeout in examples; document expected latency                                                                                                                                               |
| Read-only `StructureView` extraction touches authed paths and breaks them | Keep authed view as wrapper; refactor in small commits; run existing e2e tests                                                                                                                               |
| Public routes still leak wallet chrome via shared shell components        | Introduce a `PublicShell` that doesn't import wallet context; enforce via lint/review                                                                                                                        |
| Agent allowlist feels hacky                                               | Accept for MVP; comment in code pointing to v1.1 attestation followup                                                                                                                                        |

## Open Questions (non-blocking — make a call and document)

1. **`PublicShell` vs. flag-on-existing-shell** — a separate shell component is cleaner but more work. Implementer decides; document choice in PR.
2. **Proposal "tension" text source** — proposals use ContentRef. For local MVP, is there an existing path to resolve ContentRef → text, or do we stub? Audit in Day 1, document.
3. **Which demo agent action is most legible** — "CreateRole" proposal is concrete; "add a policy" is simpler. Pick the one that's least broken in current contracts.

## Out of Scope — Record of Cuts (do not re-enter)

-   Aztec privacy integration (v2)
-   eth.limo / wildcard subdomain routing (v1.1)
-   Testnet / mainnet deployment
-   0G storage for new paths (reuse existing or stub)
-   Farcaster frames
-   Per-proposal dynamic OG images
-   Verifiable agent identity / attestations (v1.1)
-   Treasury UX
-   Any wallet-connect in public browsing paths
-   New governance semantics
