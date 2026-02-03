# Arquitetura tRPC - Modulo SU (Super Union)

**Data:** 2026-01-31
**Modulo:** API (Hono + tRPC) + Dashboard (Next.js)

---

## Visao Geral

O modulo SU usa tRPC para comunicacao type-safe entre frontend (Next.js 16) e backend (Hono). O backend roda na porta 8080, o dashboard na porta 9000. O namespace `trpc.su.*` e registrado como router de primeiro nivel no app router.

---

## Composicao de Routers

### App Router Principal

**Arquivo:** `apps/api/src/trpc/routers/_app.ts`

```typescript
export const appRouter = createTRPCRouter({
  // ... outros routers
  poker: pokerRouter,     // L72 - Modulo poker (clubes)
  su: suRouter,           // L73 - Modulo Super Union (ligas)
  // ... outros routers (37+ total)
});
```

### SU Router

**Arquivo:** `apps/api/src/trpc/routers/su/index.ts`

```typescript
export const suRouter = createTRPCRouter({
  analytics: suAnalyticsRouter,
  imports: suImportsRouter,
  metas: suMetasRouter,
  settlements: suSettlementsRouter,
  weekPeriods: suWeekPeriodsRouter,
});
```

### Arquivos dos Routers

| Router | Arquivo | Tamanho | Descricao |
|--------|---------|---------|-----------|
| analytics | `su/analytics.ts` | ~373 linhas | Dashboard stats e widgets |
| imports | `su/imports.ts` | ~797 linhas | Import/validacao/processamento |
| metas | `su/metas.ts` | ~880 linhas | Meta groups, time slots, club metas |
| settlements | `su/settlements.ts` | ~337 linhas | Acertos semanais |
| weekPeriods | `su/week-periods.ts` | ~581 linhas | Periodos semanais e fechamento |

---

## Contexto e Middleware

**Arquivo:** `apps/api/src/trpc/init.ts` (113 linhas)

Mesmo middleware do modulo Clube. Todos os procedures SU usam `protectedProcedure`:

```
Request HTTP POST /trpc
  |
  +-- Rate Limiting (1000 requests / 10 min / user)
  |
  +-- Auth Validation (JWT Supabase)
  |
  +-- Team Permission (teamId no contexto)
  |
  +-- Primary Read-After-Write
  |
  +-- Router Procedure (executa logica)
```

---

## Router: analytics

**Arquivo:** `apps/api/src/trpc/routers/su/analytics.ts`

### getDashboardStats (Query)

**Input:**
```typescript
{
  from?: string;
  to?: string;
  viewMode?: 'current_week' | 'historical';
}
```

**Logica:**
1. **current_week**: Busca periodo aberto mais recente -> imports completed (qualquer committed)
2. **historical**: Busca imports com `committed = true` no date range
3. Se nenhum import: retorna zeros
4. Queries paralelas: game counts, variants, players, GTD
5. Calcula overlay para jogos PPST com GTD
6. Agrega top leagues por total fee

**Output:** 20+ campos (ver DASHBOARD_WIDGETS.md)

---

## Router: imports

**Arquivo:** `apps/api/src/trpc/routers/su/imports.ts` (~797 linhas)

### Procedures

| Procedure | Tipo | Descricao |
|-----------|------|-----------|
| `list` | Query | Lista imports com filtro de status |
| `getById` | Query | Detalhe de um import |
| `create` | Mutation | Cria registro + week_period se necessario |
| `process` | Mutation | Processa dados em 4 fases |
| `delete` | Mutation | Remove com cascade manual |

### create: Fluxo

1. Verifica/cria `poker_su_week_periods` com mesmo `week_start`
2. Insere `poker_su_imports` com `status = 'validated'`
3. Armazena raw_data, validation_results, quality_score

### process: Pipeline de 4 Fases

```
Fase 1: Geral PPST -> Ligas
  - Upsert poker_su_leagues (team_id, liga_id)
  - Upsert poker_su_league_summary (campos PPST)

Fase 2: Jogos PPST -> Games + Players
  - Sub 2.1: Coletar games com metadata
  - Sub 2.2: Batch insert poker_su_games (BATCH_SIZE=500)
  - Sub 2.3: Mapear game_id externo -> UUID interno
  - Sub 2.4: Coletar game players
  - Sub 2.5: Batch insert poker_su_game_players

Fase 3: Geral PPSR -> Ligas (atualiza ou cria)
  - Update summaries existentes com campos PPSR
  - Ou cria novos summaries PPSR-only

Fase 4: Jogos PPSR -> Games + Players
  - Mesmo padrao da Fase 2 mas com campos cash
  - blinds, hands_played, rake_paid

Finalizacao:
  - status = 'completed'
  - committed = false (sera true ao fechar semana)
  - Salva estatisticas (totalLeagues, totalGames*, totalPlayers*)
```

