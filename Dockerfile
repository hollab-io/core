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

# ── hola-modern builder ───────────────────────────────────────────────────────
FROM node:24-alpine AS hola-modern-builder
WORKDIR /app
# Preserve monorepo structure so vite.config alias (../../packages/viem-extension) resolves
COPY apps/hola-modern/package.json ./apps/hola-modern/
WORKDIR /app/apps/hola-modern
RUN npm install
WORKDIR /app
COPY packages/viem-extension ./packages/viem-extension
COPY tsconfig*.json ./
COPY apps/hola-modern/src             ./apps/hola-modern/src
COPY apps/hola-modern/public          ./apps/hola-modern/public
COPY apps/hola-modern/index.html      ./apps/hola-modern/
COPY apps/hola-modern/vite.config.ts  ./apps/hola-modern/
COPY apps/hola-modern/tsconfig*.json  ./apps/hola-modern/
COPY apps/hola-modern/tailwind.config.js ./apps/hola-modern/
COPY apps/hola-modern/postcss.config.js  ./apps/hola-modern/
# Skip tsc (type-check only) — run vite directly
WORKDIR /app/apps/hola-modern
RUN npx vite build

# ── hola-modern ───────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS hola-modern
COPY --from=hola-modern-builder /app/apps/hola-modern/dist /usr/share/nginx/html
EXPOSE 80
