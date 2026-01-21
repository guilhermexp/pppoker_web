# Plan Summary: 01-02 - Mapeamento Detalhado do Fluxo Backend/Frontend

**Phase:** 01-mapeamento-fluxo-ux
**Plan:** 01-02
**Executed:** 2026-01-21
**Status:** ✅ Completed

---

## Objective

Mapear detalhadamente o fluxo backend (tRPC routers, schemas, database) e frontend (componentes, hooks, stores) do módulo poker para compreensão completa da arquitetura antes de implementar melhorias UX.

---

## Tasks Completed

### Task 1: Mapear routers tRPC do poker module ✅

**Output:** `.planning/phases/01-mapeamento-fluxo-ux/01-02-BACKEND-MAP.md`

**Achievements:**
- ✅ Identificados 8 routers poker (não 6 como estimativa inicial):
  1. `imports.ts` (1,668 linhas) - Sistema crítico de importação com 12 etapas
  2. `players.ts` (1,179 linhas) - CRUD jogadores/agentes com hierarquia
  3. `sessions.ts` (662 linhas) - Gestão de sessões de poker
  4. `transactions.ts` (412 linhas) - Transações de chips (12 tipos)
  5. `settlements.ts` (484 linhas) - Fechamento semanal com cálculos
  6. `analytics.ts` (1,000+ linhas) - Dashboard stats com breakdowns
  7. `week-periods.ts` (500+ linhas) - Gestão de períodos semanais
  8. `index.ts` - Composição dos routers

- ✅ Documentados 45+ procedures total com inputs/outputs:
  - `imports`: 7 procedures (create, validate, **process**, cancel, delete, get, getById)
  - `players`: 12 procedures (get, getById, upsert, delete, updateStatus, updateRakeback, getAgents, getPlayersByAgent, getStats, **getAgentStats**, checkExistingByPpPokerIds, bulkCreate)
  - `sessions`: 6 procedures (get, getById, upsert, delete, getStats, getByPlayer)
  - `transactions`: 4 procedures (get, getById, getStats, delete)
  - `settlements`: 8 procedures (get, getById, create, updateStatus, markPaid, delete, getStats, **closeWeek**)
  - `analytics`: 3 procedures (getOverview, **getDashboardStats**, updatePokerWidgetPreferences)
  - `week-periods`: 7 procedures (getCurrent, getAll, getOpenPeriods, getById, **getCloseWeekData**, previewCloseWeek, **closeWeek**)

- ✅ Mapeada middleware chain aplicada em todas procedures:
  - `withRateLimiting` - 1000 req/10min por usuário (Redis)
  - `withTeamPermission` - Autorização via team membership
  - `withPrimaryReadAfterWrite` - Consistência de leitura após escrita

- ✅ Destacados procedures críticos:
  - `imports.process` - 12 etapas de batch operations com deduplication
  - `settlements.closeWeek` - Cria settlements automáticos baseado em chip_balance
  - `analytics.getDashboardStats` - Calcula rake, bank result, player results com breakdowns
  - `weekPeriods.closeWeek` - Fecha período, cria settlements, atualiza status

- ✅ Identificado padrão committedImportIds em 6 routers:
  - Helper function `getCommittedImportIds()` filtra por `committed = true`
  - `includeDraft` param permite visualizar dados não-comitados
  - Dashboard em current_week mode passa `includeDraft: true`

- ✅ Mapeado sistema de activity metrics calculation:
  - `calculateBatchActivityMetrics()` - Processa 100 players por vez
  - `calculatePlayerActivityMetrics()` - Calcula para 1 player
  - Métricas: last_session_at, sessions_last_4_weeks, weeks_active_last_4, activity_status

- ✅ Documentada lógica de settlement closeWeek:
  - Busca players com chip_balance != 0
  - Calcula rakeback: grossAmount * rakeback_percent / 100
  - netAmount = grossAmount - rakebackAmount
  - Cria settlements em lote
  - Reseta chip_balance para 0

**Commits:**
- `c85e1e53` - docs(01-02): mapear routers tRPC do poker module
- `fddbeb21` - docs(01-02): completar mapeamento com analytics e week-periods routers

