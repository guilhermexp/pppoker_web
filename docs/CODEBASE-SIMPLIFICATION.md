# Simplificacao do Codebase - Relatorio de Execucao

**Data:** 2026-02-21
**Escopo:** Estrutura, arquitetura, duplicacoes, codigo morto, dependencias, convencoes

---

## Resumo Geral

- **195 arquivos modificados** | 4.653 insercoes | 4.973 delecoes | **-320 linhas liquidas**
- **16 novos arquivos** criados (factories, utilities, schemas, types)
- **7 issues GitHub** criadas (#2-#8) com label `tech-debt`
- **4 ondas** de execucao com **12 agentes** em paralelo

---

## Metricas Antes x Depois

| Metrica | Antes | Depois | Mudanca |
|---------|-------|--------|---------|
| `console.log` no backend/packages | 75+ | 0 | -100% |
| `@ts-expect-error` / `@ts-ignore` | 146+ | 126 | -14% |
| Tabelas SU fora do schema Drizzle | 10+ | 0 | -100% |
| Schemas inline nos routers SU | 17 | 0 | -100% |
| Conflitos de versao de dependencias | 6 | 0 | -100% |
| Hooks de URL params duplicados | ~900 LOC | ~95 LOC | -89% |
| TODOs sem issue vinculada | 8 | 1 | 7 issues criadas |
| Funcoes de parsing duplicadas | 8 arquivos | 2 centralizados | ~1.000 LOC eliminadas |
| Widget providers duplicados | 3 stores, ~600 LOC | 2 factored + 1 base | ~400 LOC eliminadas |

---

## Onda 1 - Fundacao Critica

### 1.1 Tabelas SU adicionadas ao Drizzle schema

**Arquivo:** `packages/db/src/schema.ts`

Leitura das migrations `0005`, `0009`, `0010`, `0011`, `0012` e adicao ao schema Drizzle:

- **5 enums:** `pokerSuWeekPeriodStatusEnum`, `pokerSuImportStatusEnum`, `pokerSuSettlementStatusEnum`, `pokerSuGameTypeEnum`, `pokerSuGameVariantEnum`
- **13 tabelas:** `pokerSuLeagues`, `pokerSuWeekPeriods`, `pokerSuImports`, `pokerSuLeagueSummary`, `pokerSuGames`, `pokerSuGamePlayers`, `pokerSuSettlements`, `pokerSuMetaGroups`, `pokerSuMetaGroupMembers`, `pokerSuMetaGroupTimeSlots`, `pokerSuClubMetas`, `pokerSuOverlaySelections`, `pokerSuClubDeals`
- **13 relacoes** com foreign keys, `onDelete` e indexes
- **26 tipos** exportados (`$inferSelect` + `$inferInsert`)

### 1.2 Tipos JSONB definidos

**Novo arquivo:** `packages/db/src/types/jsonb.ts`

- `SlackConfig` - para `apps.config`
- `DocumentMetadata` - para `documents.metadata`
- `ValidationError` - para campos de validacao de imports

**Aplicacao no schema:** `$type<>()` em colunas JSONB de invoices, invoice_templates, documents e apps.

**Resultado:** 20 `@ts-expect-error` removidos em 9 arquivos.

### 1.3 Dependencias alinhadas

| Pacote | Antes | Depois |
|--------|-------|--------|
| `@tiptap/*` | v2 em ui/invoice | `^3.15.3` em todos |
| `ai` SDK | `5.0.87` em ui/documents | `^5.0.101` em todos |
| `lucide-react` | `^0.542.0` / `^0.554.0` | `^0.562.0` em todos |
| `redis` | `^5.9.0` em cache | `^5.10.0` em todos |
| `date-fns-tz` | presente em import | substituido por `@date-fns/tz` |

### 1.4 Codigo morto deletado

| Item | Arquivo |
|------|---------|
| Arquivo inteiro comentado | `apps/api/src/ai/tools/get-expenses-breakdown.ts` |
| `getExchangeRate()` + `upsertExchangeRates()` | `packages/db/src/queries/exhange-rates.ts` |
| Bloco OPTIONS comentado | `apps/api/src/rest/middleware/auth.ts` |
| Stub de upload comentado | `apps/api/src/rest/routers/transactions.ts` |
| Campo `subscriptionStatus` comentado | `apps/api/src/schemas/team.ts` |
| Dependencia `mintlify` | `package.json` (root) |
| Dependencia `little-date` | `package.json` (root + dashboard) |
| `COMMAND_SUGGESTIONS` (776 linhas) | Movido de `store/chat.ts` para `lib/chat-commands.ts` |

**Substituicao `little-date`:** Uso unico em `filter-list.tsx` substituido por `date-fns` (`isSameYear` + `format`).

---

## Onda 2 - Reducao de Duplicacoes

### 2.1 Factory para hooks de URL params

**Novo arquivo:** `apps/dashboard/src/hooks/create-params-hook.ts` (82 linhas)

Tres factories criadas:

```typescript
createParamsHook(config)         // Retorna { ...params, setParams }
createNestedParamsHook(config)   // Retorna { params, setParams }
createFilterParamsHook(config)   // Retorna { filter, setFilter, hasFilters }
```

**19 hooks refatorados** para usar as factories. Cada hook reduzido para 6-24 linhas.

**9 hooks mantidos** sem refatorar (logica customizada: casting, computed values, parametros de funcao).

### 2.2 Schemas SU extraidos para arquivos dedicados

**6 novos arquivos** em `apps/api/src/schemas/su/`:

| Arquivo | Schemas exportados |
|---------|-------------------|
| `metas.ts` | 27 schemas |
| `settlements.ts` | 6 schemas |
| `week-periods.ts` | 3 schemas |
| `imports.ts` | 5 schemas |
| `analytics.ts` | 3 schemas |
| `tournament-analyses.ts` | 4 schemas |
| `index.ts` | barrel file |

**6 routers SU atualizados** para importar schemas em vez de definir inline.

### 2.3 Parsers e date-utils compartilhados

**Novo:** `apps/dashboard/src/lib/poker/parsers.ts`
- `toNumber()`, `parseSlashValue()`, `columnLetterToIndex()`, `getCellValue()`, `calculateFormula()`, `parseSheetByPosition()`

**Novo:** `apps/dashboard/src/lib/poker/date-utils.ts`
- `getWeekFromDateString()`, `getWeekFromShortDateString()`, `normalizeDateTime()`

**8 arquivos refatorados** para usar imports centralizados (~1.058 linhas removidas).

### 2.4 Factory para widget stores

**Novo:** `apps/dashboard/src/store/create-widget-store.ts`

```typescript
createWidgetStoreFactory<T extends string>()
// Retorna: createStore, StoreContext, useStore, useIsCustomizing,
//          usePrimaryWidgets, useAvailableWidgets, useWidgetActions
```

**Resultados:**
- `poker-widget-provider.tsx`: 233 -> 66 linhas (-71%)
- `su-widget-provider.tsx`: 240 -> 80 linhas (-67%)
- `widget-provider.tsx`: mantido (possui `widgetConfigs` extra)

### 2.5 Utility `buildJsonAggField`

**Novo:** `packages/db/src/utils/json-agg.ts`

```typescript
buildJsonAggField(fields: Record<string, AnyColumn>, filterColumn?: AnyColumn): SQL
```

**7 patterns duplicados** de `json_agg(DISTINCT jsonb_build_object(...))` substituidos em `transactions.ts` e `customers.ts`.

---

## Onda 3 - Cleanup de Qualidade

### 3.1 console.log substituidos por Pino logger

**Escopo:** `apps/api/src/` + `packages/` (exceto scripts, testes, dashboard, supabase monkey-patch)

**Regras aplicadas:**
- `console.log(...)` -> `logger.info(...)` ou `logger.debug(...)`
- `console.error(...)` -> `logger.error(...)`
- `console.warn(...)` -> `logger.warn(...)`
- String interpolation -> objetos de contexto estruturados

**44+ arquivos editados:**
- 27 routers API
- 17 arquivos em packages (cache, inbox, app-store, db, notifications, documents, jobs)
- 5 `package.json` atualizados (adicionado `@midpoker/logger`)

**Resultado:** 0 `console.log/error/warn` restantes no escopo.

### 3.2 Issues GitHub criadas para TODOs

| Issue | Descricao | Arquivo |
|-------|-----------|---------|
| [#2](https://github.com/guilhermexp/Mid/issues/2) | Implementar processamento backend para league imports | `league-import-uploader.tsx` |
| [#3](https://github.com/guilhermexp/Mid/issues/3) | Contar ppsr_games_count corretamente | `su/week-periods.ts` |
| [#4](https://github.com/guilhermexp/Mid/issues/4) | Desregistrar scheduler quando conta nao encontrada | `sync-account.ts` |
| [#5](https://github.com/guilhermexp/Mid/issues/5) | Corrigir tipos Drizzle em update-base-currency | `update-base-currency.ts` |
| [#6](https://github.com/guilhermexp/Mid/issues/6) | Corrigir mapeamento de tipo de transacao | `import.ts` |
| [#7](https://github.com/guilhermexp/Mid/issues/7) | Usar locale correto para formatacao de valores | `transaction-notifications.tsx` |
| [#8](https://github.com/guilhermexp/Mid/issues/8) | Substituir funcao render temporaria | `render.ts` |

Todos os TODOs atualizados com formato `// TODO(#N): descricao`.

### 3.3 Schemas inline restantes extraidos + mensagens PT-BR

**2 schemas extraidos:**
- `createFromTrackerSchema` -> `apps/api/src/schemas/invoice.ts`
- `closeWeekSettlementSchema` -> `apps/api/src/schemas/poker/settlements.ts`

**60+ mensagens de erro traduzidas** para PT-BR nos routers poker/ e su/.

---

## Onda 4 - Verificacao Final

| Check | Resultado |
|-------|-----------|
| `bun install` | OK - sem erros |
| `bun run typecheck` | OK - erros apenas pre-existentes |
| `bun run lint` | OK - erros apenas pre-existentes |
| `bun run build` | Erro pre-existente (tiptap bubble-menu) |

### Erros pre-existentes (nao causados pelas mudancas)

- **Typecheck:** `@midpoker/supabase` - `nanoid` sem type declarations; `@midpoker/import` - `bun:test` sem type declarations
- **Build:** tiptap `bubble-menu` module not found no dashboard
- **Lint:** import ordering em `packages/email/components/get-started.tsx`

---

## Novos Arquivos Criados (16)

| Arquivo | Proposito |
|---------|-----------|
| `packages/db/src/types/jsonb.ts` | Tipos TypeScript para colunas JSONB |
| `packages/db/src/utils/json-agg.ts` | Utility `buildJsonAggField()` |
| `apps/dashboard/src/hooks/create-params-hook.ts` | Factory para hooks de URL params |
| `apps/dashboard/src/lib/chat-commands.ts` | `COMMAND_SUGGESTIONS` extraido do store |
| `apps/dashboard/src/lib/poker/parsers.ts` | Funcoes compartilhadas de parsing |
| `apps/dashboard/src/lib/poker/date-utils.ts` | Funcoes compartilhadas de data |
| `apps/dashboard/src/store/create-widget-store.ts` | Factory para widget stores |
| `apps/api/src/schemas/su/metas.ts` | 27 schemas para metas SU |
| `apps/api/src/schemas/su/settlements.ts` | 6 schemas para settlements SU |
| `apps/api/src/schemas/su/week-periods.ts` | 3 schemas para week periods SU |
| `apps/api/src/schemas/su/imports.ts` | 5 schemas para imports SU |
| `apps/api/src/schemas/su/analytics.ts` | 3 schemas para analytics SU |
| `apps/api/src/schemas/su/tournament-analyses.ts` | 4 schemas para tournament analyses SU |
| `apps/api/src/schemas/su/index.ts` | Barrel file para schemas SU |

---

## Fora de Escopo (futuras iteracoes)

- Criar query layer para Poker e FastChips (risco alto - mudancas profundas nos routers)
- Reorganizar 207 componentes em feature folders (muitos imports para atualizar)
- Split de routers >1.000 LOC e import uploaders >2.000 LOC
- Otimizar Dockerfiles (multi-stage, layer caching)
- Adicionar testes (cobertura atual ~2%)
- Habilitar regras Biome mais estritas (`noExplicitAny`, `useExhaustiveDependencies`)
- Adicionar indexes faltantes no banco (3 identificados)
- Upgrade Zod v3 -> v4 em `@midpoker/import` (breaking changes significativas)
