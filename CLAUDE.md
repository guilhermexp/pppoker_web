# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mid Poker is a financial management platform for PPPoker club operators, agents, and professional players. The system centralizes player management, sessions, transactions, weekly settlements, and analytics.

Key domain: importing Excel spreadsheets from PPPoker, validating data (12+ rules), and transforming into structured data for analysis and settlements.

## Development Commands

### Setup
```bash
bun install                    # Install all dependencies
docker compose up -d           # Start Redis (required for dev)
```

### Development
```bash
bun run dev                    # Start both API (8080) and Dashboard (9000)
bun run dev:api                # API only
bun run dev:dashboard          # Dashboard only
bun run dev:no-docker          # Start without Docker (Redis must be running)
```

### Testing
```bash
bun test                       # Run all tests in current package
turbo test --parallel          # Run all workspace tests
bun test path/to/file.test.ts # Single test file
```

### Build & Quality
```bash
bun run build                  # Build all apps
bun run build:dashboard        # Build dashboard only
bun run format                 # Format with Biome
bun run lint                   # Lint all packages
bun run typecheck              # TypeScript checks
```

### Database
```bash
cd packages/db
bun drizzle-kit generate       # Generate migration from schema
bun drizzle-kit migrate        # Run migrations
bun drizzle-kit studio         # Open Drizzle Studio
```

## Architecture

### Monorepo Structure (Turborepo + Bun Workspaces)

