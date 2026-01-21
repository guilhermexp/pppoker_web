# Frontend Map: Poker Module Dashboard

**Purpose:** Mapeamento completo do fluxo frontend do módulo poker, identificando componentes, páginas, hooks e fluxos de navegação.

**Date:** 2026-01-21

---

## Table of Contents

1. [Visão Geral](#visão-geral)
2. [Estrutura de Rotas](#estrutura-de-rotas)
3. [Componentes por Feature](#componentes-por-feature)
4. [Custom Hooks](#custom-hooks)
5. [Stores Zustand](#stores-zustand)
6. [Fluxos de Usuário](#fluxos-de-usuário)
7. [Padrões de UI](#padrões-de-ui)

---

## Visão Geral

### Tecnologias

- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **State Management:**
  - Server: React Query (via tRPC hooks)
  - Client: Zustand stores
  - URL: Custom hooks (use-*-params.ts)
- **Data Fetching:** tRPC Client (type-safe API calls)
- **Forms:** React Hook Form + Zod validation

### Arquitetura de Componentes

```
Page (Server Component)
  ↓
Layout + Providers
  ↓
Client Components (use client)
  ↓
tRPC Hooks (useTRPC().poker.*.*)
  ↓
shadcn/ui primitives
```

---

## Estrutura de Rotas

**Localização:** `apps/dashboard/src/app/[locale]/(app)/(sidebar)/poker/`

### Páginas Principais

```
/poker                          → Dashboard principal (analytics)
/poker/import                   → Importação de planilhas (club)
/poker/leagues                  → Dashboard de ligas (SuperUnion)
/poker/leagues/import           → Importação de planilhas (league)
/poker/players                  → Listagem de jogadores
/poker/agents                   → Listagem de agentes
/poker/sessions                 → Listagem de sessões
/poker/transactions             → Listagem de transações
/poker/settlements              → Listagem de settlements (fechamentos)
```

### Hierarquia de Arquivos

```
poker/
├── page.tsx                    # Dashboard (Analytics)
├── import/
│   └── page.tsx                # Club Import
├── leagues/
│   ├── page.tsx                # Leagues Dashboard
│   └── import/
│       └── page.tsx            # League Import
├── players/
│   └── page.tsx                # Players List
├── agents/
│   └── page.tsx                # Agents List
├── sessions/
│   └── page.tsx                # Sessions List
├── transactions/
│   └── page.tsx                # Transactions List
└── settlements/
    └── page.tsx                # Settlements List
```

---

## Componentes por Feature

### 1. Dashboard (Analytics)

**Página:** `/poker/page.tsx`

**Componentes principais:**

| Component | File | Purpose |
|-----------|------|---------|
| `PokerDashboardHeader` | `poker-dashboard-header.tsx` | Header com título, actions (Close Week, Import) |
| `WeekViewToggle` | `week-view-toggle.tsx` | Toggle current_week ↔ historical |
| `WeekPeriodIndicator` | `week-period-indicator.tsx` | Mostra período atual (week_start - week_end) |
| `PendingWeeksWarning` | `pending-weeks-warning.tsx` | Alert de semanas abertas (status='open') |
| `CloseWeekButton` | `close-week-button.tsx` | Botão para fechar semana |
| `CloseWeekPreviewModal` | `close-week-preview-modal.tsx` | **CRÍTICO** - Modal com tabs de preview/confirm |

**Widgets (Stats Cards):**
- Total Players (active)
- Total Agents
- Pending Settlements
- Total Chip Balance
- Total Rake (breakdown PPST/PPSR)
- Bank Result (chips/credits)
- Player Results (winners/losers)

**Charts:**
- Sessions by Type (pie chart)
- Game Variants Distribution (bar chart)
- Players by Region (map/list)
- Rake Timeline (line chart)

**tRPC Hooks usados:**
```typescript
useTRPC().poker.analytics.getDashboardStats()
useTRPC().poker.analytics.getOverview()
useTRPC().poker.weekPeriods.getCurrent()
useTRPC().poker.weekPeriods.getOpenPeriods()
```

**URL Params:**
- `viewMode` - "current_week" | "historical"
- `from` - Date ISO string
- `to` - Date ISO string
- `includeDraft` - boolean (mostra dados não-comitados)

---

### 2. Import System (CRÍTICO)

**Página:** `/poker/import/page.tsx`

**Componentes principais:**

| Component | File | Purpose | Lines |
|-----------|------|---------|-------|
| `PokerImportHeader` | `poker-import-header.tsx` | Header com breadcrumb |
| `ImportUploader` | `import-uploader.tsx` | **CRÍTICO** - Dropzone + Excel parser | ~800 |
| `ImportUploaderSkeleton` | `import-uploader-skeleton.tsx` | Loading state |
| `ImportsList` | `imports-list.tsx` | Histórico de imports com status | ~400 |
| `ImportsListSkeleton` | `imports-list-skeleton.tsx` | Loading state |
| `ImportValidationModal` | `import-validation-modal.tsx` | **CRÍTICO** - Modal com 14 tabs de validação | ~1200 |

**Validation Tabs (14 tabs):**

Located in `validation-tabs/`:

1. **overview-tab.tsx** - Resumo geral, stats, warnings count
2. **validation-tab.tsx** - Validation rules (12+), errors/warnings list
3. **warnings-tab.tsx** - Apenas warnings (filtrado)
4. **general-tab.tsx** - Aba "Geral" (player summaries)
5. **detailed-tab.tsx** - Aba "Detalhado" (daily breakdown)
6. **sessions-tab.tsx** - Aba "Partidas" (poker_sessions + session_players)
7. **transactions-tab.tsx** - Aba "Transações" (poker_chip_transactions)
8. **players-tab.tsx** - Players list com stats
9. **agents-tab.tsx** - Agents/Super agents hierarchy
10. **rakeback-tab.tsx** - Aba "Retorno de Taxa" (agent rakeback)
11. **demonstrativo-tab.tsx** - Aba "Demonstrativo"
12. **user-details-tab.tsx** - Aba "Detalhes do usuário" (club members)
13. **cadastro-tab.tsx** - New players to be created
14. **resumo-tab.tsx** - Final summary before processing
15. **analytics-tab.tsx** - Stats e breakdowns

**Import Flow:**

```
1. User uploads Excel → ImportUploader
   ↓
2. Frontend parse (exceljs) → Raw data extraction
   ↓
3. POST /trpc/poker.imports.create → Create import record (status: validating)
   ↓
4. Frontend validation (12+ rules) → Display errors/warnings
   ↓
5. User reviews tabs → ImportValidationModal (14 tabs)
   ↓
6. User clicks "Processar" → POST /trpc/poker.imports.process
   ↓
7. Backend processing (12 steps) → status: processing → completed
   ↓
8. Redirect to dashboard → New import appears in ImportsLis
```

**tRPC Hooks usados:**
```typescript
useTRPC().poker.imports.get()          // List imports with pagination
useTRPC().poker.imports.getById()      // Fetch import details + raw_data
useTRPC().poker.imports.create()       // Create import record
useTRPC().poker.imports.validate()     // Validate import data (opcional)
useTRPC().poker.imports.process()      // Process import (12 steps)
useTRPC().poker.imports.cancel()       // Cancel import
useTRPC().poker.imports.delete()       // Delete import
```

**Validation Rules (Frontend):**

Implemented in: `apps/dashboard/src/lib/poker/validation.ts`

1. Structure: Tab names, column count, mandatory fields
2. Players: Valid PPPoker IDs, no duplicates, nickname required
3. Transactions: Balanced totals (sent = redeemed), valid types
4. Sessions: Rake matches transaction totals, player count > 0
5. Settlements: Amounts match transaction sums
6. Period dates: Valid date ranges, week boundaries
7. Agent hierarchy: Valid agent/super_agent references, no cycles
8. Balance consistency: Chip/credit balances match transactions
9. Session totals: total_rake = sum(session_players.rake)
10. Transaction types: Only allowed types (credit_given, transfer_in, etc.)
11. PPPoker IDs: Format validation, length check
12. Mandatory fields: Nickname, dates, amounts not null

**Excel Parser:**

Library: `exceljs`
Location: `apps/dashboard/src/lib/poker/excel-parser.ts` (inferido)

Parses:
- Club spreadsheet (7 tabs)
- League spreadsheet (4 tabs)

Output format:
```typescript
{
  type: "club" | "league",
  periodStart: Date,
  periodEnd: Date,
  summaries: PlayerSummary[],        // Aba Geral
  detailed: PlayerDetailed[],        // Aba Detalhado
  sessions: Session[],               // Aba Partidas
  transactions: Transaction[],       // Aba Transações
  agents: AgentRakeback[],          // Aba Retorno de Taxa
  demonstrativo: Demonstrativo[],   // Aba Demonstrativo
  userDetails: UserDetail[],        // Aba Detalhes do usuário
  // League only:
  clubSummaries?: ClubSummary[],    // Aba Geral de Clube
  clubDetailed?: ClubDetailed[],    // Aba Detalhes de Clube
}
```

---

### 3. League Import System

**Página:** `/poker/leagues/import/page.tsx`

**Componentes principais:**

| Component | File | Purpose |
|-----------|------|---------|
| `LeagueImportUploader` | `league-import-uploader.tsx` | Uploader específico para leagues (4 tabs) |
| `LeagueImportValidationModal` | `league-import-validation-modal.tsx` | Modal com 8 tabs de validação para leagues |

**League Validation Tabs (8 tabs):**

Located in `league-validation-tabs/`:

1. **league-geral-da-liga-tab.tsx** - Liga summary (multi-club aggregated)
2. **league-geral-de-clube-tab.tsx** - Per-club summaries
3. **league-detalhes-de-clube-tab.tsx** - Per-club detailed breakdown
4. **league-detalhes-do-usuario-tab.tsx** - User details (cross-club)
5. **league-partidas-tab.tsx** - Sessions (all clubs)
6. **league-transacoes-tab.tsx** - Transactions (all clubs)
7. **league-retorno-de-taxa-tab.tsx** - Rakeback (all clubs)
8. **league-demonstrativo-tab.tsx** - Demonstrativo (all clubs)

**Diferenças vs Club Import:**
- Menos tabs (8 vs 14)
- Dados agregados de múltiplos clubes
- Parsing diferente (4 tabs vs 7 tabs)
- Validação extra: club_id consistency

---

### 4. Players List

**Página:** `/poker/players/page.tsx`

**Componentes principais:**

| Component | File | Purpose |
|-----------|------|---------|
| `PokerPlayersHeader` | `poker-players-header.tsx` | Header com search, actions (New Player) |
| `PokerPlayersStats` | `poker-players-stats.tsx` | Stats cards (Total, Active, VIPs, Sharks) |
| `PokerPlayerFilters` | `poker-player-filters.tsx` | Advanced filters (type, status, agent, VIP, shark, hasRake, hasBalance) |
| `PokerDateFilter` | `poker-date-filter.tsx` | Date range picker (reusável) |
| `OpenPlayerSheet` | `open-player-sheet.tsx` | Sheet lateral com detalhes do player |

**Data Table:**
- Columns: Nickname, Memo Name, Type, Status, Agent, VIP, Shark, Balance, Rake, Actions
- Pagination: Cursor-based (50 per page default)
- Sorting: Por qualquer coluna
- Actions: Edit, Delete, View Details

**tRPC Hooks usados:**
```typescript
useTRPC().poker.players.get()          // List with filters + pagination
useTRPC().poker.players.getById()      // Player details
useTRPC().poker.players.getStats()     // Overview stats
useTRPC().poker.players.upsert()       // Create/update player
useTRPC().poker.players.delete()       // Delete player
useTRPC().poker.players.updateStatus() // Update status only
useTRPC().poker.players.updateRakeback() // Update rakeback only
```

**URL Params:**
```typescript
{
  cursor: string,        // Pagination cursor
  pageSize: number,      // Default: 50
  sort: [column, dir],   // e.g., ["nickname", "asc"]
  q: string,             // Search query (nickname, memo, pppoker_id, email)
  type: "player" | "agent",
  status: "active" | "inactive" | "banned",
  agentId: UUID,
  isVip: boolean,
  isShark: boolean,
  hasCreditLimit: boolean,
  hasRake: boolean,
  hasBalance: boolean,
  hasAgent: boolean,
  includeDraft: boolean,
}
```

**OpenPlayerSheet details:**
- Player info (nickname, memo, country, phone, email)
- Agent hierarchy (agent → super_agent)
- Balances (chip, credit, agent_credit)
- Rake stats (total rake, sessions played, avg rake/session)
- Agent stats (if type=agent): managed players, total rake, commissions
- Activity metrics (last session, sessions last 4 weeks, activity status)
- Edit/Delete actions

---

### 5. Agents List

**Página:** `/poker/agents/page.tsx`

**Componentes principais:**

| Component | File | Purpose |
|-----------|------|---------|
| `PokerAgentsHeader` | `poker-agents-header.tsx` | Header com actions |
| `PokerAgentsStats` | `poker-agents-stats.tsx` | Stats: Total Agents, Total Managed Players, Total Rake, Total Commissions |
| `PokerAgentFilters` | `poker-agent-filters.tsx` | Filters: super_agent, status, rakeback range |
| `OpenAgentSheet` | `open-agent-sheet.tsx` | Sheet com agent details + managed players list |

**Data Table:**
- Columns: Nickname, Memo, Super Agent, Rakeback %, Managed Players, Total Rake, Commission, Actions
- Hierarchy view: Tree com super_agents → agents
- Pagination: 50 per page

**tRPC Hooks usados:**
```typescript
useTRPC().poker.players.getAgents()    // List only type='agent'
useTRPC().poker.players.getPlayersByAgent() // Players managed by agent
useTRPC().poker.players.getAgentStats() // Detailed agent stats with breakdown
```

**OpenAgentSheet details:**
- Agent info (nickname, memo, country, rakeback_percent)
- Super agent info (if has super_agent)
- Managed players (nested table com filters)
- Rake breakdown (PPST, PPSR, Non-PPST, Non-PPSR)
- Commission calculations
- Edit rakeback percentage action

---

### 6. Sessions List

**Página:** `/poker/sessions/page.tsx`

**Componentes principais:**

| Component | File | Purpose |
|-----------|------|---------|
| `PokerSessionsHeader` | `poker-sessions-header.tsx` | Header com actions (New Session - rare) |
| `PokerSessionsStats` | `poker-sessions-stats.tsx` | Stats: Total Sessions, Total Rake, Total Buy-in, Unique Players |
| `PokerSessionFilters` | `poker-session-filters.tsx` | Filters: sessionType, gameVariant, dateRange |

**Data Table:**
- Columns: External ID, Table Name, Type, Variant, Date, Blinds, Players, Rake, Actions
- Expandable rows: Show session_players inline
- Pagination: 50 per page

**Session Details (Expandable):**
- Session info (date, duration, hands played)
- Session players table:
  - Columns: Nickname, Ranking, Buy-in, Cash-out, Winnings, Rake
  - Totals row
- Buy-in/Cash-out/Rake calculations

**tRPC Hooks usados:**
```typescript
useTRPC().poker.sessions.get()         // List with filters
useTRPC().poker.sessions.getById()     // Session + session_players
useTRPC().poker.sessions.getStats()    // Overview stats
useTRPC().poker.sessions.getByPlayer() // Sessions for specific player
```

---

### 7. Transactions List

**Página:** `/poker/transactions/page.tsx`

**Componentes principais:**

| Component | File | Purpose |
|-----------|------|---------|
| `PokerTransactionsHeader` | `poker-transactions-header.tsx` | Header |
| `PokerTransactionFilters` | `poker-transaction-filters.tsx` | Filters: type, playerId, sessionId, dateRange, amountRange |

**Data Table:**
- Columns: Date, Type, Sender, Recipient, Session, Credit, Chips, Amount, Actions
- Color coding: Positive (green), Negative (red)
- Pagination: 50 per page

**Transaction Types (12):**
1. `credit_given` - Crédito dado
2. `credit_redeemed` - Crédito resgatado
3. `credit_left_club` - Crédito saiu do clube
4. `chips_sent` - Fichas enviadas
5. `chips_redeemed` - Fichas resgatadas
6. `chips_left_club` - Fichas saíram do clube
7. `transfer_in` - Transferência recebida
8. `transfer_out` - Transferência enviada
9. `ticket_sent` - Ticket enviado
10. `ticket_redeemed` - Ticket resgatado
11. `ticket_expired` - Ticket expirado
12. `other` - Outro

**tRPC Hooks usados:**
```typescript
useTRPC().poker.transactions.get()     // List with filters
useTRPC().poker.transactions.getById() // Transaction details
useTRPC().poker.transactions.getStats() // Aggregations
useTRPC().poker.transactions.delete()  // Delete (admin only)
```

---

### 8. Settlements List

**Página:** `/poker/settlements/page.tsx`

**Componentes principais:**

| Component | File | Purpose |
|-----------|------|---------|
| `PokerSettlementsHeader` | `poker-settlements-header.tsx` | Header com actions |
| `PokerSettlementFilters` | `poker-settlement-filters.tsx` | Filters: status, playerId, agentId, periodRange |

**Data Table:**
- Columns: Period, Player, Agent, Gross, Rakeback, Commission, Adjustment, Net, Paid, Status, Actions
- Status badges: pending (yellow), partial (blue), completed (green)
- Pagination: 50 per page

**Settlement Actions:**
- Mark as Paid (dialog com amount input)
- Update Status
- View Details
- Delete (admin only)

**tRPC Hooks usados:**
```typescript
useTRPC().poker.settlements.get()      // List with filters
useTRPC().poker.settlements.getById()  // Settlement details
useTRPC().poker.settlements.getStats() // Overview stats
useTRPC().poker.settlements.create()   // Manual settlement (rare)
useTRPC().poker.settlements.markPaid() // Mark as paid
useTRPC().poker.settlements.updateStatus() // Change status
useTRPC().poker.settlements.closeWeek() // Auto-create settlements
```

---

### 9. Close Week Modal (CRÍTICO)

**Component:** `CloseWeekPreviewModal.tsx` (~1500 linhas)

**Purpose:** Modal complexo com 8 tabs para preview/edição/confirmação do fechamento semanal.

**Tabs (Close Week):**

Located in `close-week-tabs/`:

1. **resumo-tab.tsx** - Overview geral: total rake, bank result, settlements count, net amount
2. **sessions-tab.tsx** - Todas sessões do período com filtros e expandable players
3. **geral-tab.tsx** - Aba "Geral" (player summaries) com edição inline
4. **rakeback-tab.tsx** - Aba "Retorno de Taxa" com edição de rakeback %
5. **settlements-tab.tsx** - Preview dos settlements que serão criados
6. **despesas-tab.tsx** - Despesas/ajustes manuais (opcional)
7. **liga-tab.tsx** - Dados de liga (se houver)
8. **rakeback-edit-dialog.tsx** - Dialog para editar rakeback % em lote

**Flow:**

```
1. User clicks "Fechar Semana" → CloseWeekButton
   ↓
2. Load close week data → poker.weekPeriods.getCloseWeekData()
   ↓
3. Show preview modal → CloseWeekPreviewModal (8 tabs)
   ↓
4. User reviews tabs, edits rakeback if needed
   ↓
5. User clicks "Processar Fechamento"
   ↓
6. POST poker.weekPeriods.closeWeek() → Creates settlements
   ↓
7. Success toast + redirect to settlements page
```

**Data fetched:**
```typescript
{
  weekPeriod: {
    id, week_start, week_end, status, total_sessions, total_players, total_rake
  },
  sessions: Session[],           // All sessions in period
  summaries: PlayerSummary[],    // Aba Geral
  rakebacks: AgentRakeback[],   // Aba Retorno de Taxa
  transactions: Transaction[],   // All transactions in period
  preview: SettlementPreview[], // Calculated settlements
}
```

**Edit capabilities:**
- Edit rakeback % per agent (inline or batch dialog)
- Add manual adjustments (despesas)
- Exclude players from settlement (checkbox)

**Validation before close:**
- All imports committed (committed = true)
- Week period status = 'open'
- No overlapping settlements
- Rakeback % valid (0-100)

**tRPC Hooks usados:**
```typescript
useTRPC().poker.weekPeriods.getCloseWeekData() // Fetch all data
useTRPC().poker.weekPeriods.previewCloseWeek() // Preview settlements
useTRPC().poker.weekPeriods.closeWeek()        // Execute close
useTRPC().poker.players.updateRakeback()       // Edit rakeback %
```

---

## Custom Hooks

**Localização:** `apps/dashboard/src/hooks/`

### URL State Hooks

```typescript
// Poker players params
use-poker-players-params.ts
  → usePokerPlayersParams()
  Returns: { cursor, pageSize, sort, filters... }
  Updates: setParams({ ...newParams })

// Poker sessions params
use-poker-sessions-params.ts
  → usePokerSessionsParams()

// Poker transactions params
use-poker-transactions-params.ts
  → usePokerTransactionsParams()

// Poker settlements params
use-poker-settlements-params.ts
  → usePokerSettlementsParams()

// Poker agents params
use-poker-agents-params.ts
  → usePokerAgentsParams()

// Dashboard view mode
use-dashboard-view-params.ts
  → useDashboardViewParams()
  Returns: { viewMode, from, to, includeDraft }
```

**Pattern:**
```typescript
export function usePokerPlayersParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params = {
    cursor: searchParams.get('cursor') ?? undefined,
    pageSize: Number(searchParams.get('pageSize')) || 50,
    sort: [searchParams.get('sortBy'), searchParams.get('sortDir')],
    q: searchParams.get('q') ?? undefined,
    type: searchParams.get('type') as PlayerType | undefined,
    status: searchParams.get('status') as PlayerStatus | undefined,
    // ... more filters
  };

  const setParams = (newParams: Partial<typeof params>) => {
    const sp = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        sp.set(key, String(value));
      } else {
        sp.delete(key);
      }
    });
    router.push(`${pathname}?${sp.toString()}`);
  };

  return { params, setParams };
}
```

### Data Hooks

```typescript
// Fetch poker overview stats
use-poker-overview.ts
  → usePokerOverview()
  Wraps: useTRPC().poker.analytics.getOverview()

// Fetch dashboard stats
use-dashboard-stats.ts
  → useDashboardStats(viewMode, from, to, includeDraft)
  Wraps: useTRPC().poker.analytics.getDashboardStats()

// Fetch current week period
use-current-week-period.ts
  → useCurrentWeekPeriod()
  Wraps: useTRPC().poker.weekPeriods.getCurrent()

// Fetch open week periods (for warnings)
use-open-week-periods.ts
  → useOpenWeekPeriods()
  Wraps: useTRPC().poker.weekPeriods.getOpenPeriods()
```

---

## Stores Zustand

**Localização:** `apps/dashboard/src/store/`

### Import Store

```typescript
// use-import-store.ts
interface ImportStore {
  // Current import being processed
  currentImport: Import | null;
  setCurrentImport: (import: Import | null) => void;

  // Validation results
  validationErrors: ValidationError[];
  validationWarnings: ValidationWarning[];
  setValidationResults: (errors, warnings) => void;

  // Modal state
  isValidationModalOpen: boolean;
  openValidationModal: () => void;
  closeValidationModal: () => void;

  // Processing state
  isProcessing: boolean;
  processingProgress: number;
  setProcessing: (isProcessing: boolean, progress?: number) => void;

  // Reset all state
  reset: () => void;
}
```

### Close Week Store

```typescript
// use-close-week-store.ts
interface CloseWeekStore {
  // Week period being closed
  weekPeriod: WeekPeriod | null;
  setWeekPeriod: (period: WeekPeriod | null) => void;

  // Close week data
  sessions: Session[];
  summaries: PlayerSummary[];
  rakebacks: AgentRakeback[];
  transactions: Transaction[];
  setSessions: (sessions: Session[]) => void;
  setSummaries: (summaries: PlayerSummary[]) => void;
  // ... setters

  // Edited rakeback values (player_id → new rakeback %)
  editedRakebacks: Map<string, number>;
  setEditedRakeback: (playerId: string, percent: number) => void;
  clearEditedRakebacks: () => void;

  // Excluded players (won't receive settlement)
  excludedPlayers: Set<string>;
  toggleExcludedPlayer: (playerId: string) => void;

  // Manual adjustments
  adjustments: Adjustment[];
  addAdjustment: (adjustment: Adjustment) => void;
  removeAdjustment: (id: string) => void;

  // Modal state
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  // Reset
  reset: () => void;
}
```

### UI Preferences Store

```typescript
// use-ui-preferences-store.ts
interface UIPreferencesStore {
  // Dashboard widget preferences (cached in Redis via tRPC)
  primaryWidgets: PokerWidgetType[];
  setPrimaryWidgets: (widgets: PokerWidgetType[]) => void;

  // View mode (current_week vs historical)
  viewMode: "current_week" | "historical";
  setViewMode: (mode: ViewMode) => void;

  // Date range for historical mode
  dateRange: { from: Date | null; to: Date | null };
  setDateRange: (range: DateRange) => void;

  // Include draft data?
  includeDraft: boolean;
  setIncludeDraft: (include: boolean) => void;

  // Table preferences
  playersPageSize: number;
  sessionsPageSize: number;
  // ... setters
}
```

---

## Fluxos de Usuário

### Fluxo 1: Importação de Planilha (Happy Path)

```
1. Navegação
   User → /poker/import

2. Upload
   User arrasta Excel → ImportUploader dropzone
   ↓
   Frontend parse (exceljs) → Extract 7 tabs
   ↓
   POST /trpc/poker.imports.create({ fileName, fileSize, raw_data })
   ↓
   Response: { id, status: "validating" }

3. Validação (Frontend)
   Run 12+ validation rules → Collect errors/warnings
   ↓
   If errors.length > 0 → Block processing, show errors
   ↓
   If warnings.length > 0 → Allow processing, show warnings

4. Review
   Open ImportValidationModal (14 tabs)
   ↓
   User reviews:
     - Overview tab (stats, warnings count)
     - Validation tab (errors/warnings list)
     - General tab (player summaries)
     - Sessions tab (partidas)
     - Transactions tab (transações)
     - ... (all 14 tabs)

5. Processing
   User clicks "Processar Import"
   ↓
   POST /trpc/poker.imports.process({ id })
   ↓
   Backend: 12 steps processing (see BACKEND-MAP.md)
   ↓
   Status updates: validating → processing → completed
   ↓
   Polling: useTRPC().poker.imports.getById() every 2s

6. Completion
   Status = "completed"
   ↓
   Close modal
   ↓
   Show success toast "Import processado com sucesso!"
   ↓
   Refresh ImportsL ist → New import appears
   ↓
   Optional: Redirect to /poker (dashboard)
```

### Fluxo 2: Fechamento Semanal (Happy Path)

```
1. Trigger
   User clicks "Fechar Semana" button → Dashboard header
   ↓
   Check: useTRPC().poker.weekPeriods.getOpenPeriods()
   ↓
   If openPeriods.length > 1 → Show warning "Há N semanas abertas"
   ↓
   User confirms → Proceed

2. Load Data
   POST /trpc/poker.weekPeriods.getCloseWeekData()
   ↓
   Returns:
     - weekPeriod (current week)
     - sessions (all sessions in period)
     - summaries (player summaries from Geral tab)
     - rakebacks (agent rakeback data)
     - transactions (all transactions)
   ↓
   Store in CloseWeekStore

3. Preview
   Open CloseWeekPreviewModal (8 tabs)
   ↓
   Show "Resumo" tab by default:
     - Total Rake: R$ X
     - Bank Result: R$ Y
     - Player Results: R$ Z
     - Settlements Count: N players
     - Total Net Amount: R$ W

4. Review Tabs
   User reviews:
     - Resumo (overview)
     - Sessões (all sessions with expandable players)
     - Geral (player summaries, editable)
     - Retorno de Taxa (rakeback %, editable)
     - Settlements (preview of settlements to be created)
     - Despesas (manual adjustments)
     - Liga (if applicable)

5. Edit Rakeback (Optional)
   User clicks "Editar RT %" on Retorno de Taxa tab
   ↓
   Open RakebackEditDialog
   ↓
   User selects agents (multi-select) + enters new %
   ↓
   Update CloseWeekStore.editedRakebacks
   ↓
   Preview settlements recalculated

6. Execute Close
   User clicks "Processar Fechamento"
   ↓
   Validate:
     - All imports committed? ✓
     - Week period status = 'open'? ✓
     - Rakeback % valid (0-100)? ✓
   ↓
   POST /trpc/poker.weekPeriods.closeWeek({
     weekPeriodId,
     editedRakebacks,
     adjustments,
     excludedPlayers
   })
   ↓
   Backend:
     1. Create week_period (if not exists)
     2. Call poker.settlements.closeWeek() → Create settlements
     3. Update week_period:
        - status = 'closed'
        - closed_at = now
        - closed_by_id = userId
        - settlements_gross_amount
        - settlements_net_amount
     4. Return summary

7. Success
   Close modal
   ↓
   Show success toast "Semana fechada com sucesso! N settlements criados."
   ↓
   Redirect to /poker/settlements
   ↓
   Show settlements list with new settlements (status: pending)
```

### Fluxo 3: Gestão de Jogadores

```
1. Navigation
   User → /poker/players

2. View List
   Load players: useTRPC().poker.players.get({ filters, pagination })
   ↓
   Display DataTable (50 rows)
   ↓
   Show stats: Total Players, Active, VIPs, Sharks

3. Search/Filter
   User types in search box → setParams({ q: "João" })
   ↓
   User selects filters:
     - Type: Player | Agent
     - Status: Active | Inactive | Banned
     - Agent: Select agent from dropdown
     - VIP: Toggle
     - Shark: Toggle
     - Has Rake: Toggle
     - Has Balance: Toggle
   ↓
   URL updates: ?q=João&type=player&status=active&isVip=true
   ↓
   Refetch players with new filters

4. View Details
   User clicks row → Open OpenPlayerSheet
   ↓
   Load player: useTRPC().poker.players.getById({ id })
   ↓
   Display:
     - Player info (nickname, memo, country, etc.)
     - Agent hierarchy (agent → super_agent)
     - Balances (chip, credit, agent_credit)
     - Rake stats (total rake, sessions, avg rake/session)
     - Activity metrics (last session, activity status)
     - If agent: managed players list

5. Edit Player
   User clicks "Edit" in sheet
   ↓
   Open edit form (inline or dialog)
   ↓
   User modifies: nickname, memo, phone, email, credit_limit, rakeback_percent, status, etc.
   ↓
   POST /trpc/poker.players.upsert({ id, ...updates })
   ↓
   Invalidate queries → Refetch player
   ↓
   Show success toast

6. Delete Player
   User clicks "Delete"
   ↓
   Show confirmation dialog "Tem certeza que deseja deletar João?"
   ↓
   User confirms
   ↓
   POST /trpc/poker.players.delete({ id })
   ↓
   Close sheet
   ↓
   Invalidate queries → Refetch list
   ↓
   Show success toast "Jogador deletado"
```

---

## Padrões de UI

### 1. Data Tables

**Padrão shadcn/ui DataTable:**

```typescript
// Component structure
<DataTable
  columns={columns}
  data={data}
  pagination={{
    cursor: params.cursor,
    pageSize: params.pageSize,
    hasNextPage: meta.hasNextPage,
    hasPreviousPage: meta.hasPreviousPage,
  }}
  sorting={{
    column: params.sort[0],
    direction: params.sort[1],
    onSortChange: (column, dir) => setParams({ sort: [column, dir] })
  }}
  filters={<PokerPlayerFilters />}
  loading={isLoading}
  empty={<EmptyState />}
/>
```

**Features:**
- Column sorting (click header)
- Pagination (Previous/Next buttons)
- Row selection (checkbox)
- Expandable rows (sessions → session_players)
- Row actions (Edit, Delete, View)
- Skeleton loading state
- Empty state with CTA

### 2. Filters

**Padrão Advanced Filters:**

```typescript
<AdvancedFilters>
  <FilterGroup label="Status">
    <Select value={params.status} onChange={(v) => setParams({ status: v })}>
      <SelectItem value="active">Ativo</SelectItem>
      <SelectItem value="inactive">Inativo</SelectItem>
      <SelectItem value="banned">Banido</SelectItem>
    </Select>
  </FilterGroup>

  <FilterGroup label="Tipo">
    <ToggleGroup value={params.type} onChange={(v) => setParams({ type: v })}>
      <ToggleItem value="player">Jogador</ToggleItem>
      <ToggleItem value="agent">Agente</ToggleItem>
    </ToggleGroup>
  </FilterGroup>

  <FilterGroup label="Filtros Rápidos">
    <Checkbox checked={params.isVip} onChange={(v) => setParams({ isVip: v })}>
      VIP
    </Checkbox>
    <Checkbox checked={params.isShark} onChange={(v) => setParams({ isShark: v })}>
      Shark
    </Checkbox>
    <Checkbox checked={params.hasRake} onChange={(v) => setParams({ hasRake: v })}>
      Com Rake
    </Checkbox>
  </FilterGroup>

  <FilterActions>
    <Button variant="outline" onClick={clearFilters}>Limpar</Button>
    <Button onClick={applyFilters}>Aplicar</Button>
  </FilterActions>
</AdvancedFilters>
```

### 3. Stats Cards

**Padrão Dashboard Widget:**

```typescript
<StatsCard
  title="Total Players"
  value={stats.totalPlayers}
  icon={<Users />}
  trend={stats.playersTrend}
  trendLabel="+12% vs last week"
  variant="default"
  loading={isLoading}
/>
```

**Variants:**
- `default` - Neutral (gray)
- `success` - Positive (green)
- `warning` - Alert (yellow)
- `danger` - Negative (red)
- `info` - Informational (blue)

### 4. Sheets (Lateral Panels)

**Padrão Player/Agent Details:**

```typescript
<Sheet open={isOpen} onOpenChange={setOpen}>
  <SheetContent side="right" className="w-[600px]">
    <SheetHeader>
      <SheetTitle>{player.nickname}</SheetTitle>
      <SheetDescription>
        {player.memoName} • {player.ppPokerId}
      </SheetDescription>
    </SheetHeader>

    <SheetBody>
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          {/* Player info fields */}
        </TabsContent>

        <TabsContent value="stats">
          {/* Rake stats, sessions, winnings */}
        </TabsContent>

        <TabsContent value="history">
          {/* Sessions list, transactions */}
        </TabsContent>
      </Tabs>
    </SheetBody>

    <SheetFooter>
      <Button variant="outline" onClick={close}>Cancelar</Button>
      <Button onClick={save}>Salvar</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

### 5. Modals

**Padrão Import/Close Week Modal:**

```typescript
<Dialog open={isOpen} onOpenChange={setOpen}>
  <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Import Validation</DialogTitle>
      <DialogDescription>
        Review imported data before processing
      </DialogDescription>
    </DialogHeader>

    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid grid-cols-7 gap-2">
        {tabs.map(tab => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
            {tab.errorCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {tab.errorCount}
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map(tab => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.component}
        </TabsContent>
      ))}
    </Tabs>

    <DialogFooter>
      <Button variant="outline" onClick={cancel}>Cancelar</Button>
      <Button
        onClick={process}
        disabled={hasErrors || isProcessing}
        loading={isProcessing}
      >
        {isProcessing ? "Processando..." : "Processar Import"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 6. Loading States

**Patterns:**

```typescript
// Skeleton for tables
<Skeleton className="h-12 w-full" count={10} />

// Skeleton for cards
<Card>
  <CardHeader>
    <Skeleton className="h-6 w-1/3" />
    <Skeleton className="h-4 w-1/2" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-20 w-full" />
  </CardContent>
</Card>

// Spinner for inline actions
<Button disabled>
  <Spinner className="mr-2" />
  Processando...
</Button>

// Progress bar for imports
<Progress value={progress} max={100} />
```

### 7. Empty States

**Pattern:**

```typescript
<EmptyState
  icon={<FileX />}
  title="Nenhum import encontrado"
  description="Importe uma planilha do PPPoker para começar"
  action={
    <Button onClick={openUploader}>
      <Upload className="mr-2" />
      Importar Planilha
    </Button>
  }
/>
```

---

## Observações Técnicas

### Performance Optimizations

1. **Pagination:** Cursor-based (não offset) para queries grandes
2. **Lazy Loading:** Tabs só renderizam quando ativadas
3. **Debounce:** Search input debounced 300ms
4. **Memoization:** `useMemo` para cálculos pesados (aggregations)
5. **Virtualization:** Lista de 1000+ items usa react-window (future)

### Accessibility

1. **Keyboard Navigation:** Tab, Enter, Escape functional
2. **Screen Readers:** aria-labels em todos componentes interativos
3. **Focus Management:** Auto-focus em modals, trap focus
4. **Color Contrast:** WCAG AA compliant (4.5:1)

### Error Handling

1. **Form Validation:** Zod schemas, inline errors
2. **API Errors:** Toast notifications com retry action
3. **Network Errors:** Retry logic (3x exponential backoff)
4. **Loading Errors:** Error boundaries com fallback UI

### i18n

- Locale: PT-BR (default), EN (optional)
- Location: `apps/dashboard/src/i18n/locales/`
- Pattern: `t('poker.players.title')` → "Jogadores"

---

**Documento criado:** 2026-01-21
**Última atualização:** 2026-01-21
**Status:** Completo
**Cobertura:** 60+ componentes, 9 páginas, custom hooks, stores Zustand, fluxos de usuário principais
