## Learned User Preferences

-   Prefer aggressive contract simplification, including removing standalone components and re-architecting when needed.
-   Prefer minimizing off-chain indexing dependence by adding practical on-chain read paths.
-   Prefer organization discovery via sequential on-chain IDs and bounded pagination/multicall patterns.
-   Prefer full end-to-end implementation runs across contracts and frontend when requesting rewrites.

## Learned Workspace Facts

-   This workspace is a pnpm monorepo with at least `apps` and `packages` projects.
-   Smart contracts are developed and tested with Foundry under `packages/contracts`.
-   The frontend app is under `apps/hola-modern`.
