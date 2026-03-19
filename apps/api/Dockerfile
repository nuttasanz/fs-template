# ─── Stage 1: base ────────────────────────────────────────────────────────────
# Shared base image with pnpm available.
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# ─── Stage 2: deps ────────────────────────────────────────────────────────────
# Install all monorepo dependencies.
# Copy manifests first so this layer is cached as long as deps don't change.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/schemas/package.json ./packages/schemas/
RUN pnpm install --frozen-lockfile

# ─── Stage 3: builder ─────────────────────────────────────────────────────────
# Build the shared schemas package then the API.
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/schemas/node_modules ./packages/schemas/node_modules
COPY . .
RUN pnpm --filter @repo/schemas build
RUN pnpm --filter @repo/api build

# ─── Stage 4: runner ──────────────────────────────────────────────────────────
# Lean production image — re-install deps (includes drizzle-kit for migrations)
# then copy only the compiled output and migration files.
FROM base AS runner
ENV NODE_ENV=production

# Re-install deps — NODE_ENV must be unset so pnpm includes devDependencies,
# which is required for drizzle-kit (used at startup for migrations).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/schemas/package.json ./packages/schemas/
RUN NODE_ENV= pnpm install --frozen-lockfile

# Compiled output
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/schemas/dist ./packages/schemas/dist

# Migration files and Drizzle config (needed by drizzle-kit at startup)
COPY apps/api/drizzle ./apps/api/drizzle
COPY apps/api/drizzle.config.ts ./apps/api/drizzle.config.ts

WORKDIR /app/apps/api
EXPOSE 3001

# Run pending migrations then start the compiled server
CMD ["sh", "-c", "pnpm db:migrate && node dist/main"]