**apps/api/** - Hono + tRPC backend (port 8080)
- Entry: `src/index.ts` - Hono app with tRPC and REST routes
- Routers: `src/trpc/routers/*.ts` - 37+ domain routers
- Context: `src/trpc/init.ts` - Creates tRPC context with session, db, geo
- Middleware: rate limiting (1000/10min), team auth, read-after-write consistency
- Schemas: `src/schemas/*.ts` - Zod validation for inputs

**apps/dashboard/** - Next.js 16 frontend (port 9000)
- Entry: `src/app/[locale]/layout.tsx` - Root layout with providers
- tRPC client: `src/trpc/client.tsx` - Type-safe API calls
- Poker UI: `src/components/poker/` - Club management components
- League UI: `src/components/league/` - Multi-club (SuperUnion) components
- Server Actions: `src/actions/*.ts` - Server-side mutations with Supabase client from cookies

**packages/db/** - Database layer (Drizzle ORM + PostgreSQL)
- Schema: `src/schema.ts` - Full schema (4,274 lines)
- Queries: `src/queries/*.ts` - 43 reusable query files organized by domain
- Client: `src/client.ts` - Connection pool with pg driver
- Migrations: `migrations/` - Versioned SQL files

### Data Flow: tRPC Request

1. Dashboard calls `useTRPC().poker.players.list()`
2. tRPC client sends HTTP POST to `${NEXT_PUBLIC_API_URL}/trpc`
3. Authorization header with Supabase JWT token
4. Middleware chain: rate limit → auth → team permission → primary read-after-write
5. Router procedure executes business logic
6. Database queries via `packages/db` queries
7. Response serialized with SuperJSON, returned to client

### Key Patterns

**Router Composition** (`apps/api/src/trpc/routers/_app.ts`)
- Imports 37+ domain routers and composes into single AppRouter
- Pattern: `router.poker` namespace for poker module routes

**Query Layer** (`packages/db/src/queries/*.ts`)
- Reusable database queries shared across API and jobs
- Pattern: Named exports for specific queries (e.g., `getPlayerById`, `listSessionsByTeam`)

**Middleware Chain** (`apps/api/src/trpc/init.ts`)
- `withRateLimiting` - 1000 requests per 10min per user (Redis-backed)
- `withTeamPermission` - Authorization via team membership
- `withPrimaryReadAfterWrite` - Read consistency for distributed DB

**State Management**
- Server state: React Query via tRPC hooks
- Client state: Zustand stores in `apps/dashboard/src/store/`
- URL state: Custom hooks `use-*-params.ts` for filters

## Poker Module Integration

The poker module is the core feature. Key entities and files:

### Database Schema (`packages/db/src/schema.ts`)
- `poker_players` - Players/agents with hierarchy (agent_id, super_agent_id)
- `poker_sessions` - Game sessions (cash_game, mtt, sit_n_go, spin)
- `poker_session_players` - Many-to-many: sessions ↔ players
- `poker_chip_transactions` - All chip/credit movements (12 types)
- `poker_settlements` - Weekly settlements with status tracking
- `poker_imports` - Import history with validation results

### Import System (Critical Path)

**Frontend** (`apps/dashboard/src/components/poker/import/`)
- `PokerImporter.tsx` - Main component with file upload
- `ImportPreview.tsx` - 10-tab preview (Geral, Detalhado, Partidas, etc.)
- `ImportValidation.tsx` - Shows 12+ validation rules and errors

**Backend** (`apps/api/src/trpc/routers/poker/`)
- `poker-import.ts` - Handles upload, validation, processing
- `apps/api/src/schemas/poker/import.ts` - Zod schemas for import data

**Validation** (`apps/dashboard/src/lib/poker/validation.ts`)
- 12+ rules: structure, player IDs, transaction balance, session totals
- Returns detailed errors with row/column references

**Supported Spreadsheet Types:**
1. **Club Spreadsheet** (7 tabs) - Single club data from PPPoker
2. **League Spreadsheet** (4 tabs) - Multi-club SuperUnion data

### tRPC Poker Routers (`apps/api/src/trpc/routers/poker/`)
```
poker/
├── players.ts        # Player/agent CRUD, hierarchy
├── sessions.ts       # Game session tracking
├── transactions.ts   # Chip/credit movements
├── settlements.ts    # Weekly settlements
├── analytics.ts      # Rake, bank result, top players
└── poker-import.ts   # Import validation & processing
```

## Testing

### Co-located Tests
Tests live alongside source files as `*.test.ts`:
- `packages/encryption/src/index.test.ts`
- `packages/inbox/src/utils.test.ts`
- `packages/utils/src/tax.test.ts`

### Integration Tests
Located in `packages/db/src/test/`:
- `transaction-matching.test.ts`
- `transaction-matching.integration.test.ts`
- `transaction-matching.golden.test.ts`

### Test Pattern
```typescript
import { describe, expect, it, beforeEach } from "bun:test";

describe("ModuleName", () => {
  beforeEach(() => {
    // Reset state per test
  });

  it("should handle valid input", () => {
    // arrange
    const input = createTestInput();

    // act
    const result = functionName(input);

    // assert
    expect(result).toEqual(expectedOutput);
  });
});
```

**CRITICAL GAP**: Only 10 test files exist. The 37+ tRPC routers, poker import logic, and complex validation are untested.

## Coding Conventions

### Files
- kebab-case for utilities: `api-key-cache.ts`
- PascalCase.tsx for React components: `Card.tsx`
- name.test.ts for tests: `tax.test.ts`

### Functions
- camelCase: `fetchData()`, `createUser()`
- Event handlers: `handleClick`, `handleSubmit`

### Types
- PascalCase, no "I" prefix: `User`, `Transaction`

### Formatting
- Tool: Biome 1.9.4 (`biome.json`)
- 2-space indentation
- Double quotes
- Semicolons required

### Import Order
1. Node built-ins (`node:crypto`)
2. External packages (`react`, `zod`)
3. Internal workspace (`@midpoker/*`)
4. Relative imports (`.`, `..`)
5. Type imports (`import type`)

### Error Handling
- tRPC: Throw `TRPCError` with specific codes
- Server actions: Return `{ error: string }` or throw
- Logging: Pino structured logging with context objects

## Adding New Features

### New tRPC Endpoint
1. Create router: `apps/api/src/trpc/routers/new-domain.ts`
2. Add schema: `apps/api/src/schemas/new-domain.ts`
3. Add queries: `packages/db/src/queries/new-domain.ts`
4. Register in: `apps/api/src/trpc/routers/_app.ts`

### New Dashboard Page
1. Create route: `apps/dashboard/src/app/[locale]/new-page/page.tsx`
2. Add components: `apps/dashboard/src/components/new-page/`
3. Add hooks: `apps/dashboard/src/hooks/use-new-page.ts`
4. Add actions (if needed): `apps/dashboard/src/actions/new-page-action.ts`

### Database Schema Change
1. Update: `packages/db/src/schema.ts`
2. Generate: `cd packages/db && bun drizzle-kit generate`
3. Review: Check `migrations/` for new SQL file
4. Migrate: `bun drizzle-kit migrate` (or apply via Supabase)
5. Update queries: Add/modify `packages/db/src/queries/*.ts`

### Background Job
1. Create task: `packages/jobs/src/tasks/domain/new-task.ts`
2. Add schema: `packages/jobs/src/schema.ts`
3. Register in Trigger.dev dashboard

## Critical Notes

### Authentication
- Supabase JWT tokens in Authorization header
- Session validation via `withTeamPermission` middleware
- All data isolated by `team_id` via Row Level Security (RLS)

### Rate Limiting
- 1000 requests per 10 minutes per user
- Redis-backed via `packages/cache`
- Applied in tRPC middleware

### Poker Import Validation
The validation system (`apps/dashboard/src/lib/poker/validation.ts`) runs 12+ checks:
- Structure: Tab names, column count
- Players: Valid IDs, no duplicates
- Transactions: Balanced totals, valid types
- Sessions: Rake matches transaction totals
- Settlements: Amounts match transaction sums

Always validate before processing to prevent data corruption.

### Database Consistency
- Use `withPrimaryReadAfterWrite` middleware for write → read sequences
- Queries use Drizzle ORM with type safety
- Migrations are versioned SQL (never modify existing migrations)

### Tech Debt
- 50+ files with `@ts-expect-error` or `@ts-ignore`
- 20+ files still using `console.log()` instead of Pino logger
- 11+ TODO/FIXME comments without linked issues
- Most routers lack error handling tests
