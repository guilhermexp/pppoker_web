FROM oven/bun:1.2 AS base

# System deps for native modules (canvas, sharp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ pkg-config \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libpixman-1-dev \
    && rm -rf /var/lib/apt/lists/*

# -- deps --
FROM base AS deps
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

# -- builder --
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

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

RUN cd apps/dashboard && NODE_ENV=production bun next build

# -- runner --
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN adduser --system --uid 1001 nextjs
RUN mkdir .next && chown nextjs:bun .next

COPY --from=builder --chown=nextjs:bun /app/apps/dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:bun /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=builder --chown=nextjs:bun /app/apps/dashboard/public ./apps/dashboard/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/dashboard/server.js"]