### delete: Cascade Manual

1. Buscar game IDs do import
2. Deletar game_players (FK)
3. Deletar league_summaries
4. Deletar games
5. Deletar import
6. Limpar week_periods orfaos

### Mapeamento de Variantes

**PPST:**
- "spinup" -> spinup
- "pko" -> pko
- "mko" -> mko
- "plo5" -> plo5
- "short" -> short
- "6+" -> 6plus
- default -> nlh

**PPSR:**
- PLO5, PLO6, PLO, OFC detectados por tipo
- default -> nlh

---

## Router: metas

**Arquivo:** `apps/api/src/trpc/routers/su/metas.ts` (~880 linhas)

### Hierarquia de 3 Niveis

```
Meta Group (distribuicao org-wide)
  +-- Members (SuperUnions/Leagues no grupo)
  +-- Time Slots (override por horario)
  +-- Club Metas (alvos por clube/semana)
```

### Procedures (11 total, namespaced)

**metaGroups:**

| Procedure | Tipo | Input | Descricao |
|-----------|------|-------|-----------|
| `metaGroups.list` | Query | `{ activeOnly? }` | Lista grupos com contagem de membros |
| `metaGroups.getById` | Query | `{ id }` | Grupo + membros + time slots |
| `metaGroups.create` | Mutation | `{ name, metaPercent, memberIds? }` | Cria grupo (valida soma <= 100%) |
| `metaGroups.update` | Mutation | `{ id, name?, metaPercent?, isActive? }` | Atualiza grupo |
| `metaGroups.delete` | Mutation | `{ id }` | Remove grupo (cascade FK) |

**metaGroupMembers:**

| Procedure | Tipo | Input | Descricao |
|-----------|------|-------|-----------|
| `metaGroupMembers.add` | Mutation | `{ metaGroupId, superUnionId }` | Adiciona membro |
| `metaGroupMembers.remove` | Mutation | `{ id }` | Remove membro |
| `metaGroupMembers.bulk` | Mutation | `{ metaGroupId, members[] }` | Substitui todos |

**metaGroupTimeSlots:**

| Procedure | Tipo | Input | Descricao |
|-----------|------|-------|-----------|
| `metaGroupTimeSlots.list` | Query | `{ metaGroupId }` | Lista slots por hora |
| `metaGroupTimeSlots.create` | Mutation | `{ metaGroupId, name, hourStart, hourEnd, metaPercent }` | Cria slot (valida overlap) |
| `metaGroupTimeSlots.update` | Mutation | `{ id, hourStart?, hourEnd?, metaPercent? }` | Atualiza (valida overlap) |
| `metaGroupTimeSlots.delete` | Mutation | `{ id }` | Remove slot |

**clubMetas:**

| Procedure | Tipo | Input | Descricao |
|-----------|------|-------|-----------|
| `clubMetas.getByWeek` | Query | `{ weekYear, weekNumber }` | Metas de uma semana |
| `clubMetas.create` | Mutation | `{ superUnionId, clubId, weekYear, weekNumber, targetType, targetValue }` | Cria meta |
| `clubMetas.update` | Mutation | `{ id, targetValue? }` | Atualiza meta |
| `clubMetas.delete` | Mutation | `{ id }` | Remove meta |
| `clubMetas.bulkCreate` | Mutation | `{ metas[] }` | Upsert batch |
| `clubMetas.inheritFromPrevious` | Mutation | `{ source, target weekYear/weekNumber }` | Copia metas da semana anterior |

### Validacoes Chave

1. **Soma de %**: Grupos ativos nao podem ultrapassar 100%
2. **Overlap de horario**: Time slots nao podem sobrepor horarios
3. **Unicidade de SU**: Um SuperUnion so pode pertencer a um grupo

---

## Router: settlements

**Arquivo:** `apps/api/src/trpc/routers/su/settlements.ts` (~337 linhas)

(Ver FECHAMENTO_SEMANA.md para detalhes completos)

