# Mid Poker (pppoker_web)

## Commands

```bash
bun dev                # Start all services (dashboard + api + nanobot + redis + pppoker bridge)
bun dev:dashboard      # Dashboard only (Next.js, port 3100)
bun dev:api            # API only (Hono + tRPC, port 3101)
bun dev:nanobot        # Nanobot only (Python Starlette, port 18790)
bun test               # Run all tests (Bun test runner)
bun run lint           # Biome lint + manypkg check
bun run typecheck      # TypeScript check (concurrency=1)
bun run format         # Biome format --write
bun build              # Build all packages
```

## Architecture

Monorepo: **Bun** + **Turborepo**

| App | Stack | Port | Package name |
|-----|-------|------|-------------|
| `apps/dashboard` | Next.js 16 + Turbopack | 3100 | `@midpoker/dashboard` |
| `apps/api` | Hono REST + tRPC | 3101 | `@midpoker/api` |
| `apps/nanobot` | Python 3.11 Starlette + SSE | 18790 | `@midpoker/nanobot` |
| `Ppfichas/` | Python FastAPI PPPoker bridge | 3102 | (external) |
| Redis | Cache/sessions | 6380 | (daemon) |

Key packages: `packages/db` (Drizzle ORM), `packages/supabase` (auth), `packages/ui` (shadcn/ui components), `packages/jobs` (Trigger.dev), `packages/cache` (Redis).

### Data flow

- Frontend (`dashboard`) calls API via **tRPC** (type-safe) and **REST** (file uploads, SSE proxies)
- API authenticates via **Supabase JWT** (`Authorization: Bearer`)
- API proxies to nanobot (`NANOBOT_BASE_URL`) and PPPoker bridge (`PPPOKER_BRIDGE_URL`)
- Nanobot uses **nanobot-ai** AgentLoop with MCP tools for PPPoker operations

## Code Style

- **Formatter/Linter**: Biome (spaces, not tabs)
- **TypeScript**: Strict mode, `noUncheckedIndexedAccess: true`
- **Imports**: Path aliases — `@/*` (dashboard src), `@api/*` (api src), `@db/*`, `@jobs/*`
- **Language**: Portuguese for user-facing strings; English for code, variables, comments
- **i18n**: `apps/dashboard/src/locales/{pt,en}.ts` — always add keys to both files

## Key Patterns

### tRPC routers (`apps/api/src/trpc/routers/`)
- Procedures use Supabase auth context from middleware
- Team-scoped data: `teamId` comes from auth context, never from client input
- Settings stored in `teams.export_settings` JSONB column (InfinitePay, nanobot, fastchips_service)
- Use `normalizeXxxSettings()` with defensive `??` for partial DB data

### Supabase Auth
- Client: `@midpoker/supabase/client` (browser) / `@midpoker/supabase/server` (SSR)
- Each club maps to a Supabase **team** with isolated data via RLS
- Login flow: PPPoker credentials -> API validates -> Supabase session created

### Nanobot Agent
- Real `nanobot-ai` package (v0.1.4), NOT Vercel AI SDK
- Python venv at `apps/nanobot/.venv/` (Python 3.11)
- Config at `~/.nanobot/config.json`, workspace at `~/.nanobot/workspace/`
- MCP tools filtered at startup — only safe read-only tools loaded by default
- `_agent_semaphore = Semaphore(1)` — one agent call at a time
- Provider: OpenRouter (gpt-4o-mini)

### WhatsApp Gateway (Fastchips)
- Bridge runs in **Daytona sandbox** (per-team isolation, node:20-slim)
- Bridge source: `apps/nanobot/bridge/` (Node.js + Baileys)
- Communication: Python server.py <-> WebSocket <-> Bridge <-> WhatsApp
- Env vars for Daytona in `apps/nanobot/.env` (gitignored)

## Environment Setup

Required for full `bun dev`:
1. **Redis** on port 6380 (auto-started by dev script)
2. **Python 3.11 venv** at `apps/nanobot/.venv/` — `cd apps/nanobot && python3.11 -m venv .venv && .venv/bin/pip install nanobot-ai`
3. **Ppfichas/** directory with PPPoker bridge (optional, skipped if missing)
4. `.env` files in `apps/dashboard/.env` and `apps/api/.env` (Supabase keys, DB URLs)
5. `apps/nanobot/.env` — Daytona credentials for WhatsApp gateway

## Gotchas

- **`bun dev` kills ports first** — the dev script kills processes on 3100/3101/3102/18790 before starting
- **Python server doesn't hot-reload** — must restart `bun dev` after editing `server.py`
- **MCP InfinitePay server** requires `Ppfichas/infinitepay_mcp.py` — fails silently if missing
- **TypeScript errors in `sidebar-navigation.ts`** are pre-existing, not blocking
- **Biome, not ESLint** — don't add eslint configs, use `bun run format` and `bun run lint`
- **Git paths with brackets** need single quotes in zsh: `git add 'apps/dashboard/src/app/[locale]/(app)/(sidebar)/...'`
- **`useSuspenseQuery` re-suspends** on cache invalidation — use optimistic updates (`onMutate`) to prevent UI flashes
- **Nanobot agent semaphore** is 1 — concurrent agent calls queue, never run in parallel
