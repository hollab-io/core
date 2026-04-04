FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

# ── deps: install hollab-indexing and its transitive npm deps ─────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# pnpm needs every workspace member's package.json to resolve the lockfile
COPY apps/hollab-indexing/package.json  ./apps/hollab-indexing/
COPY packages/contracts/package.json      ./packages/contracts/
COPY packages/hollab-sdk/package.json     ./packages/hollab-sdk/
COPY packages/viem-extension/package.json ./packages/viem-extension/

RUN pnpm install --frozen-lockfile --filter hollab-indexing --ignore-scripts

# ── runner ────────────────────────────────────────────────────────────────────
FROM base AS runner
# Copy hoisted node_modules from the workspace root
COPY --from=deps /app/node_modules ./node_modules
# Copy app-level node_modules if pnpm placed any there
COPY --from=deps /app/apps/hollab-indexing/node_modules ./apps/hollab-indexing/node_modules

# Copy source
COPY apps/hollab-indexing/src     ./apps/hollab-indexing/src
COPY apps/hollab-indexing/abis    ./apps/hollab-indexing/abis
COPY apps/hollab-indexing/ponder.config.ts  ./apps/hollab-indexing/
COPY apps/hollab-indexing/ponder.schema.ts  ./apps/hollab-indexing/
COPY apps/hollab-indexing/package.json      ./apps/hollab-indexing/
COPY apps/hollab-indexing/tsconfig.json     ./apps/hollab-indexing/

WORKDIR /app/apps/hollab-indexing

EXPOSE 42069
HEALTHCHECK --interval=20s --timeout=5s --retries=5 \
    CMD wget -qO- http://localhost:42069/health || exit 1

CMD ["pnpm", "run", "start"]