| Procedure | Tipo | Descricao |
|-----------|------|-----------|
| `list` | Query | Lista com filtros |
| `getById` | Query | Detalhe |
| `getByPeriod` | Query | Todos de um periodo |
| `getPendingSummary` | Query | Resumo pendentes |
| `update` | Mutation | Ajuste/pagamento/status |
| `markAsCompleted` | Mutation | Pagar integralmente |
| `getStats` | Query | Estatisticas agregadas |

---

## Router: weekPeriods

**Arquivo:** `apps/api/src/trpc/routers/su/week-periods.ts` (~581 linhas)

(Ver FECHAMENTO_SEMANA.md para detalhes completos)

| Procedure | Tipo | Descricao |
|-----------|------|-----------|
| `getOpenPeriods` | Query | Periodos abertos |
| `getCurrent` | Query | Periodo atual |
| `getCloseWeekData` | Query | Dados do modal de fechamento |
| `close` | Mutation | Fechar semana + settlements + commit |
| `list` | Query | Lista com filtro de status |

---

## Rotas do Frontend

**Base:** `apps/dashboard/src/app/[locale]/(app)/(sidebar)/su/`

| Rota | Arquivo | tRPC Calls |
|------|---------|------------|
| `/su` | `page.tsx` | `su.analytics.getDashboardStats`, `su.weekPeriods.getOpenPeriods` |
| `/su/import` | `import/page.tsx` | `su.imports.create`, `su.imports.process`, `su.imports.list` |
| `/su/grade` | `grade/page.tsx` | localStorage (dados da validacao) |
| `/su/ligas` | `ligas/page.tsx` | Stub |
| `/su/jogos` | `jogos/page.tsx` | Stub |
| `/su/acertos` | `acertos/page.tsx` | Stub |

---

## Fluxo de Request

```
User Action (Navigate to /su)
    |
    v
Next.js Page Component
    |
    v
SUWidgetProvider + SUWidgetsGrid
    |
    v
useQuery(trpc.su.analytics.getDashboardStats.queryOptions({
  viewMode, from, to
}))
    |
    v
HTTP POST to ${NEXT_PUBLIC_API_URL}/trpc
  + Authorization: Bearer <JWT>
  + x-timezone, x-locale headers
    |
    v
API Middleware Chain (init.ts)
  +-- Rate Limiting (1000/10min/user)
  +-- Auth (JWT validation)
  +-- Team Permission (teamId)
  +-- Read-After-Write
    |
    v
Router Procedure (suAnalyticsRouter.getDashboardStats)
  +-- Filtrar imports por viewMode + committed
  +-- Queries paralelas (games, summaries, GTD)
  +-- Calculo overlay
  +-- Retornar stats agregadas
    |
    v
Client Rendering
  +-- React Query cache -> Widgets atualizados
```

---

## Schemas (Validacao Zod)

Os inputs sao validados inline nos routers (nao em arquivos separados como o modulo poker):

```typescript
// analytics.ts
const periodSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  viewMode: z.enum(["current_week", "historical"]).optional(),
});

// imports.ts - create
z.object({
  fileName: z.string(),
  fileSize: z.number().optional(),
  periodStart: z.string(),
  periodEnd: z.string(),
  timezone: z.string().optional(),
  rawData: z.any(),
  validationPassed: z.boolean().optional(),
  validationErrors: z.any().optional(),
  qualityScore: z.number().optional(),
})

// metas.ts - metaGroups.create
z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  metaPercent: z.number().min(0).max(100),
  memberIds: z.array(z.object({
    superUnionId: z.number(),
    suLeagueId: z.string().uuid().optional(),
    displayName: z.string().optional(),
  })).optional(),
})
```

---

## Diferenca: Arquitetura SU vs Clube

| Aspecto | SU | Clube |
|---------|-----|-------|
| **Sub-routers** | 5 (analytics, imports, metas, settlements, weekPeriods) | 7 (players, sessions, settlements, imports, analytics, transactions, weekPeriods) |
| **Schemas** | Inline nos routers | Arquivos separados em `schemas/poker/` |
| **DB Client** | Supabase client direto (`createAdminClient()`) | Supabase client direto |
| **Metas** | Router dedicado (880 linhas) | N/A |
| **Players** | N/A (dados em game_players) | Router dedicado (1231 linhas) |
| **Transactions** | N/A | Router dedicado (499 linhas) |
| **Batch size** | 500 (BATCH_SIZE constant) | Variavel |

---

**Ultima atualizacao:** 2026-01-31
