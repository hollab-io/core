---
name: QA Conventions for Day 1 Agent-Native MVP
description: Acceptance constraints and testing conventions specific to the public org surface sprint
type: project
---

WS1 acceptance hard constraint (sprint-agent-native-mvp.md, line 66): PublicOrgView and any component it renders must import zero wagmi, useAccount, useConnect, useWalletClient, RainbowKit, ConnectButton, or WalletAuthControl. useChain is allowed only to read chainConfig.orgFactoryAddress (no wallet state).

`parseHash` and `routeToHash` in `apps/hola-modern/src/hooks/useHashRouter.ts` are NOT exported — they are private module-level functions. Unit tests for these require either exporting them (reshaping source) or spinning up Vitest in hola-modern. Neither should be done without explicit ask.

Prettier fix applied 2026-04-13: import order in PublicOrgView.tsx was wrong (useChain was after hooks in the original; Prettier auto-sorted). This was a blocking Prettier failure that was fixed during QA.

Hono route ordering in hollab-indexing/src/api/index.ts: `/agents/index.json` is registered BEFORE `/agents/:orgId.json` (lines 23 and 32). This is correct — Hono matches static segments before params when registered first.

Reserved Ponder routes that cannot be overridden: /health, /ready, /status, /metrics, /sql, /graphql. The /agents/\* path is clear of all of these.