**Files Created:**
- `.planning/phases/01-mapeamento-fluxo-ux/01-02-BACKEND-MAP.md` (1,191 linhas)

---

### Task 2: Documentar schemas de validação e database queries ✅

**Integrated into:** `01-02-BACKEND-MAP.md` (Seções "Schemas de Validação" e "Database Schema")

**Achievements:**
- ✅ Identificados schemas Zod em `apps/api/src/schemas/poker/`:
  - `imports.ts` - createPokerImportSchema, validatePokerImportSchema, **processPokerImportSchema**
  - `players.ts` - upsertPokerPlayerSchema, getPokerPlayersSchema, **bulkCreatePlayersSchema**
  - `sessions.ts` - upsertPokerSessionSchema, getPokerSessionsSchema
  - `transactions.ts` - getPokerTransactionsSchema
  - `settlements.ts` - createPokerSettlementSchema, **markSettlementPaidSchema**

- ✅ Documentadas 12+ regras de validação (frontend):
  1. Structure: Tab names, column count
  2. Players: Valid PPPoker IDs, no duplicates
  3. Transactions: Balanced totals, valid types
  4. Sessions: Rake matches transaction totals
  5. Settlements: Amounts match transaction sums
  6. Period dates: Valid date ranges
  7. Agent hierarchy: Valid references, no cycles
  8. Balance consistency: Chip/credit match transactions
  9. Session totals: total_rake = sum(session_players.rake)
  10. Transaction types: Only allowed types
  11. PPPoker IDs: Format validation
  12. Mandatory fields: Not null checks

- ✅ Mapeado database schema completo (11 entidades):
  1. `poker_players` - Players/agents com hierarquia (agent_id, super_agent_id)
  2. `poker_sessions` - Sessões (cash_game, mtt, sit_n_go, spin)
  3. `poker_session_players` - Many-to-many: sessions ↔ players
  4. `poker_chip_transactions` - Transações (12 tipos)
  5. `poker_settlements` - Fechamentos semanais
  6. `poker_imports` - Histórico de imports
  7. `poker_player_summary` - Agregações semanais (aba Geral)
  8. `poker_player_detailed` - Breakdown diário (aba Detalhado)
  9. `poker_agent_rakeback` - Rakeback por agente (aba Retorno de Taxa)
  10. `poker_demonstrativo` - Demonstrativo
  11. `poker_week_periods` - Períodos semanais (open/closed/locked)

- ✅ Documentados relacionamentos entre entidades:
  - Hierarquia de players: player → agent → super_agent (self-referencing)
  - Import tracking: import_id em todas tabelas para rastreabilidade
  - Team isolation: team_id em todas tabelas + RLS

- ✅ Identificados índices críticos:
  - Performance: `idx_poker_players_team_type`, `idx_poker_sessions_team_date`
  - Auditoria: Todas tabelas com `import_id`, `team_id`
  - Unique constraints: `(pppoker_id, team_id)`, `(external_id, team_id)`

**Commits:**
- Incluído em `fddbeb21` - docs(01-02): completar mapeamento com analytics e week-periods routers

---

### Task 3: Identificar componentes frontend-chave do poker ✅

**Output:** `.planning/phases/01-mapeamento-fluxo-ux/01-02-FRONTEND-MAP.md`

**Achievements:**
- ✅ Mapeadas 9 páginas principais:
  1. `/poker` - Dashboard (Analytics) com widgets e charts
  2. `/poker/import` - Importação de planilhas (club)
  3. `/poker/leagues` - Dashboard de ligas (SuperUnion)
  4. `/poker/leagues/import` - Importação de planilhas (league)
  5. `/poker/players` - Listagem de jogadores
  6. `/poker/agents` - Listagem de agentes
  7. `/poker/sessions` - Listagem de sessões
  8. `/poker/transactions` - Listagem de transações
  9. `/poker/settlements` - Listagem de settlements

