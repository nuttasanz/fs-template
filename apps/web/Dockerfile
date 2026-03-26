# ─── Stage 1: base ────────────────────────────────────────────────────────────
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
# Build shared schemas then Next.js (which produces a standalone output).
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/schemas/node_modules ./packages/schemas/node_modules
COPY . .
RUN pnpm --filter @repo/schemas build
RUN pnpm --filter @repo/web build

# ─── Stage 4: runner ──────────────────────────────────────────────────────────
# The standalone output is a self-contained Node server — no node_modules needed.
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as non-root for security
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Standalone bundle (includes its own node_modules, trimmed by Next.js)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Static assets and public files must be copied separately
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Next.js standalone server entrypoint (path follows monorepo structure)
CMD ["node", "apps/web/server.js"]
