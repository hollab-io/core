# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

pnpm + turborepo monorepo. Node 24, pnpm only (`preinstall` blocks npm/yarn).

-   `packages/contracts` — Solidity contracts (Foundry), deploy scripts, wagmi-generated TS bindings in `generated/`. Exports `@hollab-io/contracts/actions`.
-   `packages/dao-contracts` — DAO layer contract extensions (ERC20Votes governor, timelock, treasury).
-   `packages/hollab-sdk` (`@hollab-io/hollab-sdk`) — Private data layer SDK: key management, encrypted 0G storage, event indexer. `tsc` build.
-   `packages/agent-sdk` (`@hollab-io/agent-sdk`) — SDK for agents to integrate with hollab.eth governance. `tsup` build. Depends on `contracts` + `indexing-client`.
-   `packages/indexing-client` — Typed client for the Ponder indexer. `tsup` build.
-   `packages/viem-extension` — Viem client extensions.
-   `apps/hola-modern` — Main React 19 + Vite + Tailwind frontend. Uses wagmi/RainbowKit, TanStack Query, Playwright for E2E. Builds to SPA (copies `dist/index.html` → `dist/404.html` for IPFS/eth.limo hash routing).
-   `apps/hollab-indexing` — Ponder indexer (`ponder.config.ts`, `ponder.schema.ts`) that ingests events from the deployed factory/meeting contracts.
-   `apps/docs`, `apps/sample-app`, `packages/sample-lib` — scaffolding/boilerplate remnants.
-   `specs/` — Holacracy Constitution v5.0 → smart contract spec suite. Source of truth for contract behavior; read these before reasoning about governance semantics.

## Common Commands

Root (all turbo-driven, fan out across workspaces):

```bash
pnpm install
pnpm build             # turbo run build (respects ^build deps)
pnpm dev               # turbo run dev (persistent, no cache)
pnpm test              # all package tests
pnpm check-types
pnpm lint / lint:fix
pnpm format / format:fix
./scripts/dev-local.sh # pnpm dev:local — local chain + indexer + frontend
```

Contracts (`packages/contracts`, Foundry):

```bash
forge build
forge test -vvv
forge coverage
pnpm generate                       # wagmi generate → generated/ TS bindings
pnpm deploy:infra:sepolia           # DeployInfrastructure.s.sol (also :mainnet, :0g-testnet, :0g-mainnet, :local)
pnpm deploy:org:sepolia             # CreateOrganization.s.sol
```

Deployment artifacts land in `packages/contracts/deployments/<chainId>-infrastructure.json` and are consumed by the frontend via `apps/hola-modern/src/config/chains.ts`. RPC endpoints are wired in `foundry.toml` under `[rpc_endpoints]`; set `ETH_MAINNET_RPC_URL` / `ETH_SEPOLIA_RPC_URL` / `ETHERSCAN_API_KEY` in env.

Frontend (`apps/hola-modern`):

```bash
pnpm dev                         # Vite
pnpm build                       # tsc -b && vite build (+ 404.html copy for eth.limo)
pnpm --filter hola-modern test:e2e
pnpm --filter hola-modern exec playwright test path/to/file.spec.ts   # single test
```

Indexer (`apps/hollab-indexing`, Ponder):

```bash
pnpm --filter hollab-indexing dev      # ponder dev
pnpm --filter hollab-indexing codegen
pnpm --filter hollab-indexing start
```

TS SDK packages use Vitest:

```bash
pnpm --filter @hollab-io/hollab-sdk test
pnpm --filter @hollab-io/agent-sdk test -- path/to/file.test.ts   # single file
```

## Architecture — Big Picture

Read `README.md` and `specs/00-overview.md` for the full model. The essentials:

**On-chain = commitments, off-chain = coordination.** Contracts store org structure and governance outcomes; meeting flow (IDM steps, proposal content, discussion) lives off-chain, emitted as events-only or pointed at via `ContentRef` hashes.

**Per-org contract set, cloned via ERC-1167 from `OrganizationFactory`:**

`OrganizationFactory` constructor takes four params: `(roleRegistryImpl, orgInstanceImpl, ensRegistrar, meetingComponentsFactory)`. The factory is a thin directory — `createOrganization` returns `(orgId, instance)`, emits `OrganizationCreated(orgId, subname, creator, instance, roleRegistry)`, and stores `(id → instance)` + `(subname → instance)` indices. No per-org state lives on the factory.

