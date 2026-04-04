FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

# ── indexing-deps: install hollab-indexing and its transitive npm deps ────────
FROM base AS indexing-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY apps/hollab-indexing/package.json  ./apps/hollab-indexing/
COPY packages/contracts/package.json      ./packages/contracts/
COPY packages/hollab-sdk/package.json     ./packages/hollab-sdk/
COPY packages/viem-extension/package.json ./packages/viem-extension/

RUN pnpm install --frozen-lockfile --filter hollab-indexing --ignore-scripts

# ── indexing-server ───────────────────────────────────────────────────────────
FROM base AS indexing-server
COPY --from=indexing-deps /app/node_modules ./node_modules
COPY --from=indexing-deps /app/apps/hollab-indexing/node_modules ./apps/hollab-indexing/node_modules

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

# ── hola-modern deps ─────────────────────────────────────────────────────────
# Use base (has corepack/pnpm) so workspace: protocol in package.json resolves
FROM base AS hola-modern-deps
# Workspace root manifests first — these rarely change, good for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# package.json for every workspace package hola-modern depends on
COPY apps/hola-modern/package.json          ./apps/hola-modern/
COPY packages/viem-extension/package.json   ./packages/viem-extension/
COPY packages/indexing-client/package.json  ./packages/indexing-client/
RUN pnpm install --frozen-lockfile --filter hola-modern --ignore-scripts

# ── hola-modern builder ───────────────────────────────────────────────────────
FROM base AS hola-modern-builder
WORKDIR /app
COPY --from=hola-modern-deps /app/node_modules                    ./node_modules
COPY --from=hola-modern-deps /app/apps/hola-modern/node_modules   ./apps/hola-modern/node_modules
# Workspace package sources (vite alias + pnpm symlinks both resolve from here)
COPY packages/viem-extension   ./packages/viem-extension
COPY packages/indexing-client  ./packages/indexing-client
# App source
COPY tsconfig*.json ./
COPY apps/hola-modern/src                ./apps/hola-modern/src
COPY apps/hola-modern/public             ./apps/hola-modern/public
COPY apps/hola-modern/index.html         ./apps/hola-modern/
COPY apps/hola-modern/vite.config.ts     ./apps/hola-modern/
COPY apps/hola-modern/tsconfig*.json     ./apps/hola-modern/
COPY apps/hola-modern/tailwind.config.js ./apps/hola-modern/
COPY apps/hola-modern/postcss.config.js  ./apps/hola-modern/
# VITE_ vars are inlined at build time — declare as ARG then promote to ENV
ARG VITE_DYNAMIC_ENVIRONMENT_ID
ARG VITE_INDEXER_URL
ENV VITE_DYNAMIC_ENVIRONMENT_ID=$VITE_DYNAMIC_ENVIRONMENT_ID
ENV VITE_INDEXER_URL=$VITE_INDEXER_URL
WORKDIR /app/apps/hola-modern
RUN pnpm exec vite build

# ── hola-modern ───────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS hola-modern
COPY --from=hola-modern-builder /app/apps/hola-modern/dist /usr/share/nginx/html
EXPOSE 80
