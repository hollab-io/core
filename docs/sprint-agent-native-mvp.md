> **Current state — 2026-04-15**
>
> -   Proposal lifecycle shipped end-to-end on-chain: `createProposal` → `raiseObjection` / `resolveObjection` → `adopt` / `discard`, indexed and wired through agent-sdk + frontend.
> -   Legacy `executeGovernance` path deleted; lifecycle primitives are the only route to adoption.
> -   Public proposal permalinks live at `#/o/:orgId/p/:proposalId` with an open-proposals panel per org.
> -   Two PRDs queued as next bets:
>     -   [`public-private-tensions.md`](./prds/public-private-tensions.md) — optional public/private content per tension
>     -   [`public-objection-flow.md`](./prds/public-objection-flow.md) — raise objections from the public permalink with progressive wallet connect
> -   Historical sprint log below is preserved unchanged for context.

---

# Sprint Plan — Agent-Native MVP

**Owner:** product
**Window:** 2–3 days
**Date opened:** 2026-04-13
**Status:** sprint complete; proposal-lifecycle follow-on landed on `feat/governance-proposal-lifecycle` (2026-04-15). See "Post-sprint: Proposal Lifecycle" section at the bottom.
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

-   [ ] WS1: proposals list + adopted timeline on `PublicOrgView` — **BLOCKED & REPLACED**, see Day 2 findings
-   [x] WS1: Topbar + app shell refuse to render connect button on public routes _(Day 1 — minimal inline shell in `App.tsx`)_
-   [x] WS2: runtime manifest route queries indexer DB and returns full JSON per org; `/agents/index.json` returns the org list
-   [x] WS2: `propose-tension.ts` example reads the manifest from the runtime endpoint and submits via `agent.governance.createRole` (live smoke test pending — needs the dev stack running)
-   [x] WS2: agent allowlist config + `🤖 agent` chip rendering in `PublicOrgView` (members and role leads)
-   [x] WS2: `packages/agent-sdk/README.md` quickstart added

### Day 2 progress log

**Shipped:**

