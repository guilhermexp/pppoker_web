# Codebase Structure

**Analysis Date:** 2026-01-16

## Directory Layout

```
Mid/
├── apps/
│   ├── api/              # Backend Hono + tRPC API (port 8080)
│   ├── dashboard/        # Frontend Next.js (port 9000)
│   └── docs/             # Documentation (Mintlify)
├── packages/
│   ├── db/               # Database schema, ORM, queries
│   ├── ui/               # Shared React components (73 components)
│   ├── supabase/         # Auth & real-time client
│   ├── email/            # React Email templates
│   ├── jobs/             # Trigger.dev background jobs
│   ├── utils/            # Utilities (tax, fiscal year, format)
│   ├── categories/       # Transaction categories
│   ├── documents/        # Document processing (PDF, Office)
│   ├── invoice/          # Invoice generation
│   ├── inbox/            # Email inbox management
│   ├── notifications/    # Notification system
│   ├── encryption/       # Data encryption
│   ├── cache/            # Redis caching layer
│   ├── app-store/        # App marketplace (Slack, QuickBooks, etc)
│   ├── import/           # Data import utilities
│   ├── location/         # Geolocation services
│   ├── logger/           # Pino logging
│   └── tsconfig/         # Shared TypeScript configs
├── docker-compose.yml    # Local development (Redis)
├── turbo.json           # Build pipeline config
├── biome.json           # Linting rules
└── package.json         # Workspace root
```

## Directory Purposes

