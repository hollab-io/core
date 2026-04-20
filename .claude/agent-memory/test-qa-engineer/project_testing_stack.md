---
name: Testing stack and conventions
description: Test frameworks, configs, and patterns used across the monorepo
type: project
---

Vitest for TS SDK / frontend unit tests; Playwright for E2E in hola-modern.

**Vitest (hola-modern):**

-   Config: `apps/hola-modern/vitest.config.ts` — `globals: true`, `environment: node`, `include: src/**/*.test.ts`
-   Import style: `import { describe, it, expect } from "vitest"` (globals also work without import since globals:true)
-   No mocking infrastructure needed for pure encoding tests — viem's `decodeAbiParameters` is the round-trip oracle

**Playwright E2E (hola-modern):**

-   Config: `apps/hola-modern/playwright.config.ts`
-   Global setup: `e2e/global-setup.ts` — starts Anvil on port 8545, runs `forge script DeployLocal.s.sol`, writes addresses to `e2e/.addresses.json`
-   Pattern: direct contract calls via viem `createWalletClient` / `createPublicClient`, NOT browser UI interaction
-   Accounts: `ANVIL_ACCOUNTS[0-3]` from `@wonderland/walletless` (FOUNDER, ALICE, BOB, CAROL)
-   `parseAbi([...])` for minimal ABI slices per describe block
-   `decodeEventLog` to extract event args from receipts
-   Each `test.describe` uses `test.beforeAll` to deploy/setup, then individual `test()` calls for assertions

**Key facts:**

-   `MeetingComponentsFactory.deploy` API changed to `(string _subname, address _orgFactory)` — existing tests in journey.spec.ts use the OLD 4-arg API; new tests must use the new 2-arg API with separate ABI const
-   Per-org `MeetingFactory` clone (governance process) is discovered by parsing `MeetingComponentsDeployed` event from the deploy receipt
-   `anchorCircleId` from `getOrganization()` is the target circle for creating roles via governance proposals
-   ChangeType values: CreateRole=0, AmendRole=1, RemoveRole=2, ..., ExpandRoleToCircle=12

**Why:** Learned while writing Journey 6 tests for governance proposal lifecycle + ExpandRoleToCircle.
**How to apply:** When adding more E2E tests, define fresh ABI consts if the existing shared ones use stale signatures. Always parse events from receipts to get IDs rather than predicting them.
