---
name: Test Infrastructure
description: Test framework and runner configuration across the monorepo
type: project
---

`apps/hola-modern` — Playwright E2E only (`test:e2e` script). No Vitest, no jsdom, no unit test runner configured. Cannot run unit tests here without adding Vitest as a new dep.

Packages with Vitest configured:

-   `packages/indexing-client` — `vitest.config.ts`, tests in `test/**/*.spec.ts`, node environment
-   `packages/viem-extension` — `vitest.config.ts`
-   `packages/hollab-sdk` — `vitest.config.ts`

`apps/hollab-indexing` — no test runner configured (Ponder app, integration-tested via dev loop).

**Why:** hola-modern is a pure Vite+React SPA; unit test infra was never added. Pure-function logic from hooks cannot be unit tested without either exporting the functions or adding Vitest to the app.
**How to apply:** When asked to write unit tests for hola-modern hooks, check if the pure function is exported first. If not, document the gap and skip — do not reshape source or add new test infra without explicit ask.
