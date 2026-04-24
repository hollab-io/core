# hollab.eth

> **WARNING: UNAUDITED SOFTWARE**
>
> The smart contracts in this repository have **not been audited**. They are provided as-is, with no guarantees of correctness or security. **Use at your own risk.** The authors accept no liability for any loss or damage arising from the use of this software.

Minimalistic on-chain Holacracy framework. Only what needs to live on a public ledger goes on-chain — organizational structure, authority boundaries, and governance outcomes. Everything else stays off-chain.

## How It Works

### 1. Create an organization

Sign in, state your mission. That's it — you have an org with an anchor circle on-chain. Name is optional; you can decide it together later.

### 2. Invite members

Bring in the people who will do the work. Each member gets a wallet-linked identity in the org.

### 3. Governance huddle — define how you work

Run a governance meeting to shape the org's structure. Members propose roles through Integrative Decision-Making (IDM) — present a tension, clarify, react, test objections, adopt. In this first huddle you might:

-   Create roles: _Lead Dev_, _Designer_, _Community Lead_
-   Elect a Facilitator and Secretary
-   Create a **Community circle** — an open circle where token holders (future supporters, users, collaborators) can participate in the org's governance

### 4. Tactical huddle — align on what to do first

Run a tactical meeting to triage and commit to first actions. This isn't governance (no structural changes) — it's the team getting aligned. Projects and next-actions come out of it:

-   Create a website
-   Set up visitor tracking
-   Set goal: 100 unique weekly visitors (OKR)
-   Decide on the organization's name

### 5. Community joins

An external collaborator buys the governance token and joins the Community circle. They now have:

-   Visibility into the org's structure, roles, and decisions (all on-chain)
-   A structured channel to propose ideas — same tension-driven process, not a Discord free-for-all
-   Voting power on proposals that affect the community

### 6. Community and org govern together

The community member proposes: _"Add a capybara to the landing page."_ The proposal goes through IDM in the Community circle. If the org has `daoVoteRequired` enabled, the org's internal circles and the community token holders both vote. The capybara gets its day in court.

---

This is the full loop: **create** an org, **structure** it through governance, **align** through tactical meetings, **grow** a community, and **govern together** — all on the same framework.

## Status (What Works Today)

-   **Proposal lifecycle end-to-end on-chain** — `createProposal` → `raiseObjection` / `resolveObjection` → `adopt` / `discard`, indexed and queryable. `executeGovernance` has been removed; the lifecycle primitives are the only path.
-   **Readable tensions on-chain** — `createProposalWithTension(...)` publishes plaintext via a `ProposalTensionPublished` event; the on-chain `tensionHash` is derived (`keccak256`) so the content address stays canonical. Long or sensitive content can still commit only a hash and resolve via IPFS / 0G / encrypted backends.
-   **Agent-native governance** — attribution-only proposer model (propose as a member or as a role you lead), per-org `MAX_PROPOSAL_AGE` (default 7 days, bounds [1 hour, 30 days]), and async proposal queues instead of mandatory synchronous meetings. See [`specs/99`](./specs/99-agent-native-divergence.md).
-   **ERC-8004 agent identity** — members can bind an agent NFT to their org identity via `OrganizationInstance.linkAgentIdentity(...)`; ownership is verified on-chain, enabling an agent-native surface on top of the same governance primitives.
-   **Officer bootstrap + election lock** — admins can set a circle's Facilitator / Secretary to any address (human or autonomous agent) pre-election; `isFacilitatorElected` / `isSecretaryElected` flip once a corresponding election adopts, after which the bootstrap setters are locked and governance owns the role.
-   **Public proposal permalinks** — every proposal is reachable at `#/o/:orgId/p/:proposalId`, with an open-proposals panel on each org page and a proposal-queue-health dashboard (`{open, expiring < 2d, expired}`) for members.
-   **Agent SDK lifecycle methods** — `@hollab-io/agent-sdk` exposes proposal read/write helpers (propose tension, raise/resolve objection, adopt/discard) backed by the indexing client.
-   **Seeded demo org** — `lantern` is seeded on local/dev with circles, roles, and live proposals for exercising the flow.

## Roadmap / Next

See `docs/sprint-agent-native-mvp.md` for the current sprint, and `docs/prds/` for in-flight PRDs — notably:

-   [`public-private-tensions.md`](./docs/prds/public-private-tensions.md) — optional public/private content per tension
-   [`public-objection-flow.md`](./docs/prds/public-objection-flow.md) — raise objections directly from the public permalink with progressive wallet connect

## Why On-Chain

Organizations need a credible, tamper-proof record of _who has authority to do what_. Today that lives in wikis, Notion pages, and people's heads — easy to dispute, hard to audit, impossible to compose with other systems.