-   `OrganizationInstance` — per-org one-stop address. Holds members/admins/join requests/agent identity links, stores component wiring (`roleRegistry`, `meetingFactory`, `token`, `accessManager`), and is the caller that gates `RoleRegistry.setGovernanceProcess` (via `setRoleRegistryGovernanceProcess`). `IOrganizationInstance` is the shared interface used by `MeetingFactory`, `MeetingComponentsFactory`, and `ActionVoting`.
-   `CircleRegistry` — circle hierarchy, role-to-circle assignments, elected positions (Facilitator, Secretary, Circle Rep)
-   `RoleRegistry` — role definitions (purpose, domains, accountabilities). `setGovernanceProcess` is gated to the instance (which delegates authority to `MeetingComponentsFactory.deploy`). Emits `GovernanceProcessSet` when wired.
-   `GovernanceProcess` — proposal lifecycle: `createProposal` → `raiseObjection` (opens an objection sub-lifecycle closed by `resolveObjection`) → `adopt` / `discard`. `adoptProposal` enforces zero open objections and reverts on expired proposals (`MAX_PROPOSAL_AGE` = 14 days). `discardExpiredProposal` is permissionless. This is the only path; `executeGovernance` no longer exists.
-   `GovernanceMeeting` — meeting outcomes (adopted proposals, election results)
-   DAO layer: `GovToken` (ERC20Votes) + `HolGovernor` + `TimelockController` + `CircleTreasury` + ENS subname `<org>.hollab.eth`

Proposals encode structural ops (CreateRole / AmendRole / RemoveRole, CreatePolicy / AmendPolicy / RemovePolicy, Elections) executed atomically on adoption. Election change type uses 3-param encoding `(roleId, newLead, previousLead)`. The DAO layer is optional oversight — per-org flags like `daoVoteRequired` decide whether token-holder approval is required before governance changes take effect.

**Facilitator role:** `resolveObjection` requires the original objector (withdrawal) or the circle facilitator (dismissal per Holacracy §5.3.3-5.3.4). `setCircleFacilitator(circleId, facilitator)` is admin-gated for now.

**ERC-8004 agent identity:** Members call `OrganizationInstance.linkAgentIdentity(agentRegistry, agentId)` to link an agent NFT they own to their org identity. Emits `AgentIdentityLinked(account, agentRegistry, agentId)`. This enables the agent-native surface described in the agent-sdk.

**Admin safety:** `OrganizationInstance.removeAdmin` prevents removing the last admin via `adminCount` tracking (reverts with `OrganizationInstance_LastAdmin`). `MeetingComponentsFactory.deploy()` requires org admin (`isOrgAdmin` on the instance). `MeetingFactory` / `ActionVoting` both store `orgId` at init and hold an `IOrganizationInstance org` reference for admin checks instead of the factory + `orgId` pair.

**Data flow:**

```
contracts (Foundry)
  └─ wagmi generate → packages/contracts/generated/
       └─ consumed by hola-modern, agent-sdk, scripts

on-chain events
  └─ apps/hollab-indexing (Ponder)
       └─ GraphQL/HTTP API
            └─ packages/indexing-client
                 └─ hola-modern hooks (useCirclesFromIndexer, useOrgMembersFromIndexer, …)
                 └─ agent-sdk
```

Frontend reads go through `useQuery` hooks wrapping the indexing-client; writes go through `useMutation` wrapping wagmi/viem calls. Multi-chain config (Sepolia default, Mainnet, 0G) lives in `apps/hola-modern/src/config/chains.ts`.

**Private data layer** (`packages/hollab-sdk`): ContentRef hashes on-chain point to encrypted blobs stored on 0G. SDK handles key management and encrypted storage so proposal content / meeting transcripts stay off-chain but verifiably committed.

## Conventions

-   **Package names:** external `@hollab-io/<name>`, internal workspace deps via `workspace:*`.
-   **TanStack Query is mandatory in the frontend** — all reads via `useQuery`, all writes via `useMutation`. No raw `useEffect` + `useState` async fetching.
-   **Solidity:** `forge fmt` + solhint (`pnpm lint:sol-logic` / `lint:sol-tests`). solc 0.8.28, via-IR, Cancun. `bytecode_hash='none'` for deterministic bytecode across environments.
-   **Specs are authoritative.** When contract behavior is ambiguous, the `specs/` files (derived from Holacracy Constitution v5.0) decide. Don't invent governance semantics.
-   **IPFS deployment:** `hola-modern` is built as a static SPA deployed to IPFS and served via eth.limo at `hollab.eth`. Hash routing only — no server-side routes. The `dist/index.html` → `dist/404.html` copy is load-bearing for client-side routing fallback.
-   **⚠️ Contracts are unaudited.** Do not treat this codebase as production-safe.