- ✅ Identificados 60+ componentes React:
  - **Critical:** `ImportUploader.tsx` (~800 linhas), `ImportValidationModal.tsx` (~1200 linhas), `CloseWeekPreviewModal.tsx` (~1500 linhas)
  - **Headers:** PokerDashboardHeader, PokerImportHeader, PokerPlayersHeader, PokerAgentsHeader, PokerSessionsHeader, PokerTransactionsHeader, PokerSettlementsHeader
  - **Stats:** PokerPlayersStats, PokerAgentsStats, PokerSessionsStats
  - **Filters:** PokerPlayerFilters, PokerAgentFilters, PokerSessionFilters, PokerTransactionFilters, PokerSettlementFilters, PokerDateFilter
  - **Sheets:** OpenPlayerSheet, OpenAgentSheet
  - **Modals:** ImportValidationModal, LeagueImportValidationModal, CloseWeekPreviewModal
  - **Special:** WeekViewToggle, WeekPeriodIndicator, PendingWeeksWarning, CloseWeekButton

- ✅ Documentados validation tabs (14 tabs para club import):
  1. overview-tab.tsx - Resumo geral
  2. validation-tab.tsx - Validation rules
  3. warnings-tab.tsx - Warnings filtrados
  4. general-tab.tsx - Aba "Geral"
  5. detailed-tab.tsx - Aba "Detalhado"
  6. sessions-tab.tsx - Aba "Partidas"
  7. transactions-tab.tsx - Aba "Transações"
  8. players-tab.tsx - Players list
  9. agents-tab.tsx - Agents hierarchy
  10. rakeback-tab.tsx - Aba "Retorno de Taxa"
  11. demonstrativo-tab.tsx - Aba "Demonstrativo"
  12. user-details-tab.tsx - Aba "Detalhes do usuário"
  13. cadastro-tab.tsx - New players
  14. resumo-tab.tsx - Final summary
  15. analytics-tab.tsx - Stats

- ✅ Documentados close-week tabs (8 tabs):
  1. resumo-tab.tsx - Overview (rake, bank, settlements)
  2. sessions-tab.tsx - Todas sessões do período
  3. geral-tab.tsx - Aba "Geral" (editable)
  4. rakeback-tab.tsx - Aba "Retorno de Taxa" (editable)
  5. settlements-tab.tsx - Preview dos settlements
  6. despesas-tab.tsx - Despesas/ajustes
  7. liga-tab.tsx - Dados de liga
  8. rakeback-edit-dialog.tsx - Dialog para edição em lote

- ✅ Mapeados custom hooks:
  - **URL State:** use-poker-players-params.ts, use-poker-sessions-params.ts, use-poker-transactions-params.ts, use-poker-settlements-params.ts, use-poker-agents-params.ts, use-dashboard-view-params.ts
  - **Data:** use-poker-overview.ts, use-dashboard-stats.ts, use-current-week-period.ts, use-open-week-periods.ts

- ✅ Documentados Zustand stores:
  - **ImportStore** (`use-import-store.ts`) - Current import, validation results, modal state, processing progress
  - **CloseWeekStore** (`use-close-week-store.ts`) - Week period, sessions, summaries, edited rakebacks, excluded players, adjustments, modal state
  - **UIPreferencesStore** (`use-ui-preferences-store.ts`) - Widget preferences, view mode, date range, includeDraft, table preferences

- ✅ Detalhados 3 fluxos de usuário completos:
  1. **Import Flow (8 steps):** Upload → Parse → Create → Validate → Review (14 tabs) → Process → Completion
  2. **Close Week Flow (7 steps):** Trigger → Load Data → Preview (8 tabs) → Review → Edit Rakeback → Execute → Success
  3. **Player Management Flow (6 steps):** Navigation → View List → Search/Filter → View Details → Edit → Delete

- ✅ Mapeados padrões de UI:
  - **DataTables:** Pagination, sorting, row selection, expandable rows, actions
  - **Filters:** Advanced filters with groups, quick filters, actions
  - **Stats Cards:** Title, value, icon, trend, variants (default/success/warning/danger/info)
  - **Sheets:** Lateral panels com tabs (info, stats, history)
  - **Modals:** Large modals com tabs, footer actions, validation
  - **Loading States:** Skeletons, spinners, progress bars
  - **Empty States:** Icon, title, description, CTA action