Holacracy already defines a rigorous structure for this: roles with explicit purposes, domains, and accountabilities, organized into circles, governed through a structured process. What it lacks is a substrate that makes that structure **verifiable** and **programmable**.

A public ledger gives you both:

-   **Verifiable** — Role assignments, circle boundaries, and governance decisions are immutable records. No one can quietly change who has authority over what.
-   **Programmable** — Other contracts and systems can read the org structure directly. Treasury access, protocol permissions, and integrations can be gated by on-chain role assignments rather than multisig memberships.

### What Goes On-Chain vs Off-Chain

The design principle is simple: **on-chain for commitments, off-chain for coordination**.

| On-chain (must be verifiable/permanent)                                | Off-chain (coordination, long-form, private)                   |
| ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| Org structure (circles, roles, memberships)                            | Meeting facilitation flow (check-ins, reactions, discussion)   |
| Role definitions (purpose, domains, accountabilities)                  | Long-form proposal explanations, deliberation threads          |
| Short tension text (via `createProposalWithTension` event, ≤280 chars) | Private/encrypted proposal bodies (addressed by `tensionHash`) |
| Governance outcomes (proposal adopted/rejected)                        | Objection deliberation and integration                         |
| Elected role assignments (Facilitator, Secretary)                      | Nomination discussions, candidate reasoning                    |
| Authority boundaries (who can act on what)                             | Tactical meeting triage and project updates                    |

Meeting coordination events (IDM steps, agenda items, nominations) are emitted as **events only** — the indexer reconstructs the full meeting state, but the chain only stores what matters: who ended up in which role, and which governance changes were adopted.

Proposals may include a short plaintext tension inline — published via the `ProposalTensionPublished` event log — or a **ContentRef** hash pointing to off-chain encrypted content (IPFS / 0G). The ledger proves _that_ a proposal with specific content was adopted: short tensions stay readable without any off-chain retrieval, longer or private content stays addressable but off-chain.

## Architecture

`OrganizationFactory` is a thin directory — it mints a per-org `OrganizationInstance` clone and indexes `(orgId, subname) → instance`. All per-org state lives on the instance:

```
OrganizationFactory (singleton directory)
  │   createOrganization → (orgId, instance)
  ▼
OrganizationInstance (ERC-1167 per-org, one-stop address)
  │
  │  Per-org state
  ├── members, admins, join requests, ERC-8004 agent identity links
  ├── component wiring (meetingFactory, accessManager, token)
  │
  │  Holacracy framework (ERC-1167 clones, referenced by the instance)
  ├── CircleRegistry       — Circles, roles, memberships, elected positions
  ├── RoleRegistry         — Role definitions (name, purpose, domains, accountabilities)
  ├── GovernanceProcess    — Proposal lifecycle: createProposal → raiseObjection / resolveObjection → adopt / discard
  ├── GovernanceMeeting    — Meeting outcomes (proposal adoption, election results)
  │
  │  DAO layer (token holders are org members)
  ├── GovToken (ERC20Votes) — Governance token with delegation
  ├── HolGovernor           — OZ Governor for token-holder votes
  ├── TimelockController    — Delay between vote approval and execution
  ├── CircleTreasury        — Per-circle spending with timelock
  └── ENS Subname           — orgname.hollab.eth → AccessManager address
```

### Holacracy Framework

The core of the system — minimalistic contracts that store organizational structure and governance outcomes.

| Contract              | What it stores                                                                                                                                                                                                               | Why on-chain                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CircleRegistry**    | Circle hierarchy, role-to-circle assignments, circle leads, elected roles (Facilitator, Secretary, Circle Rep)                                                                                                               | This is the org's authority graph — who can act in which capacity. Other systems need to read it trustlessly.                                        |
| **RoleRegistry**      | Role name, purpose, domains, accountabilities                                                                                                                                                                                | Defines the boundaries of distributed authority. A role's domains determine what its lead can control without asking permission.                     |
| **GovernanceProcess** | Proposal lifecycle (`createProposal` / `createProposalWithTension` → `raiseObjection` / `resolveObjection` → `adopt` / `discard`), objection records, adoption/rejection outcomes, per-org `proposalMaxAge` freshness window | The permanent record that a governance change was legitimately adopted through the constitutional process.                                           |
| **GovernanceMeeting** | Meeting existence, participant authorization, adopted proposals, election results                                                                                                                                            | Proves that outcomes came from a properly convened meeting with authorized participants. Coordination (IDM steps, agenda management) is events-only. |

Proposals encode structural changes, executed atomically on adoption:

