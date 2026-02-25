FROM oven/bun:1.2 AS deps-base

# -- deps (Bun for fast install) --
FROM deps-base AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/dashboard/package.json apps/dashboard/
COPY apps/api/package.json apps/api/
COPY apps/docs/package.json apps/docs/
COPY apps/nanobot/package.json apps/nanobot/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/ui/package.json packages/ui/
COPY packages/utils/package.json packages/utils/
COPY packages/supabase/package.json packages/supabase/
COPY packages/db/package.json packages/db/
COPY packages/cache/package.json packages/cache/
COPY packages/categories/package.json packages/categories/
COPY packages/documents/package.json packages/documents/
COPY packages/email/package.json packages/email/
COPY packages/encryption/package.json packages/encryption/
COPY packages/import/package.json packages/import/
COPY packages/inbox/package.json packages/inbox/
COPY packages/invoice/package.json packages/invoice/
COPY packages/jobs/package.json packages/jobs/
COPY packages/location/package.json packages/location/
COPY packages/logger/package.json packages/logger/
COPY packages/notifications/package.json packages/notifications/
COPY packages/app-store/package.json packages/app-store/
RUN bun install --frozen-lockfile

# -- builder (Node.js for full Next.js compatibility) --
FROM node:22-slim AS builder

# System deps for canvas/sharp native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libgif7 \
    librsvg2-2 libpixman-1-0 libexpat1 libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remove standalone output to avoid Next.js 16 middleware nft.json bug
# (next start with full node_modules is used instead)
RUN sed -i '/output: "standalone"/d' apps/dashboard/next.config.ts

# Build args become NEXT_PUBLIC_ env vars at build time
ARG NEXT_PUBLIC_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_ID

ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_ID=$NEXT_PUBLIC_SUPABASE_ID

# Next.js telemetry + memory optimization
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN cd apps/dashboard && npx next build

# -- runner --
FROM node:22-slim AS runner
WORKDIR /app

# Runtime native deps for canvas/sharp + curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libgif7 \
    librsvg2-2 libpixman-1-0 libexpat1 libvips42 curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN adduser --system --uid 1001 nextjs

# Node modules (needed for next start + serverExternalPackages)
COPY --from=deps --chown=nextjs:nextjs /app/node_modules ./node_modules

# Built dashboard output
COPY --from=builder --chown=nextjs:nextjs /app/apps/dashboard/.next ./apps/dashboard/.next

# Dashboard config and assets
COPY --from=builder --chown=nextjs:nextjs /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder --chown=nextjs:nextjs /app/apps/dashboard/next.config.ts ./apps/dashboard/next.config.ts
COPY --from=builder --chown=nextjs:nextjs /app/apps/dashboard/package.json ./apps/dashboard/package.json
COPY --from=builder --chown=nextjs:nextjs /app/apps/dashboard/image-loader.ts ./apps/dashboard/image-loader.ts

# Root package.json for monorepo resolution
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node_modules/.bin/next", "start", "apps/dashboard", "--hostname", "0.0.0.0", "--port", "3000"]
