# Arquitetura tRPC - Modulo Poker

**Data:** 2026-01-31
**Modulo:** API (Hono + tRPC) + Dashboard (Next.js)

---

## Visao Geral

O modulo poker usa tRPC para comunicacao type-safe entre frontend (Next.js 16) e backend (Hono). O backend roda na porta 8080, o dashboard na porta 9000.

---

## Composicao de Routers

### App Router Principal

**Arquivo:** `apps/api/src/trpc/routers/_app.ts` (81 linhas)

```typescript
export const appRouter = createTRPCRouter({
  // ... outros routers
  poker: pokerRouter,     // L72 - Modulo poker (clubes)
  su: suRouter,           // L73 - Modulo Super Union (ligas)
  // ... outros routers (37+ total)
});
```

### Poker Router

**Arquivo:** `apps/api/src/trpc/routers/poker/index.ts` (19 linhas)

```typescript
export const pokerRouter = createTRPCRouter({
  players: pokerPlayersRouter,           // L11
  sessions: pokerSessionsRouter,         // L12
  settlements: pokerSettlementsRouter,    // L13
  imports: pokerImportsRouter,           // L14
  analytics: pokerAnalyticsRouter,       // L15
  transactions: pokerTransactionsRouter, // L16
  weekPeriods: pokerWeekPeriodsRouter,   // L17
});
```

### Arquivos dos Routers

| Router | Arquivo | Tamanho | Descricao |
|--------|---------|---------|-----------|
| players | `poker/players.ts` | 36KB (~1231 linhas) | CRUD jogadores, hierarquia agente |
| sessions | `poker/sessions.ts` | 19.7KB (~673 linhas) | Sessoes de jogo |
| settlements | `poker/settlements.ts` | 17.8KB (~596 linhas) | Acertos semanais |
| imports | `poker/imports.ts` | 66KB (~1754 linhas) | Import/validacao/processamento |
| analytics | `poker/analytics.ts` | 33KB (~1072 linhas) | Widgets e dashboard stats |
| transactions | `poker/transactions.ts` | 15.2KB (~499 linhas) | Movimentacoes de fichas |
| weekPeriods | `poker/week-periods.ts` | 38.5KB (~1195 linhas) | Periodos semanais |

### SuperUnion Router

**Arquivo:** `apps/api/src/trpc/routers/su/index.ts`

```typescript
export const suRouter = createTRPCRouter({
  analytics: suAnalyticsRouter,
  imports: suImportsRouter,          // 27.6KB
  metas: suMetasRouter,             // 27.1KB
  settlements: suSettlementsRouter,
  weekPeriods: suWeekPeriodsRouter,
});
```

---

## Contexto e Middleware

**Arquivo:** `apps/api/src/trpc/init.ts` (113 linhas)

### Contexto

```typescript
type TRPCContext = {
  session: Session | null;   // Sessao Supabase
  supabase: SupabaseClient;  // Cliente DB
  db: Database;              // Drizzle ORM
  geo: GeoContext;           // Dados geograficos
  teamId?: string;           // Time ativo
};
```

### Cadeia de Middleware

```
Request HTTP POST /trpc
  |
  +-- Rate Limiting (L64-69)
  |   - 1000 requests / 10 min / user
  |   - Redis-backed (packages/cache)
  |
  +-- Auth Validation (L75-93)
  |   - Valida JWT Supabase no header Authorization
  |   - Extrai session e userId
  |
  +-- Team Permission (L57-62)
  |   - Valida membership no time
  |   - Seta teamId no contexto
  |
  +-- Primary Read-After-Write (L49-55)
  |   - Garante consistencia apos writes
  |   - Direciona reads para primary DB
  |
  +-- Router Procedure
      - Executa logica de negocio
      - Retorna resultado serializado com SuperJSON
```

### Tipos de Procedure

| Tipo | Middleware | Uso |
|------|-----------|-----|
| `publicProcedure` (L71) | Read-after-write | Endpoints publicos |
| `authProcedure` (L75-93) | Rate limit + Auth | Requer autenticacao |
| `protectedProcedure` (L95-112) | Rate limit + Auth + Team | Requer auth + time (padrao poker) |

---

## Setup tRPC no Frontend

### Server-Side (SSR Prefetch)

**Arquivo:** `apps/dashboard/src/trpc/server.tsx` (99 linhas)

```typescript
// Cria proxy para prefetch server-side
const trpc = createTRPCOptionsProxy({
  url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    "x-timezone": timezone,
    "x-locale": locale,
    "x-country": country,
  },
});

// Uso em page.tsx (Server Component)
export default async function Page() {
  const queryClient = getQueryClient();
  await queryClient.fetchInfiniteQuery(
    trpc.poker.players.get.infiniteQueryOptions({...})
  );
  return (
    <HydrateClient>
      <PlayersTable />
    </HydrateClient>
  );
}
```

### Client-Side

**Arquivo:** `apps/dashboard/src/trpc/client.tsx` (78 linhas)

