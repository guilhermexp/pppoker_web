# Architecture

**Analysis Date:** 2026-01-16

## Pattern Overview

**Overall:** Monorepo com Turbo - Aplicações separadas (API + Dashboard) + Pacotes compartilhados

**Key Characteristics:**
- Arquitetura de monorepo com workspaces Bun
- Separação clara entre backend (Hono+tRPC) e frontend (Next.js)
- Pacotes reutilizáveis para lógica de domínio
- Comunicação type-safe via tRPC

## Layers

**API Layer:**
- Purpose: Backend tRPC + REST API
- Contains: Routers, schemas, services, middleware
- Location: `apps/api/src/`
- Depends on: `@midpoker/db`, `@midpoker/supabase`, domain packages
- Used by: Dashboard via tRPC client

**Frontend Layer:**
- Purpose: Next.js 16 application with App Router
- Contains: Pages, components, actions, hooks, stores
- Location: `apps/dashboard/src/`
- Depends on: API via tRPC, UI packages, Supabase client
- Used by: End users (browser)

**Database Layer:**
- Purpose: Data access via Drizzle ORM
- Contains: Schema, queries, migrations, clients
- Location: `packages/db/src/`
- Depends on: PostgreSQL driver (`pg`)
- Used by: API layer e jobs

**Domain Packages:**
- Purpose: Lógica de negócio reutilizável
- Contains: Utilities, types, business logic
- Examples: `@midpoker/categories`, `@midpoker/invoice`, `@midpoker/documents`
- Depends on: Minimal dependencies
- Used by: API, Dashboard, Jobs

**Jobs Layer:**
- Purpose: Background task processing
- Contains: Trigger.dev tasks
- Location: `packages/jobs/src/tasks/`
- Depends on: DB, email, integrations packages
- Used by: Trigger.dev runtime

## Data Flow

**tRPC Request Flow:**

1. Dashboard component calls `useTRPC().endpoint.procedure()`
2. tRPC client (`apps/dashboard/src/trpc/client.tsx`) sends HTTP request
3. Authorization header with Supabase JWT token
4. API receives at `${NEXT_PUBLIC_API_URL}/trpc`
5. tRPC context created (`apps/api/src/trpc/init.ts`): session, supabase, db, geo
6. Middleware chain executes: rate limiting → auth → team permission → primary read-after-write
7. Router procedure executes business logic
8. Database queries via Drizzle ORM
9. Response serialized with SuperJSON
10. Client receives typed response

**Server Action Flow:**

1. Dashboard form/component calls server action
2. Action executes server-side (`apps/dashboard/src/actions/*.ts`)
3. Supabase client created from cookies
4. Database operations or external API calls
5. Revalidation of Next.js cache paths
6. Response returned to client

**Background Job Flow:**

1. Event triggers Trigger.dev task
2. Job executes in isolated runtime (`packages/jobs/src/tasks/`)
3. Accesses database via shared DB package
4. Sends emails via Resend
5. Updates Supabase tables
6. Logs completion status

**State Management:**
- Server state: React Query via tRPC hooks
- Client state: Zustand stores (`apps/dashboard/src/store/`)
- URL state: Custom hooks for params (`apps/dashboard/src/hooks/use-*-params.ts`)
- Form state: React Hook Form (implied by patterns)

## Key Abstractions

**tRPC Procedures:**
- Purpose: Type-safe API endpoints
- Examples: `apps/api/src/trpc/routers/team.ts`, `bank-accounts.ts`, `transactions.ts`
- Pattern: publicProcedure, authProcedure, protectedProcedure
- Locations: `apps/api/src/trpc/routers/*.ts` (37+ routers)

**Router Composition:**
- Purpose: Organize endpoints by domain
- Example: `apps/api/src/trpc/routers/_app.ts` compõe 30+ routers
- Pattern: Modular router definitions merged into AppRouter

**Middleware Chain:**
- Purpose: Cross-cutting concerns
- Examples:
  - `withRateLimiting` - 1000 req/10min per user
  - `withTeamPermission` - Authorization checks
  - `withPrimaryReadAfterWrite` - Read consistency
- Location: `apps/api/src/trpc/init.ts`

**Query Layer:**
- Purpose: Reusable database queries
- Examples: `packages/db/src/queries/invoices.ts`, `teams.ts`, `transactions.ts`
- Pattern: Named exports for specific queries
- Locations: `packages/db/src/queries/*.ts` (43 query files)

**Schema Validation:**
- Purpose: Input validation with Zod
- Examples: `apps/api/src/schemas/customers.ts`, `invoice.ts`
- Pattern: Exported Zod schemas integrated with tRPC
- Locations: `apps/api/src/schemas/*.ts` (35+ schemas)

**React Components:**
- Purpose: UI building blocks
- Examples: `packages/ui/src/components/*.tsx` (73 components)
- Pattern: Radix UI primitives + custom styling
- Locations: `packages/ui/src/components/`, `apps/dashboard/src/components/`

**Server Actions:**
- Purpose: Next.js server-side mutations
- Examples: `apps/dashboard/src/actions/export-transactions-action.ts`
- Pattern: "use server" directive, Supabase client from cookies
- Locations: `apps/dashboard/src/actions/*.ts`

## Entry Points

**API Server:**
- Location: `apps/api/src/index.ts`
- Triggers: HTTP requests on port 8080
- Responsibilities: Hono app initialization, tRPC + REST routing, OpenAPI docs

**Dashboard App:**
- Location: `apps/dashboard/src/app/[locale]/layout.tsx`
- Triggers: User navigation
- Responsibilities: Root layout, locale routing, providers setup

**tRPC Router:**
- Location: `apps/api/src/trpc/routers/_app.ts`
- Triggers: API calls via HTTP
- Responsibilities: Route to appropriate domain router

**Database Client:**
- Location: `packages/db/src/client.ts`
- Triggers: Import by API/Jobs
- Responsibilities: Drizzle connection with pooling

**Job Tasks:**
- Location: `packages/jobs/src/tasks/**/*.ts`
- Triggers: Trigger.dev events
- Responsibilities: Async processing (emails, imports, exports)

## Error Handling

**Strategy:** Exception bubbling to tRPC error handler or Next.js error boundaries

**Patterns:**
- tRPC throws `TRPCError` with specific error codes
- Server actions catch and return `{ error: string }`
- API middleware logs errors with Pino
- Some routers log and return silent failures (tech debt)

## Cross-Cutting Concerns

**Logging:**
- Pino logger instance (`packages/logger/src/index.ts`)
- Structured logging with context objects
- Levels: debug, info, warn, error

**Validation:**
- Zod schemas at API boundary
- Input validation in tRPC procedures
- Type safety enforced by TypeScript strict mode

**Authentication:**
- Supabase JWT tokens
- Session validation in tRPC middleware
- Token extracted from Authorization header

**Authorization:**
- Team membership checks via `withTeamPermission`
- Role-based access (implied by team queries)
- RLS policies in Supabase (schema-level)

**Caching:**
- Redis via `packages/cache/src/` (API keys, users, teams)
- React Query client-side caching
- Next.js route caching

**Rate Limiting:**
- 1000 requests per 10 minutes per user
- Implemented in `withRateLimiting` middleware
- Uses Redis for storage

---

*Architecture analysis: 2026-01-16*
*Update when major patterns change*
