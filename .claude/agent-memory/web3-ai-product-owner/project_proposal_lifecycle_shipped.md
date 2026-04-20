---
name: Proposal lifecycle shipped + next-bet PRDs
description: State of the feat/governance-proposal-lifecycle branch as of 2026-04-15 and where the two shaped PRDs live
type: project
---

Proposal lifecycle (createProposal / adoptProposal / discardProposal / raiseObjection / resolveObjection) is live end-to-end on `feat/governance-proposal-lifecycle`: contracts, Ponder indexer handlers, indexing-client + agent-sdk write methods, `PublicProposalView` permalink `#/o/:orgId/p/:proposalId`, and seeded demo data on the `lantern` org.

**Why:** Closed the Day-2 sprint gap where `openProposals` was always empty. Public permalinks now have real on-chain data; agents can drive the full lifecycle via `examples/propose-tension.ts`.

**How to apply:** Treat proposal/objection on-chain surface as done. Next bets are the three in `docs/sprint-agent-native-mvp.md` post-sprint section. Two have been shaped into PRDs:

-   **P0 — Public/private tensions** (refined from the original "readable tensions always-public"). Author picks visibility per tension at propose-time. Envelope `{ v, visibility, contentType, body }` stored off-chain under existing `tensionHash`; on-chain hash binds to the whole envelope so the visibility choice is tamper-evident. Zero contract changes. PRD: `docs/prds/public-private-tensions.md`.
-   **P1 — Objection from public permalink.** Progressive wallet-connect inline in the objections section of `PublicProposalView`, reusing the same envelope for concerns. Key product decision made: **org-member advisory gate on the frontend** (contract remains authoritative). Rejected alternatives: any-wallet (Sybil risk), token-holder (wrong model), strict circle-member (too much plumbing for MVP). PRD: `docs/prds/public-objection-flow.md`.
-   **P1 — Agent proposal firehose.** Still on roadmap, not yet shaped.

Both PRDs link from `docs/sprint-agent-native-mvp.md` post-sprint section. Both avoid contract changes and reuse `hollab-sdk` 0G/encryption primitives that were built for the v2 Aztec narrative but went unused on the write path.
