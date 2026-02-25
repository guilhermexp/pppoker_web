FROM oven/bun:1.2 AS base

# -- deps --
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/dashboard/package.json apps/dashboard/
COPY apps/docs/package.json apps/docs/
COPY apps/nanobot/package.json apps/nanobot/
COPY packages/tsconfig/package.json packages/tsconfig/
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
COPY packages/supabase/package.json packages/supabase/
COPY packages/ui/package.json packages/ui/
COPY packages/utils/package.json packages/utils/
COPY packages/app-store/package.json packages/app-store/
RUN bun install --frozen-lockfile

# -- runner --
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV TZ=UTC

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3101
ENV PORT=3101

CMD ["bun", "run", "apps/api/src/index.ts"]