```typescript
// Provider e hook
export const { TRPCProvider, useTRPC } = createTRPCContext();

// trpcClient com httpBatchLink
const trpcClient = createTRPCClient({
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
      headers: () => ({
        Authorization: `Bearer ${token}`,
        "x-timezone": timezone,
        "x-locale": locale,
      }),
    }),
  ],
});

// Uso em componentes
const { data } = useTRPC().poker.players.get.useInfiniteQuery({...});
```

---

## Padrao de Data Loading

Todas as paginas do modulo poker seguem o mesmo padrao:

### 1. Page (Server Component)

```typescript
// page.tsx
export default async function PlayersPage() {
  const queryClient = getQueryClient();

  try {
    await queryClient.fetchInfiniteQuery(
      trpc.poker.players.get.infiniteQueryOptions({ ...filters })
    );
  } catch {
    // SSR auth failure - client vai buscar
  }

  return (
    <HydrateClient>
      <Suspense fallback={<DataTableSkeleton />}>
        <PlayersDataTable />
      </Suspense>
    </HydrateClient>
  );
}
```

### 2. Data Table (Client Component)

```typescript
// data-table.tsx
function PlayersDataTable() {
  const trpc = useTRPC();
  const { data, fetchNextPage, hasNextPage } =
    trpc.poker.players.get.useInfiniteQuery({ ...filters });

  return <DataTable columns={columns} data={data} />;
}
```

### 3. URL State Hook

```typescript
// use-poker-players-params.ts
function usePokerPlayersParams() {
  const [params, setParams] = useQueryParams({
    search: StringParam,
    type: StringParam,
    status: StringParam,
    // ...
  });
  return { params, setParams };
}
```

---

## Rotas do Frontend

**Base:** `apps/dashboard/src/app/[locale]/(app)/(sidebar)/poker/`

| Rota | Arquivo | tRPC Calls |
|------|---------|-----------|
| `/poker` | `page.tsx` | `poker.analytics.getDashboardStats` |
| `/poker/players` | `players/page.tsx` | `poker.players.get` (SSR prefetch) |
| `/poker/agents` | `agents/page.tsx` | `poker.players.get` (type=agent) |
| `/poker/sessions` | `sessions/page.tsx` | `poker.sessions.get`, `poker.sessions.getStats` |
| `/poker/settlements` | `settlements/page.tsx` | `poker.settlements.get` |
| `/poker/transactions` | `transactions/page.tsx` | `poker.transactions.get` |
| `/poker/import` | `import/page.tsx` | `poker.imports.get` (SSR prefetch) |
| `/poker/leagues` | `leagues/page.tsx` | Redirect -> `leagues/import` |
| `/poker/leagues/import` | `leagues/import/page.tsx` | `su.imports.*` |

---

## Fluxo de Request

```
User Action (Navigate to /poker/players)
    |
    v
Next.js Page Component (SSR)
    |
    v
queryClient.fetchInfiniteQuery(
  trpc.poker.players.get.infiniteQueryOptions({...})
)
    |
    v
HTTP POST to ${NEXT_PUBLIC_API_URL}/trpc
  + Authorization: Bearer <JWT>
  + x-timezone, x-locale, x-country headers
    |
    v
API Middleware Chain (init.ts)
  +-- Rate Limiting (1000/10min/user)
  +-- Auth (JWT validation)
  +-- Team Permission (teamId)
  +-- Read-After-Write
    |
    v
Router Procedure (pokerPlayersRouter.get)
  +-- Validar input com Zod
  +-- Query via Supabase client
  +-- Retornar resultado paginado
    |
    v
Client Hydration (HydrateClient)
  +-- Dehydrated query data + React Query cache
    |
    v
Client-Side Rendering
  +-- <Suspense> + useTRPC() para updates dinamicos
```

---

## Schemas (Validacao Zod)

Todos os inputs sao validados com Zod antes de chegar ao router.

**Diretorio:** `apps/api/src/schemas/poker/`

| Arquivo | Schemas |
|---------|---------|
| `players.ts` | getPokerPlayersSchema, createPokerPlayerSchema, updatePokerPlayerSchema |
| `sessions.ts` | getPokerSessionsSchema |
| `settlements.ts` | getPokerSettlementsSchema, createPokerSettlementSchema, markSettlementPaidSchema |
| `imports.ts` | createPokerImportSchema, validatePokerImportSchema, processPokerImportSchema |
| `week-periods.ts` | closeWeekSchema, previewCloseWeekSchema, dashboardViewOptionsSchema |
| `transactions.ts` | getPokerTransactionsSchema |

---

## Tipos Exportados

**Arquivo:** `apps/api/src/trpc/routers/_app.ts` (L78-80)

```typescript
export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
```

Uso no frontend:
```typescript
type Player = RouterOutputs["poker"]["players"]["get"]["items"][0];
```

---

**Ultima atualizacao:** 2026-01-31
