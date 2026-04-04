# HolLab

On-chain Holacracy governance with DAO token-holder oversight. Organizations run structured decision-making internally, with an optional community vote gate before changes take effect.

## The Problem

DAOs today face a fundamental tension between speed and legitimacy:

-   **Token voting alone** (ENS, Aave, Lido) gives every token holder equal say regardless of context or expertise. Proposals are shaped by informal forum discussions, and quality control depends on social norms. Whales with no domain knowledge outweigh active contributors.
-   **Multisig committees** (common in Lido's ~15 committees, ENS Working Groups) move fast but concentrate trust in a small group. The broader community has no structured way to participate in _how_ decisions are made, only whether to fund them.
-   **No DAO has a formal deliberation layer.** The gap between "someone posts a proposal" and "token holders vote" is filled by forum threads, Discord debates, and Snapshot signaling — all informal, unstructured, and easy to game.

## What We Build

HolLab puts a **structured deliberation process** (Holacracy's Integrative Decision-Making) before the DAO vote. Circle members with domain expertise shape proposals through a formal process — clarifying questions, reaction rounds, objection testing — before the broader community weighs in.

### Two Governance Paths

```
                         ┌─────────────────────────────┐
                         │  Circle identifies Tension   │
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────▼──────────────┐
                         │  Governance Meeting (IDM)    │
                         │  Present → Clarify → React   │
                         │  → Amend → Objection Round   │
                         └──────────────┬──────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
         daoVoteRequired = false                 daoVoteRequired = true
                    │                                       │
         ┌──────────▼──────────┐                 ┌──────────▼──────────┐
         │   Direct Adoption   │                 │   DAO Governor Vote │
         │   Change executes   │                 │   Token holders     │
         │   immediately       │                 │   approve/reject    │
         └─────────────────────┘                 └──────────┬──────────┘
                                                            │
                                                 ┌──────────▼──────────┐
                                                 │   Timelock Delay    │
                                                 │   Then executes     │
                                                 └─────────────────────┘
```

**Direct path** — Circle members run IDM, facilitator adopts, change executes immediately. Fast iteration for orgs that trust their internal process.

**DAO-gated path** — Same IDM process, but the approved proposal is escalated to a token-holder vote (OZ Governor + TimelockController) before execution. The community gets a binding vote on what the circle decided.

**Manual escalation** — Any circle member can escalate an active proposal to a DAO vote at any time, regardless of the `daoVoteRequired` flag. This is the safety valve for contentious decisions.

The gate is **per-organization** — some orgs want full community oversight, others want pure Holacracy speed. Set once at deployment via `OrganizationFactory`.

### How It Compares

|                           | **ENS**                 | **Aave v3**             | **Lido**                                | **HolLab**                                       |
| ------------------------- | ----------------------- | ----------------------- | --------------------------------------- | ------------------------------------------------ |
| **Who shapes proposals**  | Anyone with 100K tokens | Anyone with 80K+ tokens | Forum discussion                        | Circle members via formal IDM                    |
| **Deliberation quality**  | Informal forum          | Informal forum          | Informal forum + Snapshot signal        | Structured: tension → clarify → react → object   |
| **Expertise integration** | Social norms            | Service providers       | ~15 delegated committees                | Roles with explicit domains and accountabilities |
| **Vote required**         | Always (executable)     | Always                  | Always (or Easy Track)                  | Configurable per-org                             |
| **Routine operations**    | Working group budgets   | Full governance         | Easy Track (optimistic, 72h)            | Direct adoption when gate is off                 |
| **Governor framework**    | OZ Governor             | Custom (BGD Labs)       | Aragon                                  | OZ Governor                                      |
| **Timelock**              | 2 days                  | 1-10 days (multi-chain) | 3-45 days (dynamic via Dual Governance) | Configurable                                     |

**Key insight**: ENS, Aave, and Lido all had to bolt on delegation mechanisms _after_ launching pure token governance — ENS Working Groups, Aave service providers, Lido's committee multisigs. HolLab starts with structured delegation (circles and roles) and adds token voting as an oversight layer, not the other way around.

## Architecture

Each organization deployed through `OrganizationFactory` gets its own set of cloned contracts:

```
OrganizationFactory
  │
  ├── CircleRegistry (clone)     — Circles, roles, memberships, elected positions
  ├── RoleRegistry (clone)       — Role definitions (name, purpose, domains, accountabilities)
  ├── GovernanceProcess (clone)  — Async proposal lifecycle (Draft → Active → Adopted)
  ├── GovernanceMeeting (clone)  — Meeting-based IDM (schedule → start → IDM → adopt/escalate)
  ├── HolGovernor               — OZ Governor for DAO token votes
  ├── GovToken (ERC20Votes)     — Governance token with delegation
  ├── TimelockController        — Delay between vote approval and execution
  ├── CircleTreasury            — Per-circle spending with timelock
  └── ENS Subname               — orgname.hollab.eth → governor address
```

### Contract Overview

| Contract                | Purpose                                                                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CircleRegistry**      | Manages the org tree: circles, sub-circles, role assignments, elected roles (Facilitator, Secretary, Circle Rep), circle leads. The source of truth for "who can do what".                                 |
| **RoleRegistry**        | CRUD for role definitions — name, purpose, domains, accountabilities. Owned by CircleRegistry.                                                                                                             |
| **GovernanceProcess**   | The async proposal state machine. Proposals go Draft → Active → Integrating (if objections) → Adopted/Escalated/Discarded. Handles objection testing, facilitator actions, and proposal execution.         |
| **GovernanceMeeting**   | Thin executor for synchronous governance meetings (Holacracy Constitution Section 5.4). On-chain: authorization + outcomes. Coordination (check-ins, agenda, IDM steps) emitted as events for the indexer. |
| **HolGovernor**         | OpenZeppelin Governor with configurable voting delay, period, quorum, and proposal threshold. Used for DAO-gated proposals and manual escalations.                                                         |
| **TimelockController**  | Standard OZ timelock. Sits between the governor and GovernanceProcess — after a vote passes, the timelock delay must elapse before the governance change executes.                                         |
| **CircleTreasury**      | Per-circle treasury with its own timelock. Circle leads can propose spending; timelock enforces delay.                                                                                                     |
| **OrganizationFactory** | Deploys all of the above as a single transaction. Clones holacracy contracts (ERC-1167), deploys the governance suite, registers an ENS subname.                                                           |

### Governance Change Types

Proposals can encode any of these changes, executed atomically on adoption:

-   **CreateRole / AmendRole / RemoveRole** — Add, modify, or remove roles within a circle
-   **CreatePolicy / AmendPolicy / RemovePolicy** — Circle-level policies (domains, constraints)
-   **Elections** — Facilitator, Secretary, Circle Rep (via meeting election process)
-   All variants support **ContentRefs** for off-chain encrypted data (private proposals with on-chain hashes)

## Specifications

The `specs/` directory contains the full specification suite derived from the [Holacracy Constitution v5.0](https://www.holacracy.org/constitution/5-0/):

| Spec                                                                      | Title                                                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------- |
| [00 — Overview](./specs/00-overview.md)                                   | Architecture overview, actors, and lifecycle             |
| [01 — Organizational Structure](./specs/01-organizational-structure.md)   | Roles, Circles, Circle Leads                             |
| [02 — Rules of Cooperation](./specs/02-rules-of-cooperation.md)           | Transparency, Processing, Prioritization duties          |
| [03 — Tactical Meetings](./specs/03-tactical-meetings.md)                 | Tactical Meeting process and outputs                     |
| [04 — Distributed Authority](./specs/04-distributed-authority.md)         | Domains, spending, interpretation, Individual Initiative |
| [05 — Governance Process](./specs/05-governance-process.md)               | Proposals, Objections, Elections, Process Breakdown      |
| [06 — Glossary](./specs/06-glossary.md)                                   | All defined terms and enum types                         |
| [07 — Private Data & AI Agents](./specs/07-private-data-and-ai-agents.md) | Private Data Layer & AI Agent Integration                |

## Development

### Prerequisites

-   [Foundry](https://book.getfoundry.sh/getting-started/installation)
-   [pnpm](https://pnpm.io/)
-   Node.js 18+

### Setup

```bash
pnpm install
```

### Build & Test

```bash
# Build all packages
pnpm build

# Run contract tests
cd packages/contracts
forge test

# Run with verbosity
forge test -vvv

# Coverage
forge test --coverage
```

### Project Structure

```
packages/
  contracts/         — Solidity contracts, tests, deploy scripts (Foundry)
  dao-contracts/     — DAO-specific contract extensions
  hollab-sdk/        — TypeScript SDK for interacting with deployed contracts
  viem-extension/    — Viem client extensions
apps/                — Frontend applications
specs/               — Holacracy Constitution → smart contract specifications
```

## License & Attribution

### Project Code

See the repository root [LICENSE](./LICENSE) file.

### Holacracy Constitution

The specification documents in `specs/` are derived from the **Holacracy Constitution v5.0** by HolacracyOne, LLC.

-   **License:** [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)
-   **Original source:** [holacracy.org/constitution](https://www.holacracy.org/constitution/5-0/) and [GitHub](https://github.com/holacracyone/Holacracy-Constitution)
-   **Copyright:** HolacracyOne, LLC

Under CC BY-SA 4.0, you are free to share and adapt the material for any purpose (including commercial), provided you give appropriate credit, indicate changes, and share alike.

### Trademark Notice

**Holacracy** is a registered trademark of HolacracyOne, LLC. This project references Holacracy for attribution purposes as required by the CC BY-SA 4.0 license. If the governance rules implemented here diverge from the official Constitution, the resulting system should not be marketed or represented as "Holacracy" without explicit permission from HolacracyOne, LLC.