**apps/api/**
- Purpose: Backend API server
- Contains: tRPC routers, REST routes, schemas, services, middleware
- Key files:
  - `src/index.ts` - Server entry point (Hono app, port 8080)
  - `src/trpc/routers/_app.ts` - Router composition
  - `src/trpc/init.ts` - tRPC context & middleware
  - `src/schemas/*.ts` - Zod validation schemas (35+ files)
- Subdirectories: `trpc/routers/` (37+ domain routers), `rest/routers/` (18 REST endpoints), `ai/` (AI agents)

**apps/dashboard/**
- Purpose: Next.js 16 frontend application
- Contains: Pages (App Router), components, actions, hooks, stores
- Key files:
  - `src/app/[locale]/layout.tsx` - Root layout
  - `src/app/[locale]/providers.tsx` - tRPC + Query Client setup
  - `src/trpc/client.tsx` - tRPC client configuration
- Subdirectories: `components/` (feature-based), `actions/`, `hooks/` (50+ custom hooks), `store/` (Zustand), `utils/`

**packages/db/**
- Purpose: Database layer with Drizzle ORM
- Contains: Schema, queries, migrations, clients
- Key files:
  - `src/schema.ts` - Full database schema (4,274 lines)
  - `src/client.ts` - Drizzle connection pool
  - `src/queries/*.ts` - Reusable queries (43 files)
  - `drizzle.config.ts` - ORM configuration
- Subdirectories: `migrations/` (versioned SQL), `queries/` (organized by domain)

**packages/ui/**
- Purpose: Shared React component library
- Contains: 73 reusable UI components
- Key files: `src/components/*.tsx` (Radix UI + Tailwind)
- Pattern: Each component is self-contained with types

**packages/email/**
- Purpose: React Email templates
- Contains: Email components for invoices, notifications
- Key files:
  - `emails/*.tsx` - React Email components
  - `src/render.ts` - Email rendering utility
  - `src/locales/` - i18n for emails

**packages/jobs/**
- Purpose: Background job processing
- Contains: Trigger.dev task definitions
- Key files:
  - `src/tasks/**/*.ts` - Job implementations
  - `trigger.config.ts` - Trigger.dev config
  - `src/schema.ts` - Job payload schemas

**packages/supabase/**
- Purpose: Supabase client wrappers
- Contains: Auth, storage, queries
- Key files:
  - `src/client/server.ts` - Server-side client
  - `src/client/client.ts` - Browser client
  - `src/queries/*.ts` - Supabase-specific queries
  - `src/types/db.ts` - Auto-generated types (4,229 lines)

## Key File Locations

**Entry Points:**
- `apps/api/src/index.ts` - API server
- `apps/dashboard/src/app/[locale]/layout.tsx` - Frontend root
- `packages/jobs/src/init.ts` - Job runtime

**Configuration:**
- `tsconfig.json` - Root TypeScript config
- `turbo.json` - Build orchestration
- `biome.json` - Linting & formatting
- `apps/dashboard/tailwind.config.ts` - Tailwind CSS
- `packages/db/drizzle.config.ts` - Database ORM
- `.env-example` files in apps/

**Core Logic:**
- `apps/api/src/trpc/routers/*.ts` - API endpoints (37+ routers)
- `packages/db/src/queries/*.ts` - Database queries (43 files)
- `apps/dashboard/src/components/` - UI components
- `packages/jobs/src/tasks/` - Background jobs

**Testing:**
- `packages/*/src/*.test.ts` - Co-located unit tests (10 total)
- `packages/db/src/test/` - Integration tests

**Documentation:**
- `apps/docs/` - Mintlify documentation site
- `README.md` - Project overview
- `CLAUDE.md` - Development guide (implied)

## Naming Conventions

**Files:**
- Components: PascalCase.tsx → `AnimatedSizeContainer.tsx`
- Utilities: kebab-case.ts → `api-key-cache.ts`
- Tests: name.test.ts → `index.test.ts`
- Configs: kebab-case.ts/json → `drizzle.config.ts`

**Directories:**
- kebab-case for all directories
- Plural for collections: `routers/`, `queries/`, `components/`
- Singular for single-purpose: `cache/`, `logger/`

**Special Patterns:**
- `index.ts` - Barrel exports
- `*.test.ts` - Test files (co-located)
- `_app.ts` - Special router composition file
- `[locale]/` - Dynamic route segments (Next.js)

## Where to Add New Code

**New tRPC Endpoint:**
- Primary code: `apps/api/src/trpc/routers/new-domain.ts`
- Schema: `apps/api/src/schemas/new-domain.ts`
- Queries: `packages/db/src/queries/new-domain.ts`
- Register: `apps/api/src/trpc/routers/_app.ts`

**New Dashboard Page:**
- Route: `apps/dashboard/src/app/[locale]/new-page/page.tsx`
- Components: `apps/dashboard/src/components/new-page/`
- Actions: `apps/dashboard/src/actions/new-page-action.ts`
- Hooks: `apps/dashboard/src/hooks/use-new-page.ts`

**New Background Job:**
- Task: `packages/jobs/src/tasks/domain/new-task.ts`
- Schema: `packages/jobs/src/schema.ts` (add payload type)
- Trigger: Register in Trigger.dev dashboard

**New Shared Package:**
- Directory: `packages/new-package/`
- Entry: `packages/new-package/src/index.ts`
- Config: `packages/new-package/package.json`, `tsconfig.json`
- Register: Add to root `package.json` workspaces

**Utilities:**
- Shared helpers: `packages/utils/src/`
- Type definitions: `packages/*/src/types/`
- Database schema: `packages/db/src/schema.ts`

## Special Directories

**packages/supabase/src/types/**
- Purpose: Auto-generated types from Supabase
- Source: `supabase gen types typescript` command
- Committed: Yes (generated but tracked)

**apps/*/node_modules/**
- Purpose: Installed dependencies
- Source: Bun install
- Committed: No (.gitignored)

**packages/db/migrations/**
- Purpose: Versioned database migrations
- Source: Drizzle Kit generate
- Committed: Yes (versioned SQL)

**.turbo/**
- Purpose: Turbo build cache
- Source: Turbo build system
- Committed: No (.gitignored)

---

*Structure analysis: 2026-01-16*
*Update when directory structure changes*