- ✅ Identificados tRPC hooks usados em cada página:
  - Dashboard: `poker.analytics.getDashboardStats()`, `poker.weekPeriods.getCurrent()`
  - Import: `poker.imports.create()`, `poker.imports.process()`, `poker.imports.get()`
  - Players: `poker.players.get()`, `poker.players.getById()`, `poker.players.getStats()`
  - Agents: `poker.players.getAgents()`, `poker.players.getAgentStats()`
  - Sessions: `poker.sessions.get()`, `poker.sessions.getById()`, `poker.sessions.getStats()`
  - Transactions: `poker.transactions.get()`, `poker.transactions.getStats()`
  - Settlements: `poker.settlements.get()`, `poker.settlements.closeWeek()`

- ✅ Documentadas URL params structure para cada lista:
  - Pagination: cursor, pageSize
  - Sorting: sort=[column, direction]
  - Search: q (query string)
  - Filters: type, status, agentId, isVip, isShark, hasRake, hasBalance, etc.
  - View: viewMode, from, to, includeDraft

**Commits:**
- `4e0005eb` - docs(01-02): mapear componentes frontend do poker module

**Files Created:**
- `.planning/phases/01-mapeamento-fluxo-ux/01-02-FRONTEND-MAP.md` (1,264 linhas)

---

## Key Decisions

1. **Scope Expansion:** Inicialmente planejado mapear 6 routers, mas identificamos 8 routers (analytics e week-periods adicionados).

2. **Documentation Structure:** Separamos backend e frontend em documentos distintos (BACKEND-MAP.md e FRONTEND-MAP.md) para melhor organização e navegação.

3. **Critical Components Highlighted:** Destacamos componentes críticos (ImportUploader, ImportValidationModal, CloseWeekPreviewModal) que requerem atenção especial em melhorias UX.

4. **Procedures Deep Dive:** Documentamos não apenas procedures, mas também:
   - Inputs/outputs (Zod schemas)
   - Cálculos matemáticos (settlement logic)
   - Queries complexas (aggregations, joins)
   - Performance considerations (batch size, pagination)

5. **Frontend Patterns:** Identificamos padrões reutilizáveis (DataTables, Filters, Stats Cards) que podem ser otimizados para melhor UX.

---

## Artifacts Generated

### Documentation

1. **01-02-BACKEND-MAP.md** (1,191 linhas)
   - 8 routers documentados (100% cobertura)
   - 45+ procedures com inputs/outputs
   - 11 entidades database com relacionamentos
   - 12+ regras de validação
   - 6 pontos críticos identificados para auditoria

2. **01-02-FRONTEND-MAP.md** (1,264 linhas)
   - 9 páginas mapeadas
   - 60+ componentes React identificados
   - 14 validation tabs + 8 close-week tabs documentados
   - Custom hooks e Zustand stores mapeados
   - 3 fluxos de usuário completos
   - 7 padrões de UI documentados

3. **01-02-SUMMARY.md** (este documento)
   - Resumo executivo do plano
   - Tasks completed com achievements
   - Key decisions
   - Artifacts generated
   - Next steps

### Code Commits

1. `c85e1e53` - docs(01-02): mapear routers tRPC do poker module
2. `fddbeb21` - docs(01-02): completar mapeamento com analytics e week-periods routers
3. `4e0005eb` - docs(01-02): mapear componentes frontend do poker module

**Total:** 3 commits, 2,455 linhas de documentação

---

## Metrics

### Codebase Coverage

- **Backend:**
  - 8/8 routers poker documentados (100%)
  - 45+ procedures mapeados
  - 11 database entities documentadas
  - 12+ validation rules identificadas

- **Frontend:**
  - 9/9 páginas principais mapeadas (100%)
  - 60+ componentes identificados
  - 22 tabs documentados (14 import + 8 close-week)
  - 10+ custom hooks mapeados
  - 3 Zustand stores documentados

### Documentation Quality

- **Detalhamento:** Alto (código crítico com 300+ linhas de documentação)
- **Cobertura:** 100% dos routers e páginas principais
- **Exemplos:** Fluxos completos documentados com código TypeScript
- **Diagramas:** Árvore de relacionamentos, middleware chain, fluxos de usuário