-   `apps/hollab-indexing/src/api/index.ts` — `/agents/index.json` and `/agents/:orgId.json` now query the Ponder DB via Drizzle (`asc`/`eq` re-exported from `"ponder"`, no extra dep). The per-org route assembles `org`, `contracts`, `circles`, `roles`, `members` with stable ordering, plus `meetingFactory` and `actionVoting` joined from `meetingComponentSet`. BigInts serialized as decimal strings via a custom `JSON.stringify` replacer (Hono's `c.json` would have thrown otherwise).
-   `apps/hola-modern/src/config/agents.ts` — agent address allowlist with `isAgentAddress(addr)` helper. Defaults to anvil account #9 to match the `propose-tension.ts` default.
-   `PublicOrgView.tsx` — chip rendering on members **and** role leads when the address is in the allowlist; new "Roles" section with name/purpose/leads.
-   `packages/agent-sdk/examples/propose-tension.ts` — fetches manifest, builds `HollabAgent` against `viem/chains.foundry`, submits `createRole` through `MeetingFactory.executeGovernance`, polls `/agents/:orgId.json` for the new role, prints the SPA permalink. Default `AGENT_PRIVATE_KEY` is anvil account #9 (deterministic, not a secret).
-   `packages/agent-sdk/docs/agent-manifest-v1.md` — full v1 schema doc with rationale, decisions, forward-compat rules, and the known-limitations section.
-   `packages/agent-sdk/README.md` — 30-line quickstart driven off the discovery endpoint and the example script.

**Day 2 findings — open `proposals` table is unpopulated:**

The Ponder schema in `apps/hollab-indexing/ponder.schema.ts` defines a `proposal` table (lines 99–112) with `tension`, `proposer`, `status`, `submittedAt`, etc. — **but no contract currently emits the events that populate it**. `MeetingFactory.executeGovernance` applies role/policy changes directly to `RoleRegistry` and never goes through a tension/proposal lifecycle. Only `MeetingProposalLinked` is emitted from `MeetingFactory`, and that's a meeting↔proposal join, not a proposal creation event.

Implications:

1. **WS1 "proposals list + adopted timeline" is blocked at the contract layer.** Replaced for Day 2 with a **Roles list** on `PublicOrgView` — same purpose (show concrete agent-readable artifacts) using data that actually exists.
2. **The agent example creates a role, not a proposal.** Filename kept (`propose-tension.ts`) to match the sprint spec; the script's header documents the gap and notes that adopting `GovernanceProcess` proposal events later is a one-line change at the call site.
3. **Manifest `openProposals: []` always.** Documented in `agent-manifest-v1.md` "Known v1 limitations". When the contract starts emitting proposal events, the manifest populates without a version bump (additive only).

**Open Question Q2 (ContentRef → text) — resolved by being moot:** since proposals don't exist on-chain yet, there's nothing to resolve. Revisit when the proposal lifecycle ships.

**Live smoke test status:** all three packages typecheck and lint clean and the existing 11 unit tests still pass (4 `agent-sdk` encoding + 7 `useHashRouter`). Running `propose-tension.ts` against a live anvil stack is the next thing to do once `./scripts/dev-local.sh` is up — held until the seed-orgs script lands so a fresh-clone smoke test exercises the whole flow in one pass.

### Day 3 — flywheel (revised after Day 2 finding)

The Day 2 finding (no proposal lifecycle on-chain) propagates into Day 3: a `PublicProposalView` would render against an empty `proposal` table. Pivoting to **role permalinks** as the atomic deep-linkable governance object — same flywheel mechanics (every link pulls a cold viewer in), against data that actually exists today.

-   [x] WS3: `#/explore` route + `ExploreView` — directory uses `indexing-client.listOrganizations` (not `/agents/index.json`) so it stays wallet-less/RPC-less and can mount above the auth gate. Cards show ENS subname label, name, member/circle/role counts. Sorted by `updatedAt` desc. Click → `#/o/:orgId`.
-   [x] WS3: **`#/o/:orgId/r/:roleId` + `PublicRoleView`** _(replaces `/p/:proposalId`)_ — permalink renders name, purpose, domains, accountabilities, leads (🤖 chip when applicable), with back-link to org. When the proposal lifecycle ships, add `/p/:proposalId` alongside without removing this.
-   [x] WS3: extend `useHashRouter` with `explore` and `publicRole` route variants + unit tests for both (13 passing)
-   [x] WS3: base OG tags in `apps/hola-modern/index.html` (og:type, og:site_name, og:title, og:description, og:url, twitter:card/title/description)
-   [x] WS3: "Join community" progressive CTA on `PublicOrgView` — navigates to `#/join/:orgId`, which falls through the auth gate to `Welcome` where the existing `WalletAuthControl`/RainbowKit mount lives. Keeps the public tree zero-wagmi.
-   [x] WS3: `usePublicRoleFromIndexer` hook — `GET_ROLE` already uses `String!` (confirmed in `packages/indexing-client/src/queries.ts:86`), no Day 1-style BigInt episode.
-   [x] WS3: unit coverage for `useHashRouter` explore + publicRole parse/stringify (including url-encoded role ids and malformed fallback)
-   [ ] **End-to-end smoke test:** fresh anvil → seed orgs → run agent example → open `#/explore` in incognito → click org → click role → copy permalink → open in second incognito → all renders without connect, agent role shows 🤖 chip
-   [ ] (Stretch) static per-org OG PNG if time permits

**Out of Day 3 scope (carried over):**

-   ~~`#/o/:orgId/p/:proposalId` proposal permalink~~ **shipped post-Day-3 on `feat/governance-proposal-lifecycle`.** `MeetingFactory` now exposes a full `createProposal` / `adoptProposal` / `discardProposal` / `raiseObjection` / `resolveObjection` surface (5 events), the indexer persists the `proposal` and `objection` tables with new `tensionHash` / `changeType` / `changeData` / `concernHash` columns, the `PublicProposalView` renders all three terminal states with the objection trail, and `SeedDemoOrgs.s.sol` seeds one proposal in each status (Adopted / Draft+objection / Discarded) on the `lantern` demo org so the permalink has data to render against from a clean anvil. The proposal lifecycle is the **only** path to structural change — `executeGovernance` was deleted entirely since nothing is deployed yet. Design stance documented in `specs/05-governance-process.md` "On-chain Commitments Surface".
-   ~~`SeedDemoOrgs.s.sol`~~ **shipped Day 3.** `packages/contracts/script/SeedDemoOrgs.s.sol` creates two wired demo orgs (`paperclip`, `solarpunk`) on top of `DeployLocal`. Each org gets its meeting components deployed via `MeetingComponentsFactory`, the agent address added as a member, three/two roles created via `MeetingFactory.executeGovernance(CreateRole, …)` on `circleId=0` (the anchor), and `paperclip`'s first role elects the agent as lead (Election change type) so the permalink renders with a 🤖 chip end-to-end. Reads infra addresses from `deployments/31337-local.json` (written by `DeployLocal`) and appends `deployments/31337-seed.json` with the resulting orgIds. Verified end-to-end against a local anvil (`ONCHAIN EXECUTION COMPLETE & SUCCESSFUL`) — paperclip=orgId 2, solarpunk=orgId 3 on a fresh DeployLocal stack.

---

## Success Metrics (demo criteria, local)

-   ✅ Zero wallet-connect prompts in the entire unauthenticated browsing path (`#/explore` → `#/o/:orgId` → `#/o/:orgId/r/:roleId`)
-   ✅ Agent example submits a structural change (currently `CreateRole` — see Day 2 finding) that appears on public view tagged with `🤖 agent` in < 30s from script invocation
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

---

## Post-sprint: Proposal Lifecycle (2026-04-15)

**Branch:** `feat/governance-proposal-lifecycle` (on top of the Day-3 sprint close).

### What shipped

The Day-2 finding ("no proposal lifecycle on-chain, manifest `openProposals: []` always") is resolved. The proposal lifecycle is now the **only** path to structural change — `executeGovernance` was deleted outright since nothing is deployed yet (see `38ea727`).

1. **Contracts (`MeetingFactory`)** — full `createProposal` / `adoptProposal` / `discardProposal` / `raiseObjection` / `resolveObjection` surface with 5 events. New fields: `tensionHash`, `changeType`, `changeData`, `concernHash`. No backward-compat shim.
2. **Indexer** — `proposal` + `objection` lifecycle handlers; manifest route now populates `openProposals` from real data.
3. **indexing-client + agent-sdk** — typed queries and write methods for proposals and objections; `examples/propose-tension.ts` drives the full lifecycle (not just `createRole`).
4. **Frontend** — `PublicProposalView` + public permalink `#/o/:orgId/p/:proposalId` with open-proposals panel on `PublicOrgView`. Renders Adopted / Draft+objection / Discarded terminal states with the objection trail.
5. **Seed script** — `SeedDemoOrgs.s.sol` seeds one proposal in each terminal status on the renamed `lantern` demo org so the permalink has data from a clean anvil.
6. **Specs** — `specs/05-governance-process.md` gained an "On-chain Commitments Surface" section documenting the design stance.

### Product state after this work

-   Every core agent-native primitive promised by the MVP now has **real on-chain data** flowing through it end-to-end: org → circle → role → **proposal → objection**.
-   Agents can now write the lifecycle, not just one structural op. The "tension" in `propose-tension.ts` is finally a tension.
-   Public surfaces (`#/explore`, `#/o/:orgId`, `#/o/:orgId/r/:roleId`, `#/o/:orgId/p/:proposalId`) are all wallet-less and all backed by indexed data.

### What is still intentionally missing (do not re-enter without a call)

-   **ContentRef → text resolution.** Proposals carry `tensionHash` but the public view does not yet resolve it to human-readable content. The IPFS private-data path exists in `hollab-sdk` (and the frontend `useIpfsStorage` hook) but is not wired into `PublicProposalView`. This is the next highest-leverage gap (see "Next bets" below).
-   **Objection integration flow.** `raiseObjection` + `resolveObjection` exist on-chain; there is no UX for a facilitator-style integration loop. Only terminal states render well.
-   **Agent-authored proposal discovery for humans.** The `🤖` chip is rendered, but there is no "agents proposing in this org right now" surface — which is the clearest paperclip-ish hook we have.
-   **Meeting lifecycle on-chain.** Proposals exist outside meetings currently; the `GovernanceMeeting` surface is still the pre-lifecycle shape. Not blocking.
-   **Testnet / ENS wildcard / per-proposal OG.** Same cuts as the sprint body. Still out.

### Next bets (PO view, ordered)

1. **Readable tensions (P0).** Wire `tensionHash` to off-chain content so a stranger opening `#/o/:orgId/p/:proposalId` sees the actual tension text, not a hash. Smallest increment: unencrypted JSON blob under `tensionHash` in the existing storage path; encryption/private-data can come later. Without this, the permalink is agent-legible but not human-legible — the share loop breaks.
2. **Agent proposal firehose (P1).** `#/agents` or an "Agent Activity" rail on `#/explore` showing recent agent-authored proposals across all orgs. Pure composability play — turns `agent-sdk` from a dev tool into a public behavior viewers can watch. Matches paperclip's "public-by-default, browsable" posture.
3. **Objection-raising UX (P1).** The cheapest way to prove the lifecycle is real is to let a second wallet raise an objection from the public permalink. Progressive wallet connect on `PublicProposalView` → sign `raiseObjection`. Exercises the full adversarial path, not just the happy one.

Deferred: agent attestations/identity (still allowlist), ContentRef encryption (kept for v2 privacy narrative), meeting-scoped proposals, treasury UX.

### PRDs (2026-04-15)

Bets 1 and 3 above have been shaped into product specs. Bet 1 was refined — visibility is **per-tension, author's choice** (public default, private via `hollab-sdk` encryption), not always-public.

-   [docs/prds/public-private-tensions.md](./prds/public-private-tensions.md) — envelope-based public/private tension bodies under the existing `tensionHash`, zero contract changes.
-   [docs/prds/public-objection-flow.md](./prds/public-objection-flow.md) — progressive wallet-connect + `raiseObjection` from `PublicProposalView`, reusing the same envelope for concerns. Key product decision: **org-member advisory gate** (contract remains authoritative).

Bet 2 (agent proposal firehose) is still on the roadmap but not yet shaped.

---

## Storage substrate migration: 0G → IPFS (2026-06-09)

The off-chain storage backend referenced throughout the earlier (dated) sections — "0G storage", "the 0G upload", "the 0G path" — has been **replaced by IPFS**. Those historical references are left intact as a record of what the sprint decided at the time; this note supersedes them for current state.

-   **Frontend** now uploads encrypted blobs through the indexer pin-proxy (`POST /storage/pin`) and reads them back from `VITE_IPFS_GATEWAY`. The hook is `apps/hola-modern/src/hooks/useIpfsStorage.ts` (replaces the deleted `useZgStorage.ts`); `useEncryptedStorage` and the OKR/role-content hooks now thread a `bytes32` `contentHash` (sha2-256 multihash digest of a CIDv0) instead of a 0G `rootHash`.
-   **Indexer** exposes the pin-proxy: Pinata when `PINATA_JWT` is set, otherwise a local filesystem mock under `LOCAL_IPFS_DIR` (`.ponder/local-ipfs`) with a `GET /ipfs/:cid` gateway for dev.
-   **0G fully removed (2026-06-10).** Storage moved to IPFS (above); the 0G _chain_ target was then dropped too (the 0G relationship ended) — the repo now targets Sepolia + Mainnet only.
-   `specs/07` has been neutralized to a provider-neutral verifiable-compute layer + ERC-8004 agent identity (was 0G Compute + ERC-7857 INFTs); it remains v2/descoped.
