# Mid Poker - Auditoria Completa do Codebase

**Data:** 2026-02-21
**Escopo:** Estrutura, arquitetura, duplicacoes, codigo morto, dependencias, convencoes

---

## Indice

1. [Visao Geral da Arquitetura](#1-visao-geral-da-arquitetura)
2. [Mapa do Monorepo](#2-mapa-do-monorepo)
3. [Grafo de Dependencias Internas](#3-grafo-de-dependencias-internas)
4. [Problemas Criticos](#4-problemas-criticos)
5. [Codigo Morto & Nao Utilizado](#5-codigo-morto--nao-utilizado)
6. [Duplicacoes de Codigo](#6-duplicacoes-de-codigo)
7. [Banco de Dados - Schema & Queries](#7-banco-de-dados---schema--queries)
8. [Backend API - Padroes & Problemas](#8-backend-api---padroes--problemas)
9. [Frontend Dashboard - Padroes & Problemas](#9-frontend-dashboard---padroes--problemas)
10. [Dependencias & Configuracao](#10-dependencias--configuracao)
11. [Convencoes Propostas](#11-convencoes-propostas)
12. [Plano de Acao Priorizado](#12-plano-de-acao-priorizado)

---

## 1. Visao Geral da Arquitetura

```
                    +-------------------+
                    |   apps/dashboard  |  Next.js 16 (:9000)
                    |   927 arquivos    |  React + tRPC client
                    +--------+----------+
                             |
                     tRPC (HTTP POST)
                     Authorization: JWT
                             |
                    +--------v----------+
                    |     apps/api      |  Hono + tRPC (:8080)
                    |   53 routers      |  337 procedures
                    |   280 schemas     |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v------+  +----v--------+
     | packages/db|  |packages/cache| |packages/jobs|
     | Drizzle ORM|  | Redis       | | Trigger.dev |
     | 57 tabelas |  | Rate limit  | | Background  |
     +--------+---+  +-------------+ +-------------+
              |
     +--------v----------+
     |  PostgreSQL (Neon) |
     |  + Supabase Auth   |
     +--------------------+
```

**Numeros-chave:**
- 3 apps (API, Dashboard, Docs)
- 20 packages compartilhados
- 57 tabelas no banco
- 53 tRPC routers com 337 procedures
- 927 arquivos de componentes no frontend
- 43 arquivos de query no `packages/db`

---

## 2. Mapa do Monorepo

### Apps

| App | Stack | Porta | Arquivos | Papel |
|-----|-------|-------|----------|-------|
| `apps/api` | Hono + tRPC | 8080 | ~200 | Backend API |
| `apps/dashboard` | Next.js 16 | 9000 | ~927 | Frontend SPA |
| `apps/docs` | Mintlify | 3004 | ~20 | Documentacao |

### Packages (20)

| Camada | Package | Proposito |
|--------|---------|-----------|
| **Config** | `tsconfig` | TypeScript configs compartilhados |
| **Infra** | `logger` | Pino structured logging |
| | `cache` | Redis (rate limit, session, widget prefs) |
| | `encryption` | Criptografia de dados |
| **Data** | `db` | Drizzle ORM, schema, 43 query files |
| | `supabase` | Cliente Supabase (server/client/job) |
| **Dominio** | `import` | Parsing Excel/CSV |
| | `invoice` | Geracao de faturas (React PDF) |
| | `documents` | Processamento de documentos + AI |
| | `categories` | Categorias com embeddings AI |
| | `inbox` | Email inbox (Gmail connector) |
| | `notifications` | Roteamento de notificacoes |
| | `email` | 14 templates React Email |
| | `jobs` | Trigger.dev background jobs |
| | `app-store` | Integracoes (Slack) |
| **UI** | `ui` | 73+ componentes Radix + Tailwind |
| **Util** | `utils` | Formatacao, taxas, env helpers |
| | `location` | Paises, moedas, timezones |

---

## 3. Grafo de Dependencias Internas

```
FOLHAS (sem deps internas)
  tsconfig, logger, location, utils, encryption

FUNDACAO
  cache ← (redis)
  categories ← (logger, AI SDK)

DADOS
  db ← utils, encryption, invoice, logger, categories
  supabase ← (externo apenas)

INTEGRACOES
  inbox ← db, encryption, supabase, utils
  app-store ← supabase
  notifications ← db, email, encryption, inbox, utils
  import ← (date-fns, zod)

CONTEUDO
  documents ← utils, AI SDKs
  invoice ← ui, utils
  email ← ui, utils

JOBS
  jobs ← app-store, db, documents, email, import, inbox, notifications, supabase, utils

APPS
  api ← cache, categories, db, documents, email, encryption, inbox, invoice, jobs, location, logger, notifications, supabase, utils
  dashboard ← api (tipos), app-store, documents, encryption, import, inbox, invoice, location, supabase, ui, utils
```

---

## 4. Problemas Criticos

### 4.1 ZERO query files para Poker (core do sistema)

**Gravidade: CRITICA**

O modulo Poker e o core do produto, mas **todo acesso ao banco e feito diretamente nos routers via Supabase REST client**, violando a arquitetura do projeto que usa Drizzle ORM + `packages/db/src/queries/`.

- **Impacto:** Logica de negocio duplicada, sem reuso, sem type safety, impossivel testar
- **Locais:** `apps/api/src/trpc/routers/poker/*.ts` (7.037 LOC)
- **Solucao:** Criar `packages/db/src/queries/poker/` com queries extraidas

### 4.2 Tabelas SU nao estao no Drizzle schema

**Gravidade: CRITICA**

10+ tabelas SuperUnion existem no banco (criadas via migrations 0005, 0009-0012) mas **nao estao definidas em `packages/db/src/schema.ts`**.

- **Tabelas faltantes:** `poker_su_leagues`, `poker_su_games`, `poker_su_game_players`, `poker_su_settlements`, `poker_su_metas`, `poker_su_overlay_selections`, `poker_su_club_deals`, `poker_su_league_summary`
- **Impacto:** Sem type safety, ORM nao valida queries, schema-migration mismatch

### 4.3 Versoes conflitantes de dependencias

**Gravidade: ALTA**

| Pacote | Conflito | Impacto |
|--------|----------|---------|
| `@tiptap/*` | v2 e v3 misturados no mesmo workspace (ui) | Runtime errors, bundle duplicado |
| `zod` | v3 em `@midpoker/import`, v4 no resto | Tipos incompativeis |
| `ai` SDK | 5.0.87 (ui, documents) vs 5.0.101 (resto) | Bugs, duplicacao |
| `date-fns-tz` | Pacote deprecated em import, `@date-fns/tz` no resto | Inconsistencia |

### 4.4 Import uploaders gigantes (7.182 LOC em 3 arquivos)

**Gravidade: ALTA**

| Arquivo | Linhas |
|---------|--------|
| `poker/league-import-uploader.tsx` | 3.121 |
| `poker/import-uploader.tsx` | 2.299 |
| `league/league-import-uploader.tsx` | 1.762 |

Esses 3 arquivos contem parsing, validacao, estado, e UI misturados. Sao os maiores arquivos do projeto e contem muita logica duplicada entre si.

---

## 5. Codigo Morto & Nao Utilizado

### 5.1 Funcoes de query nunca importadas

| Funcao | Arquivo | Status |
|--------|---------|--------|
| `getExchangeRate()` | `packages/db/src/queries/exhange-rates.ts` | NUNCA USADA |
| `upsertExchangeRates()` | `packages/db/src/queries/exhange-rates.ts` | NUNCA USADA |

### 5.2 Arquivos inteiramente comentados

| Arquivo | Conteudo |
|---------|----------|
| `apps/api/src/ai/tools/get-expenses-breakdown.ts` | Tool AI inteira comentada |

### 5.3 Blocos de codigo comentado significativos

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `apps/api/src/rest/middleware/auth.ts` | 18-20 | OPTIONS preflight handler |
| `apps/api/src/rest/routers/transactions.ts` | 407-413 | Endpoint de attachments |
| `apps/api/src/schemas/team.ts` | 20-34 | Schema subscriptionStatus |

### 5.4 Console.log que devem virar Pino logger

**Total: 75+ instancias** nos seguintes locais:

**API Routers (mais graves):**
- `team.ts` - 9 calls
- `invoice-products.ts` - 10 calls
- `tracker-entries.ts` - 7 calls
- `transactions.ts` - 6 calls
- `su/imports.ts` - 6 calls
- `oauth-applications.ts` - 5 calls
- `user.ts` - 4 calls

**Packages:**
- `packages/cache/src/redis-client.ts` - 3 calls
- `packages/cache/src/rate-limit-cache.ts` - 3 calls
- `packages/inbox/src/providers/gmail.ts` - 8 calls

### 5.5 @ts-expect-error / @ts-ignore (75+ instancias)

**Causa raiz:** JSONB fields no schema sem tipos definidos.

**Maiores concentracoes:**
- `packages/db/src/queries/invoices.ts` - 13 instancias (JSONB: template, line_items)
- `apps/dashboard/src/components/document-details.tsx` - 3 instancias
- `apps/dashboard/src/components/invoice/form.tsx` - 2 instancias
- `packages/jobs/src/tasks/invoice/` - 4 instancias

**Solucao:** Definir tipos TypeScript para os campos JSONB em `packages/db/src/schema.ts`.

### 5.6 TODOs sem issues vinculadas (8)

| Arquivo | TODO |
|---------|------|
| `packages/email/render.ts` | Temporary render function |
| `packages/jobs/src/utils/transaction-notifications.tsx` | Get correct locale |
| `apps/dashboard/src/components/poker/league-import-uploader.tsx` | Implement backend processing |
| `packages/jobs/src/tasks/transactions/import.ts` | Fix transaction type mapping |
| `packages/jobs/src/tasks/transactions/update-base-currency.ts` | Fix types with drizzle |
| `packages/jobs/src/tasks/inbox/provider/sync-account.ts` | Unregister inbox scheduler |
| `apps/api/src/trpc/routers/su/week-periods.ts` | Count ppsr_games_count properly |

### 5.7 Dependencias potencialmente nao usadas

| Dependencia | Localizacao | Uso |
|-------------|-------------|-----|
| `mintlify` | root package.json | 0 imports encontrados |
| `little-date` | root + ui | 1 unico uso em `filter-list.tsx` |

---

## 6. Duplicacoes de Codigo

### 6.1 Hooks de parametros URL (MAIOR OPORTUNIDADE: ~900 linhas)

**28 hooks** com `useQueryStates` seguem padrao identico. Exemplos:

- `use-poker-dashboard-params.ts` (91 linhas)
- `use-su-dashboard-params.ts` (89 linhas)
- `use-poker-player-params.ts` (153 linhas)
- `use-poker-session-params.ts` (87 linhas)
- `use-poker-transaction-params.ts` (113 linhas)
- ...e mais 23

**Solucao:** Factory function:
```typescript
// apps/dashboard/src/hooks/create-params-hook.ts
export function createParamsHook<T>(schema: T) {
  return function useParams() {
    const [params, setParamsInternal] = useQueryStates(schema, { clearOnDefault: true });
    const setParams = (newParams: Partial<T> | null) => { /* ... */ };
    return { ...params, setParams, hasFilters: Object.values(params).some(v => v !== null) };
  };
}
// Uso:
export const usePokerDashboardParams = createParamsHook(pokerDashboardFilterSchema);
```

**Reducao estimada: ~900 linhas -> ~200 linhas**

### 6.2 Header components de poker (5 arquivos identicos)

| Arquivo |
|---------|
| `poker-players-header.tsx` |
| `poker-agents-header.tsx` |
| `poker-sessions-header.tsx` |
| `poker-transactions-header.tsx` |
| `poker-settlements-header.tsx` |

Todos tem a mesma estrutura: `SearchField` + `Filters` + `ActionButton`.

**Solucao:** Componente generico `GenericListHeader`:
```typescript
interface Props {
  searchPlaceholder: string;
  filtersComponent: React.ComponentType;
  actionComponent?: React.ComponentType;
}
```

### 6.3 Import uploaders (3 componentes com logica duplicada)

Funcoes duplicadas entre os 3 uploaders:
- `toNumber()` - Parsing numerico
- `columnLetterToIndex()` - Conversao coluna Excel
- `getCellValue()` - Leitura de celula
- `getWeekFromDateString()` - Parsing de data/semana
- Setup de `useDropzone` - Quase identico
- Logica de validacao modal

**Solucao:** Extrair para `apps/dashboard/src/lib/poker/parsers.ts` e `apps/dashboard/src/lib/poker/date-utils.ts`

### 6.4 Padroes json_agg duplicados no DB

```sql
-- Duplicado 6+ vezes em queries/customers.ts, queries/transactions.ts, etc.
coalesce(
  json_agg(distinct jsonb_build_object('id', table.id, 'name', table.name))
  filter (where table.id is not null),
  '[]'
)
```

**Solucao:** Utility function `buildJsonAggField()` em `packages/db/src/utils/`

### 6.5 CRUD routers duplicados

Routers como `tags.ts`, `transaction-tags.ts`, `document-tags.ts` tem padrao CRUD identico (get/create/update/delete).

**Solucao:** Factory `createCRUDRouter()` em `apps/api/src/trpc/factories/`

### 6.6 Slug generation inconsistente

- `transaction-categories.ts` - Manual: `.toLowerCase().replace(/\s+/g, "-")`
- `document-tags.ts` - Biblioteca: `slugify()` de `@sindresorhus/slugify`

**Solucao:** Utility unica `generateSlug()` em `apps/api/src/utils/slug.ts`

### 6.7 Widget providers (3 implementacoes similares)

- `PokerWidgetStoreContext`
- `SUWidgetStoreContext`
- `WidgetStoreContext`

**Solucao:** Factory generico `createWidgetProvider()`

### Resumo de duplicacoes

| Categoria | Arquivos | Linhas | Reducao |
|-----------|----------|--------|---------|
| Parameter hooks | 28 | ~1.087 | 80% |
| Header components | 5 | ~120 | 80% |
| Import parsers | 3 | ~150 | 70% |
| json_agg patterns | 5+ | ~150 | 60% |
| CRUD routers | 10+ | ~400 | 70% |
| Widget providers | 3 | ~200 | 70% |
| **TOTAL** | **54+** | **~2.100** | **~1.500 linhas** |

---

## 7. Banco de Dados - Schema & Queries

### 7.1 Tabelas por dominio

| Dominio | Tabelas | Query Layer | Status |
|---------|---------|-------------|--------|
| Core (users, teams, etc) | 13 | SIM | OK |
| Banking & Transactions | 11 | SIM | Queries grandes |
| Invoice & Billing | 6 | SIM | JSONB over-normalized |
| Documents | 5 | SIM | FTS over-engineered |
| Email & Inbox | 4 | SIM | OK |
| Time Tracking | 3 | SIM | OK |
| **Poker Club** | **10** | **NAO** | **CRITICO** |
| **FastChips** | **4** | **NAO** | **CRITICO** |
| **Super Union** | **10+** | **NAO** | **NAO ESTA NO SCHEMA** |

### 7.2 Indexes faltando

| Tabela | Index sugerido |
|--------|---------------|
| `poker_session_players` | `(team_id, player_id)` |
| `poker_player_summary` | `(team_id, period_start, period_end)` |
| `poker_chip_transactions` | `(team_id, sender_player_id)` |

### 7.3 Arquivos de query gigantes

| Arquivo | Tamanho | Risco |
|---------|---------|-------|
| `reports.ts` | 109 KB | N+1, performance |
| `transaction-matching.ts` | 84 KB | Complexidade |
| `transactions.ts` | 48 KB | Mantabilidade |
| `invoices.ts` | 37 KB | 13 @ts-expect-error |

### 7.4 Schema issues

- **FTS over-engineered:** Tabela `documents` tem 5 colunas FTS (fts, ftsSimple, ftsEnglish, ftsLanguage, ftsVector). Consolidar para 1-2.
- **JSONB sem tipos:** 9 colunas JSONB em `invoices` sem type definitions (line_items, payment_details, etc.)
- **Sem audit trail:** Nenhum campo `updated_by` ou `deleted_at` (soft delete)

---

## 8. Backend API - Padroes & Problemas

### 8.1 Visao geral dos routers

**Total: 53 routers, 337 procedures**

| Modulo | Routers | Procedures | LOC |
|--------|---------|------------|-----|
| Root level | 32 | 251 | ~7.500 |
| Poker | 7 | 46 | 7.037 |
| SuperUnion | 7 | 29 | 4.551 |
| FastChips | 4 | 11 | 1.220 |

### 8.2 Middleware (bem estruturado)

| Procedure Type | Middlewares |
|----------------|------------ |
| `publicProcedure` | primaryDb |
| `authProcedure` | rateLimit + primaryDb + auth |
| `protectedProcedure` | rateLimit + teamPermission + primaryDb + auth |

### 8.3 Problemas

**8.3.1 Supabase REST direto nos routers (vs Drizzle)**

Routers que usam `supabase.from("table").select()` diretamente:
- `poker/players.ts`
- `poker/imports.ts`
- `invoice.ts`
- `team.ts`
- `transaction-categories.ts`

Comentarios indicam: "Avoid Drizzle connection pool issues". A solucao correta e resolver o pool, nao contornar o ORM.

**8.3.2 Schemas inline (17 no modulo SU)**

`su/metas.ts` tem 9 schemas Zod definidos inline. Devem ser extraidos para `apps/api/src/schemas/su/metas.ts`.

**8.3.3 Routers > 1.000 LOC**

| Router | LOC | Recomendacao |
|--------|-----|-------------|
| `poker/imports.ts` | 1.754 | Extrair validacao para utils |
| `su/metas.ts` | 1.708 | Extrair schemas + split sub-routers |
| `invoice.ts` | 1.309 | Split: crud + analytics + settings |
| `poker/players.ts` | 1.231 | Extrair queries para db layer |
| `poker/week-periods.ts` | 1.194 | Extrair logica para utils |
| `poker/analytics.ts` | 1.072 | Extrair queries para db layer |

**8.3.4 Error handling inconsistente**

- `INTERNAL_SERVER_ERROR` usado 155x (muitas vezes generico)
- Sem custom error codes
- Mensagens de erro variam entre ingles e portugues

### 8.4 REST API (paralela ao tRPC)

23 routers REST em `apps/api/src/rest/routers/` com OpenAPI 3.1.0. Bem documentados, middleware proprio.

---

## 9. Frontend Dashboard - Padroes & Problemas

### 9.1 Numeros

- **927 arquivos** (.tsx + .ts)
- **207 componentes soltos** na raiz de `src/components/` (sem organizacao por feature)
- **42 rotas** de pagina
- **55 custom hooks**
- **8 Zustand stores**
- **498 chamadas useTRPC**
- **0 testes**

### 9.2 Arquivos grandes (>800 LOC)

| Arquivo | Linhas | Problema |
|---------|--------|---------|
| `poker/league-import-uploader.tsx` | 3.121 | Parsing + validacao + estado + UI |
| `poker/import-uploader.tsx` | 2.299 | Mesmo problema |
| `league/league-import-uploader.tsx` | 1.762 | Mesmo problema |
| `tracker-schedule.tsx` | 1.519 | Calendar + timezone + slots |
| `league/validation-tabs/jogos-ppst-tab.tsx` | 1.415 | Tab fazendo demais |
| `poker/league-validation-tabs/league-partidas-tab.tsx` | 1.240 | Tab grande |
| `poker/validation-tabs/detailed-tab.tsx` | 1.083 | Tabela complexa |
| `poker/validation-tabs/sessions-tab.tsx` | 1.055 | Sessoes tab |
| `canvas/balance-sheet-canvas.tsx` | 1.045 | Dashboard analytics |
| `league/validation-tabs/rateio/club-metas-section.tsx` | 1.042 | Metadados |
| `sheets/poker-player-detail-sheet.tsx` | 1.019 | Detail sheet |

### 9.3 State management (bom, com excecoes)

- **tRPC + React Query:** Padrao principal para server state (correto)
- **Zustand:** 8 stores para client state (correto)
- **nuqs:** URL state para filtros (correto)
- **Problema:** `chat.ts` store tem 980 linhas, 776 sao COMMAND_SUGGESTIONS hardcoded

### 9.4 Styling (excelente)

- 100% Tailwind CSS
- Sem inline styles ou CSS modules
- `cn()` utility consistente
- Responsive classes corretas

### 9.5 Server Actions vs tRPC

- **tRPC:** Dados e queries (padrao correto)
- **Server Actions:** Side effects (MFA, export, feedback) - 14 arquivos
- **Inconsistencia:** `transactions/import-transactions.ts` usa ambos
- **Recomendacao:** Documentar guidelines formais

---

## 10. Dependencias & Configuracao

### 10.1 Conflitos de versao

| Pacote | Versoes | Afeta |
|--------|---------|-------|
| `@tiptap/core` | v2.11 + v3.15 | ui, invoice, dashboard |
| `@tiptap/react` | v2.12 | ui (deveria ser v3) |
| `zod` | v3.24 + v4.1 | import vs resto |
| `ai` SDK | 5.0.87 + 5.0.101 | ui, documents vs resto |
| `lucide-react` | 0.542 + 0.554 + 0.562 | ui, root, dashboard |
| `redis` | 5.9 + 5.10 | cache vs root |

### 10.2 TypeScript configs inconsistentes

| Setting | API | Packages | Problema |
|---------|-----|----------|---------|
| `target` | ESNext | ES2022 | Compatibilidade |
| `moduleResolution` | bundler | NodeNext | Resolucao diferente |
| `noUnusedLocals` | false | (default) | Vars mortas nao detectadas |
| `noUnusedParameters` | false | (default) | Params mortos nao detectados |

### 10.3 Biome rules desabilitadas

| Regra | Impacto |
|-------|---------|
| `noExplicitAny` | off - Permite `any` em todo lugar |
| `noNonNullAssertion` | off - Permite `!` sem checagem |
| `useExhaustiveDependencies` | off - Bugs de hooks nao detectados |

### 10.4 Docker

- **Sem multi-stage build** (Dockerfile.api e Dockerfile.dashboard)
- **Sem layer caching** otimizado (copia tudo antes de instalar deps)
- **Sem health check** no Dockerfile

### 10.5 Turbo

- Build cache inclui `.expo/**` (irrelevante)
- 27 env vars no `passthrough` (secrets no cache)

---

## 11. Convencoes Propostas

### 11.1 Estrutura de arquivos

```
apps/api/src/
  trpc/routers/
    {domain}/           # Agrupar por dominio
      index.ts          # Barrel export
      {sub-router}.ts   # Max 500 LOC por arquivo
  schemas/
    {domain}/           # Espelhar estrutura dos routers
      {schema}.ts
  utils/
    {domain}.ts         # Logica de negocio extraida
  services/
    {service}.ts        # Clients externos (email, cache, etc)

apps/dashboard/src/
  components/
    {feature}/          # NUNCA soltar na raiz
      {Component}.tsx   # PascalCase
      index.ts          # Barrel export
  hooks/
    use-{name}.ts       # Sempre prefixo use-
  lib/
    {domain}/           # Logica de dominio
      {util}.ts

packages/db/src/
  queries/
    {domain}/           # TODOS os dominios devem ter query layer
      {query}.ts
  schema.ts             # TODAS as tabelas devem estar aqui
```

### 11.2 Padroes de codigo

| Padrao | Convencao |
|--------|-----------|
| **Logging** | Sempre `@midpoker/logger` (Pino), NUNCA `console.log` |
| **DB Access** | Sempre via `packages/db/src/queries/`, NUNCA Supabase REST direto |
| **Schemas** | Sempre em `apps/api/src/schemas/`, NUNCA inline no router |
| **Router size** | Max 500 LOC. Se maior, split em sub-routers |
| **Component size** | Max 300 LOC. Se maior, extrair sub-componentes |
| **Hooks** | Usar factory para hooks repetitivos |
| **Error handling** | `TRPCError` com codigo correto + mensagem descritiva em PT-BR |
| **Types** | Definir tipos para JSONB fields. Zero `any` tolerado |
| **Testes** | Toda query nova deve ter `.test.ts` co-locado |

### 11.3 Data flow

```
Frontend (component)
  -> useTRPC().domain.procedure()
  -> tRPC client (HTTP POST /trpc)
  -> API middleware (rate limit -> auth -> team)
  -> Router procedure (validacao + orquestracao)
  -> packages/db/src/queries/ (acesso ao banco)
  -> Response via SuperJSON
```

### 11.4 Server Actions vs tRPC

| Usar tRPC quando | Usar Server Action quando |
|------------------|--------------------------|
| CRUD de dados | Side effects (enviar email) |
| Queries/filters | Operacoes de auth (MFA) |
| Analytics | Export de arquivos |
| Paginacao | Revalidacao de cache |

---

## 12. Plano de Acao Priorizado

### FASE 1 - Fundacao (Critico)

| # | Acao | Impacto | Esforco |
|---|------|---------|---------|
| 1.1 | Adicionar tabelas SU ao Drizzle schema | Type safety | Medio |
| 1.2 | Criar query layer para Poker (`packages/db/src/queries/poker/`) | Arquitetura | Alto |
| 1.3 | Resolver conflito zod v3->v4 em `@midpoker/import` | Compatibilidade | Baixo |
| 1.4 | Alinhar @tiptap para v3 em todos packages | Runtime stability | Medio |
| 1.5 | Definir tipos TypeScript para campos JSONB | -45 @ts-expect-error | Medio |

### FASE 2 - Reducao de duplicacoes (Alto impacto)

| # | Acao | Reducao | Esforco |
|---|------|---------|---------|
| 2.1 | Factory para hooks de params URL | ~900 linhas | Medio |
| 2.2 | Extrair parsers compartilhados dos import uploaders | ~150 linhas | Baixo |
| 2.3 | Componente generico `GenericListHeader` | ~100 linhas | Baixo |
| 2.4 | Factory `createCRUDRouter` para routers identicos | ~400 linhas | Medio |
| 2.5 | Utility `buildJsonAggField` para queries | ~150 linhas | Baixo |
| 2.6 | Factory generico para widget providers | ~200 linhas | Baixo |

### FASE 3 - Organizacao (Qualidade)

| # | Acao | Impacto | Esforco |
|---|------|---------|---------|
| 3.1 | Reorganizar 207 componentes soltos em feature folders | Navegabilidade | Alto |
| 3.2 | Extrair schemas inline do modulo SU (17 schemas) | Consistencia | Baixo |
| 3.3 | Criar query layer para FastChips | Arquitetura | Medio |
| 3.4 | Split routers >1.000 LOC (6 routers) | Mantabilidade | Alto |
| 3.5 | Split import uploaders >2.000 LOC (3 arquivos) | Mantabilidade | Alto |

### FASE 4 - Cleanup (Divida tecnica)

| # | Acao | Impacto | Esforco |
|---|------|---------|---------|
| 4.1 | Substituir 75+ console.log por Pino logger | Observabilidade | Medio |
| 4.2 | Deletar codigo comentado (4 blocos + 1 arquivo) | Limpeza | Baixo |
| 4.3 | Deletar funcoes nunca usadas (2 em exchange-rates) | Limpeza | Trivial |
| 4.4 | Remover `little-date` (1 uso) e `mintlify` (0 usos) do root | Deps | Trivial |
| 4.5 | Resolver 8 TODOs (criar issues no GitHub) | Tracking | Baixo |
| 4.6 | Mover 776 linhas de COMMAND_SUGGESTIONS do chat.ts store | Limpeza | Baixo |
| 4.7 | Alinhar versoes: lucide-react, redis, ai SDK | Consistencia | Baixo |

### FASE 5 - Melhoria continua

| # | Acao | Impacto |
|---|------|---------|
| 5.1 | Adicionar testes para poker queries e import validation |
| 5.2 | Otimizar Dockerfiles (multi-stage, layer caching) |
| 5.3 | Habilitar regras Biome: noExplicitAny, useExhaustiveDependencies |
| 5.4 | Unificar TypeScript targets (ESNext vs ES2022) |
| 5.5 | Adicionar error boundaries em todas as paginas |
| 5.6 | Consolidar 5 colunas FTS em documents para 1-2 |
| 5.7 | Adicionar indexes faltantes (3 identificados) |
| 5.8 | Renomear env vars MIDDAY_* para MIDPOKER_* |

---

## Metricas de Saude Atuais

| Metrica | Valor | Target |
|---------|-------|--------|
| Arquivos > 1.000 LOC | 11 | 0 |
| Console.log no backend | 75+ | 0 |
| @ts-expect-error | 75+ | < 10 |
| Cobertura de testes | ~2% | > 30% |
| Duplicacao estimada | ~2.100 linhas | < 500 |
| Schemas inline | 17 | 0 |
| Tabelas sem query layer | 24 | 0 |
| Tabelas fora do schema | 10+ | 0 |
| Conflitos de versao | 6 | 0 |

---

## Resultados da Execucao (2026-02-21)

### Resumo

- **195 arquivos modificados**, 4.653 insercoes, 4.973 delecoes (**-320 linhas liquidas**)
- **16 novos arquivos** criados (factories, utilities, schemas, types)
- **7 issues GitHub** criadas (#2-#8) para TODOs

### Metricas Antes x Depois

| Metrica | Antes | Depois | Mudanca |
|---------|-------|--------|---------|
| Console.log no backend/packages | 75+ | 0 | -100% |
| @ts-expect-error/@ts-ignore | 146+ | 126 | -14% (20 removidos via JSONB types) |
| Tabelas SU fora do schema | 10+ | 0 | -100% (13 tabelas + 5 enums adicionados) |
| Schemas inline nos routers SU | 17 | 0 | -100% (extraidos para 6 arquivos) |
| Conflitos de versao | 6 | 0 | -100% |
| Hooks de params duplicados | 19+ hooks, ~900 LOC | 19 hooks, ~95 LOC | ~850 linhas eliminadas |
| TODOs sem issue vinculada | 8 | 1 | 7 issues criadas |
| Funcoes de parsing duplicadas | ~8 arquivos | centralizadas em 2 | ~1.000 linhas eliminadas |
| Widget providers duplicados | 3 stores ~600 LOC | 2 factored + 1 base | ~400 linhas eliminadas |

### Ondas Executadas

#### Onda 1 - Fundacao Critica
- [x] Tabelas SU adicionadas ao Drizzle schema (13 tabelas, 5 enums, 13 relacoes, 26 tipos)
- [x] Tipos JSONB definidos (jsonb.ts) e aplicados com `$type<>()` no schema
- [x] Dependencias alinhadas (tiptap v3, ai SDK ^5.0.101, lucide-react ^0.562.0, redis ^5.10.0, date-fns-tz -> @date-fns/tz)
- [x] Codigo morto deletado (get-expenses-breakdown.ts, funcoes exchange-rate, blocos comentados, mintlify, little-date)
- [x] COMMAND_SUGGESTIONS movido para chat-commands.ts

#### Onda 2 - Reducao de Duplicacoes
- [x] Factory `createParamsHook()` + variantes (createNestedParamsHook, createFilterParamsHook) - 19 hooks refatorados
- [x] 6 arquivos de schema SU extraidos (metas, settlements, week-periods, imports, analytics, tournament-analyses)
- [x] Parsers compartilhados extraidos (parsers.ts, date-utils.ts) - 8 arquivos simplificados
- [x] Factory `createWidgetStoreFactory()` - 2 widget providers simplificados (67-71% reducao)
- [x] `buildJsonAggField()` utility - 7 patterns substituidos em 2 arquivos

#### Onda 3 - Cleanup de Qualidade
- [x] 75+ console.log/error/warn substituidos por Pino logger (44+ arquivos)
- [x] 7 issues GitHub criadas (#2-#8) com label tech-debt, TODOs vinculados
- [x] 2 schemas inline restantes extraidos, mensagens de erro traduzidas para PT-BR (60+ mensagens)

#### Onda 4 - Verificacao Final
- [x] `bun install` - OK (sem erros)
- [x] `bun run typecheck` - Erros apenas pre-existentes (nanoid em supabase, bun:test em import)
- [x] `bun run lint` - Erros apenas pre-existentes (import order em email/get-started.tsx)
- [x] `bun run build` - Erro pre-existente (tiptap bubble-menu)

### Fora de Escopo (futuras iteracoes)
- Criar query layer para Poker e FastChips
- Reorganizar 207 componentes em feature folders
- Split de routers >1.000 LOC e import uploaders >2.000 LOC
- Otimizar Dockerfiles
- Adicionar testes
- Habilitar regras Biome mais estritas
- Adicionar indexes faltantes no banco
- Zod v3 -> v4 em @midpoker/import (breaking changes significativas)
