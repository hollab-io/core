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
# @hollab-io/contracts exports ./generated/index.ts — must be present at runtime
COPY packages/contracts/package.json    ./packages/contracts/
COPY packages/contracts/generated/      ./packages/contracts/generated/

WORKDIR /app/apps/hollab-indexing
EXPOSE 42069
HEALTHCHECK --interval=20s --timeout=5s --retries=5 \
    CMD wget -qO- http://localhost:42069/health || exit 1
CMD ["pnpm", "run", "start"]

# ── hola-modern prune ─────────────────────────────────────────────────────────
# turbo prune produces a minimal monorepo subtree with a pruned lockfile.
FROM base AS hola-modern-pruner
RUN npm install -g turbo@2
COPY . .
RUN turbo prune hola-modern --docker

# ── hola-modern deps ──────────────────────────────────────────────────────────
# Install only what hola-modern and its workspace deps need.
FROM base AS hola-modern-deps
COPY --from=hola-modern-pruner /app/out/json/ .
COPY --from=hola-modern-pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── hola-modern builder ───────────────────────────────────────────────────────
FROM base AS hola-modern-builder
WORKDIR /app
# Root virtual store + per-package node_modules (pnpm isolated mode)
COPY --from=hola-modern-deps /app/node_modules                              ./node_modules
COPY --from=hola-modern-deps /app/packages/viem-extension/node_modules      ./packages/viem-extension/node_modules
COPY --from=hola-modern-deps /app/packages/indexing-client/node_modules     ./packages/indexing-client/node_modules
COPY --from=hola-modern-deps /app/packages/contracts/node_modules           ./packages/contracts/node_modules
COPY --from=hola-modern-deps /app/apps/hola-modern/node_modules             ./apps/hola-modern/node_modules
COPY --from=hola-modern-pruner /app/out/full/ .
# Root tsconfig not included in turbo prune output; packages extend it
COPY tsconfig*.json ./
# VITE_ vars are inlined at build time — declare as ARG then promote to ENV
ARG VITE_DYNAMIC_ENVIRONMENT_ID
ARG VITE_INDEXER_URL
ENV VITE_DYNAMIC_ENVIRONMENT_ID=$VITE_DYNAMIC_ENVIRONMENT_ID
ENV VITE_INDEXER_URL=$VITE_INDEXER_URL
# Build workspace deps first (viem-extension, indexing-client), then hola-modern.
# NODE_OPTIONS caps the V8 heap so the builder doesn't OOM on low-memory hosts;
# Node will GC more aggressively rather than growing the heap indefinitely.
ENV NODE_OPTIONS=--max-old-space-size=1536
RUN node_modules/.bin/turbo run build --filter=hola-modern

# ── hola-modern ───────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS hola-modern
COPY --from=hola-modern-builder /app/apps/hola-modern/dist /usr/share/nginx/html
EXPOSE 80
