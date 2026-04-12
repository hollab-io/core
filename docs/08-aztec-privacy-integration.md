# Aztec Privacy Integration Spec

Researched 2026-04-09. Covers what privacy Aztec Network can add to the existing EVM-based holacracy governance system.

## Motivation

Current architecture leaks voter identity, proposal authorship, role assignments, membership lists, and token balances on-chain. Aztec's private execution + ZK proofs can hide these while keeping aggregate results (tallies, adopted proposals) public.

## Core Privacy Ideas

### 1. Private Signer

Aztec private functions hide `msg.sender`. `enqueue_incognito()` hides sender even in private-to-public calls. No voter/proposer/objector address ever published.

### 2. Private Data as Input to Public Output

ZK proofs validate private state (token balance, circle membership, role ownership) and only emit the public result (tally increment, proposal queued, action authorized).

## Privacy Wins by Feature

| Current Feature           | Privacy Leak Today                          | Aztec Improvement                                                                                             |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Vote casting**          | Voter address + weight + direction on-chain | `SingleUseClaim` + private `cast_vote` — only tally changes publicly. Voter identity hidden behind nullifier. |
| **Proposal submission**   | Proposer address visible                    | Private function submits proposal — public queue gets the proposal text, not the proposer identity            |
| **Objections**            | Objector identity on-chain                  | Private objection — only "valid objection exists" becomes public                                              |
| **Role assignments**      | Circle leads visible on-chain               | `PrivateMutable` notes for role holders — prove role in ZK without revealing address                          |
| **Membership**            | `OrgMember` events + addresses public       | Private membership notes — prove membership via nullifier, address stays hidden                               |
| **Join requests**         | Requester address + message on-chain        | Private join request note visible only to org admins                                                          |
| **GovToken balance**      | ERC20Votes balance is public                | `BalanceSet` (private UTXO notes) — balance hidden, voting weight proven in ZK                                |
| **Meeting participation** | `convenedBy` address visible                | Private meeting initiation — only the meeting record appears publicly                                         |

## Aztec Primitives Mapping

| Primitive                             | What It Does                                              | hollab.eth Use                                              |
| ------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| `SingleUseClaim`                      | One-time action right per owner per slot, nullifier-based | One-person-one-vote, one-time role acceptance               |
| `PrivateSet<UintNote>` / `BalanceSet` | Private token balances (UTXO notes)                       | GovToken private balances + voting weight proofs            |
| `PrivateMutable`                      | Per-owner mutable private state                           | Role assignments (facilitator, secretary, circle rep)       |
| `PrivateImmutable`                    | Per-owner immutable private state                         | Permanent membership credentials                            |
| `SinglePrivateMutable`                | Global hidden value                                       | Hidden admin identity, hidden treasury balance              |
| `DelayedPublicMutable`                | Public value with time-lock                               | Role changes with safety delay (mirrors governance cadence) |
| `PublicMutable`                       | Transparent state                                         | Vote tallies, proposal status, election metadata            |
| `enqueue_incognito()`                 | Hide msg_sender in private-to-public calls                | Any private action that triggers public state change        |
| AuthWit                               | Delegated private authorization                           | Governance contract acting on behalf of members             |

## Existing Aztec Examples to Build From

-   **`private_voting_contract`** — almost exactly ActionVoting but private. 1-person-1-vote, private ballot, public tally.
-   **`private_token_contract`** — governance token with fully private balances + transfers.
-   **`token_bridge_contract`** — L1-to-Aztec bridge for connecting Sepolia contracts to Aztec privacy layer.
-   **`token_blacklist_contract`** — `DelayedPublicMutable` for role management with time delay.

## Architecture Options

### A. Hybrid (recommended, phased)

Keep current EVM contracts for structural governance (circles, roles, policies). Add Aztec contracts for:

-   Private voting (replace ActionVoting)
-   Private membership proofs
-   Private token balances (shield GovToken into Aztec)

Bridge between L1 and Aztec using token bridge pattern. Ship incrementally.

### B. Full Aztec (ambitious)

Rewrite governance layer in Noir. Circles, roles, policies become private notes. Only aggregate results published publicly. Maximum privacy but full rewrite required.

## Known Limitations

-   **Timing correlation**: even with private signers, if only one person votes in a narrow window, observers can correlate. Mitigation: batching/delay.
-   **Weighted private voting**: the example does 1-person-1-vote. Token-weighted private votes need custom ZK logic (range proofs on balance notes).
-   **Public effects leak ordering**: incrementing a tally immediately after a private call can leak info. Mitigation: batched reveals.
-   **Role state trade-off**: truly private roles require custom note-based designs; the standard Aztec pattern (`DelayedPublicMutable`) keeps roles public.
