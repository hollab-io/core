# 99 — Agent-native divergence from Holacracy v5.0

This document is the **single source of truth** for how this implementation
deliberately departs from the [Holacracy Constitution v5.0](https://www.holacracy.org/constitution/5-0/).
The other files in `specs/` remain a faithful transcription of the v5.0 text
and are **not edited** to reflect these changes — anyone reading `specs/00` through
`specs/07` is reading the Constitution, not our system.

This document is what you read to understand what we actually built. If a
discrepancy exists between `specs/` and the deployed contracts, the divergences
listed here explain it; anything else is a bug.

Attribution, as required by CC BY-SA 4.0: the original v5.0 text is © HolacracyOne,
LLC, licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
This document discloses the changes we made.

## Product framing

Holacracy v5.0 was designed around a human organization with human attention
windows: weekly tactical meetings, monthly governance meetings, role-fillers who
show up in person (or over video) to propose, object, and integrate. We're
building governance for organizations where autonomous agents and humans operate
continuously, not in cadences.

The core shape of the Constitution earns its keep for our use case:

-   **Structure** — roles, circles, domains, accountabilities, policies — cleanly
    describes scoped authority, which is exactly what agents need.
-   **Process** — proposal → objection → adopt/discard — is a high-value reversible
    lifecycle: someone can always interrupt a runaway change.
-   **Auditability** — every commitment is event-sourced on-chain.

What relaxes are the constitutional rules that quietly assume human cadence
— representation as authorization, 14-day windows, meeting-as-container, the
"a Partner is a person" definition. The four divergences below articulate each
in turn.

## Divergences

### 1. Representation Rule: attribution, not authorization

| v5.0 claim          | `specs/05-governance-process.md:103` — "Circle Members may only make Proposals or raise Objections representing Roles they fill as Role Lead or as Circle Rep."                                                                                                                                                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| This implementation | Any org member may create a proposal. `_proposerRoleId == 0` means "proposing as a member, no role claim"; `_proposerRoleId != 0` still requires the caller to lead that role (so attribution cannot be forged). The **objection** path remains strictly gated: only role-leads in the proposal's circle (or the circle's elected Facilitator / Secretary) may raise an objection.                                                                                     |
| Contract location   | `packages/contracts/src/contracts/MeetingFactory.sol` — `createProposal` (representation branch, zero-aware); `raiseObjection` unchanged.                                                                                                                                                                                                                                                                                                                              |
| Rationale           | An agent with cross-circle context should be able to surface a tension anywhere — the real guardrail on adoption is the objection path, not who was allowed to file the paperwork. Attribution integrity (who can claim which role) is preserved; authorization (who gets to speak at all) is not artificially restricted. The ProposalCreated event still emits `_proposerRoleId`, so indexers distinguish role-attributed from member-attributed proposals for free. |

### 2. Proposal age: per-org configurable, 7-day default

| v5.0 claim          | `specs/05-governance-process.md:512-514` — proposals have a maximum age of 14 days before `adoptProposal` reverts; `discardExpiredProposal` is permissionless after that window.                                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| This implementation | Per-org configurable window, settable by the org admin within `[MIN_PROPOSAL_MAX_AGE, MAX_PROPOSAL_MAX_AGE]` = `[1 hour, 30 days]`. Default at org creation is `DEFAULT_PROPOSAL_MAX_AGE = 7 days`.                                                                                                                                                  |
| Contract location   | `MeetingFactory.setProposalMaxAge` / `proposalMaxAge` / `ProposalMaxAgeUpdated` event / `MeetingFactory_InvalidProposalMaxAge` error.                                                                                                                                                                                                                |
| Rationale           | A 14-day window is a human-weekly-meeting cadence; an agent-operated circle can settle in minutes, a slow-policy circle may need weeks. The admin setter makes this reversible and per-org. 7 days is a conservative default — short enough to signal "this isn't Holacracy-strict," long enough that human review on a weekly schedule still works. |

### 3. Meetings: optional reporting wrappers, not process gates

| v5.0 claim          | `specs/05-governance-process.md:100-101` — "Any Circle Member MAY request the Proposer bring the Proposal to a meeting for real-time processing." `specs/02-rules-of-cooperation.md:125` — "Attending constitutionally-defined meetings takes priority over Next-Actions."                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| This implementation | Meetings (`startMeeting` / `endMeeting` on `MeetingFactory`) are **reporting wrappers**, not prerequisites. No governance write path — `createProposal`, `adoptProposal`, `raiseObjection`, `recordOutput`, ActionVoting creation — reads meeting state or requires an open meeting. Async operation is the default and always has been at the contract level; this document simply acknowledges it. |
| Contract location   | None. `startMeeting` / `endMeeting` already emit only — we did not change them, we changed how we describe them.                                                                                                                                                                                                                                                                                     |
| Rationale           | The spec text assumed a cadence the contract never enforced. Documenting this explicitly lets product + UI stop gating flows on a "convene the meeting first" step that was always optional. Orgs that want the weekly-meeting pattern can still use it as an audit-friendly container; orgs that don't, don't.                                                                                      |

### 4. Facilitator / Secretary: role-holders, not humans

| v5.0 claim          | `specs/01-organizational-structure.md:144-155` — Facilitator and Secretary are Roles "appointed by the Circle" (with the implicit Constitution-wide assumption that a "Partner" is a person, per `specs/00-overview.md:51` and `specs/01-organizational-structure.md:9`).                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| This implementation | Any principal — human or autonomous agent — may hold the Facilitator and Secretary roles. On-chain, these positions are bare `address`es; the contract never cared whether the holder was a natural person.                                                                                                              |
| Contract location   | None. `_circleFacilitators` / `_circleSecretaries` mappings and the election change types already accept any `address`.                                                                                                                                                                                                  |
| Rationale           | An agent that consistently dispatches objections, strikes invalid proposals, and maintains the record is a perfectly good Secretary; likewise for Facilitator. This divergence is documentary — the contract is already agent-agnostic — but naming it explicitly removes ambiguity for anyone building agent operators. |

## What does not change

-   The shape of the governance lifecycle: `createProposal` → optional `raiseObjection` / `resolveObjection` → `adoptProposal` or `discardProposal`.
-   The Representation Rule on the **objection path** — a role-lead in the proposal's circle, or the circle's elected Facilitator / Secretary, or nobody. This is the real veto and it stays strict.
-   Election lockouts: once a FacilitatorElection or SecretaryElection is adopted for a circle, the admin bootstrap setter is locked and further changes must go through governance.
-   The event-sourced audit trail: every step emits an event, and the indexer persists the trace.
-   The constitutional language in `specs/` — it remains verbatim as the reference for Holacracy v5.0.

## Audit & Attribution

Per CC BY-SA 4.0 § 3(a)(1)(B), we must indicate modifications of the Constitution
text. We do not modify the Constitution text in `specs/` — it is transcribed
verbatim. The modifications to the _system_ described by the Constitution are
the four divergences enumerated above.

Per the trademark notice in the repository `README.md`, this project must not be
marketed or represented as "Holacracy" — it is a system _derived from_ Holacracy
v5.0 and publicly discloses its departures here.
