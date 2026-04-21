---
name: Testing infrastructure overview
description: Vitest/Playwright setup, config locations, test patterns across the monorepo
type: project
---

Vitest v2.1.9 is hoisted at workspace root. No @testing-library/react or jsdom anywhere in the workspace — component testing requires Playwright only.

Per-package Vitest configs:

-   `apps/hola-modern/vitest.config.ts` — node env, `include: ["src/**/*.test.ts"]`
-   `apps/hollab-indexing/vitest.config.ts` — node env, `include: ["test/**/*.spec.ts"]` (added 2026-04-13)
-   `packages/indexing-client` — `test/**/*.spec.ts`, has `@` alias to `src/`
-   `packages/agent-sdk` — `test/**/*.test.ts` (no separate vitest.config — uses `vitest run --passWithNoTests`)
-   `packages/viem-extension` — `test/**/*.spec.ts`

Playwright config (`apps/hola-modern/playwright.config.ts`):

-   Requires live Anvil + deployed contracts (global-setup.ts boots anvil and runs forge script)
-   baseURL is anvil RPC (not the Vite dev server) — NOT suitable for offline testing
-   Tests in `apps/hola-modern/e2e/`

**Why:** Ponder virtual modules (`ponder:api`, `ponder:schema`) only exist at Ponder runtime — to test hollab-indexing logic, extract pure functions that take plain row objects (see `src/api/manifest.ts` pattern). Do NOT import from `ponder:api` in test files. The hollab-indexing vitest.config has no aliases for Ponder virtual modules, so `src/api/index.ts` (Hono routes) cannot be tested without invasive config changes — skip route tests.

`hono/testing` is available at `hono@4.12.10` (in workspace pnpm store), but mocking `db` and `schema` from `ponder:api`/`ponder:schema` is not viable without vitest alias config changes. Defer route tests until a test helper or mock module is established.

**BigInt regression pattern:** `organization.id` and `orgId` FK columns in Ponder schema are BigInt — GraphQL variables must be `BigInt!` not `String!`. This regressed twice (commits 10824bb, sprint WS2 Day 3). A string-assertion test in `packages/indexing-client/test/queries.spec.ts` guards the four known BigInt params: `GET_ORGANIZATION.$id`, `LIST_ROLES_BY_ORG.$orgId`, `LIST_CIRCLES_BY_ORG.$orgId`, `LIST_MEETING_COMPONENTS_BY_ORG.$orgId`.

**How to apply:** When asked to test hollab-indexing handlers, always extract pure assembly functions first. Component tests for hola-modern require Playwright (offline option is not viable without installing @testing-library). When adding new queries that filter by `organization.id` or any `orgId` FK, add an assertion to `queries.spec.ts`.