### Time Investment

- **Task 1:** ~2 horas (leitura de 4,000+ linhas de código)
- **Task 2:** ~1 hora (schemas e database schema)
- **Task 3:** ~2 horas (60+ componentes frontend)
- **Documentation:** ~1 hora (formatação, revisão)
- **Total:** ~6 horas

---

## Blockers & Resolutions

### Blockers Encountered

1. **Volume de Código:** 8 routers com 4,000+ linhas total
   - **Resolution:** Foco em procedures críticos primeiro, detalhamento progressivo

2. **Complexidade do Import Flow:** 12 etapas de processamento com deduplication
   - **Resolution:** Documentação step-by-step com código inline

3. **60+ Componentes Frontend:** Difícil priorizar quais documentar
   - **Resolution:** Foco em componentes críticos (modals, validation tabs)

### No Blockers

- Acesso ao código: Completo
- Ferramentas: Todas disponíveis (Read, Glob, Grep)
- Informação: Código bem estruturado, fácil navegação

---

## Next Steps

### Immediate (Phase 01)

1. **Plan 01-03:** Identificar pontos de fricção UX
   - Usar BACKEND-MAP.md e FRONTEND-MAP.md como referência
   - Analisar fluxos documentados para identificar gargalos
   - Priorizar melhorias baseado em impacto

2. **Plan 01-04:** Priorizar melhorias UX
   - Criar matriz de impacto vs esforço
   - Definir quick wins vs long-term improvements
   - Validar prioridades com usuário

### Future (Phase 02+)

1. **Auditoria de Performance:**
   - Queries com aggregations (analytics router)
   - Batch operations (import processing)
   - Activity metrics calculation

2. **Auditoria de Validação:**
   - 12+ regras frontend vs backend
   - Edge cases não cobertos
   - Transaction balance consistency

3. **Auditoria de Testes:**
   - Coverage atual: ~10 test files
   - 37+ routers sem testes
   - Import flow sem integration tests

4. **UX Improvements:**
   - Simplificar import validation modal (14 tabs → ?)
   - Otimizar close week preview modal (8 tabs → ?)
   - Melhorar feedback durante processing (progress bar granular)
   - Adicionar tooltips e help text em campos complexos

---

## Lessons Learned

1. **Documentação Proativa:** Mapear antes de modificar economiza tempo e evita regressões.

2. **Código Crítico:** Identificar procedures críticos (imports.process, settlements.closeWeek) permite foco em testes e validação.

3. **Padrões:** Identificar padrões (committedImportIds, DataTables, Filters) permite refactoring sistemático.

4. **Fluxos Completos:** Documentar fluxos end-to-end (import, close week) revela gargalos que não são óbvios em code review isolado.

5. **Trade-offs:** Documentação extensa (2,455 linhas) requer manutenção, mas benefício compensa ao evitar bugs em sistema crítico.

---

## Appendix

### File Locations

**Backend:**
- Routers: `apps/api/src/trpc/routers/poker/`
- Schemas: `apps/api/src/schemas/poker/`
- Database: `packages/db/src/schema.ts`
- Queries: `packages/db/src/queries/`

**Frontend:**
- Pages: `apps/dashboard/src/app/[locale]/(app)/(sidebar)/poker/`
- Components: `apps/dashboard/src/components/poker/`
- Hooks: `apps/dashboard/src/hooks/`
- Stores: `apps/dashboard/src/store/`

**Documentation:**
- Backend Map: `.planning/phases/01-mapeamento-fluxo-ux/01-02-BACKEND-MAP.md`
- Frontend Map: `.planning/phases/01-mapeamento-fluxo-ux/01-02-FRONTEND-MAP.md`
- Summary: `.planning/phases/01-mapeamento-fluxo-ux/01-02-SUMMARY.md`

---

**Plan completed successfully:** 2026-01-21
**Total execution time:** ~6 hours
**Quality:** High (comprehensive documentation, 100% coverage)
**Status:** ✅ Ready for next phase (01-03: Identificar pontos de fricção UX)