-   **CreateRole / AmendRole / RemoveRole** — Add, modify, or remove roles within a circle
-   **CreatePolicy / AmendPolicy / RemovePolicy** — Circle-level policies governing domains
-   **Elections** — Facilitator, Secretary, Circle Rep (via meeting election process)

### DAO Layer

Every organization has token holders — they are a subset of the org's members. The DAO layer gives them a voice in governance. How much of a voice is configurable:

-   **Escalation** — Any circle member can escalate a proposal to a token-holder vote at any time. The DAO acts as an appeals court for contentious decisions.
-   **Vote gate** — Organizations can require token-holder approval before governance changes take effect (`daoVoteRequired` flag). The meeting IDM still happens first — circles decide _what_ to propose, the community decides _whether_ it passes.
-   **Neither** — Token holders exist, the governor is deployed, but governance runs through circles with direct adoption. The DAO infrastructure is there when the org needs it.

The DAO layer also provides the org's on-chain identity (ENS subname), treasury management, and a framework for structured community participation — resource requests, transparency into the org's structure and decisions, and a clear channel between the organization and its broader stakeholders.

### How It Compares to Existing DAOs

ENS, Aave, and Lido all started with token voting as the primary governance mechanism, then had to bolt on delegation structures after the fact — ENS Working Groups, Aave service providers, Lido's ~15 committee multisigs. They learned that token voting alone doesn't produce good decisions, and informal forum deliberation doesn't scale.

HolLab inverts this: start with structured roles and deliberation (Holacracy), add token voting as an optional oversight layer. The deliberation quality comes from the process, not from hoping enough informed people show up to vote.

|                        | **Typical DAO**                                   | **HolLab**                                             |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| **Starting point**     | Token vote, then figure out delegation            | Structured roles and circles, then add token oversight |
| **Deliberation**       | Forum threads, Snapshot signals                   | Formal IDM: tension → clarify → react → object         |
| **Expertise**          | Whoever holds tokens                              | Roles with explicit domains and accountabilities       |
| **Speed**              | Every change needs a vote (or delegated multisig) | Direct adoption by default, vote gate when needed      |
| **On-chain footprint** | Entire governance lifecycle                       | Only structure and outcomes                            |

## Specifications

The `specs/` directory is a faithful transcription of the [Holacracy Constitution v5.0](https://www.holacracy.org/constitution/5-0/) into an implementation-oriented spec suite. This project is **Holacracy-shaped, not Holacracy-strict** — four deliberate departures adapt the model for continuous, async, human-and-agent operation. See [99 — Agent-native divergence](./specs/99-agent-native-divergence.md) for the canonical list of what we changed and why.

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
| [99 — Agent-native divergence](./specs/99-agent-native-divergence.md)     | Where this implementation departs from v5.0, and why     |

## Development

### Prerequisites

-   [Foundry](https://book.getfoundry.sh/getting-started/installation)
-   [pnpm](https://pnpm.io/)
-   Node.js 24

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
  dao-contracts/     — DAO layer contract extensions
  hollab-sdk/        — TypeScript SDK for interacting with deployed contracts
  agent-sdk/         — SDK for agents to integrate with hollab.eth governance
  indexing-client/   — Typed client for the Ponder indexer
  viem-extension/    — Viem client extensions
apps/                — Frontend applications
  hollab-indexing/   — Ponder indexer ingesting contract events
specs/               — Holacracy Constitution → smart contract specifications
```

## License & Attribution

### Project Code

See the repository root [LICENSE](./LICENSE) file.

### Holacracy Constitution

The structural model (roles, circles, domains, accountabilities, policies), governance process (proposals, objections, consent-based adoption), and auditability (on-chain commitments with event-sourced history) are derived from the **Holacracy Constitution v5.0** by HolacracyOne, LLC. Four deliberate departures adapt it for continuous, async, human-and-agent operation — see [`specs/99-agent-native-divergence.md`](./specs/99-agent-native-divergence.md) for the full list.

-   **License:** [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)
-   **Original source:** [holacracy.org/constitution](https://www.holacracy.org/constitution/5-0/) and [GitHub](https://github.com/holacracyone/Holacracy-Constitution)
-   **Copyright:** HolacracyOne, LLC

Under CC BY-SA 4.0, you are free to share and adapt the material for any purpose (including commercial), provided you give appropriate credit, indicate changes, and share alike.

### Trademark Notice

This project is derived from, but is **not**, Holacracy®. "Holacracy" is a registered trademark of HolacracyOne, LLC. This implementation deliberately diverges from the v5.0 Constitution (see [`specs/99-agent-native-divergence.md`](./specs/99-agent-native-divergence.md)) and must not be marketed or represented as Holacracy. The Constitution text in `specs/` is used under the CC BY-SA 4.0 license; the divergence document indicates the changes as that license requires.
