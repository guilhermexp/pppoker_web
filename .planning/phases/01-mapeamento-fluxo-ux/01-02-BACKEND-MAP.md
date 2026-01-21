# Backend Map: Poker Module

**Purpose:** Mapeamento completo do fluxo backend do módulo poker, desde routers tRPC até queries do banco de dados.

**Date:** 2026-01-21

---

## Table of Contents

1. [Visão Geral](#visão-geral)
2. [Routers tRPC](#routers-trpc)
3. [Schemas de Validação](#schemas-de-validação)
4. [Database Queries](#database-queries)
5. [Database Schema](#database-schema)
6. [Fluxo de Dados](#fluxo-de-dados)
7. [Pontos Críticos](#pontos-críticos)

---

## Visão Geral

### Tecnologias

- **Framework HTTP:** Hono
- **API Layer:** tRPC v10+
- **Validação:** Zod
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL (via Supabase)
- **Auth:** Supabase JWT tokens

### Arquitetura Geral

```
Dashboard (Next.js)
    ↓
tRPC Client (HTTP POST /trpc)
    ↓
Middleware Chain → Router Procedure → Business Logic → Database Query
    ↓                                                        ↓
SuperJSON Response                                    PostgreSQL
```

**Middleware Chain aplicado:**
1. `withRateLimiting` - 1000 req/10min por usuário (Redis)
2. `withTeamPermission` - Autorização via team membership
3. `withPrimaryReadAfterWrite` - Consistência de leitura após escrita

---

## Routers tRPC

### Estrutura dos Routers Poker

Localização: `apps/api/src/trpc/routers/poker/`

Total: **8 routers** (não 6 como documentação inicial sugeria)

```typescript
// apps/api/src/trpc/routers/poker/index.ts
export const pokerRouter = createTRPCRouter({
  players: pokerPlayersRouter,        // CRUD jogadores/agentes
  sessions: pokerSessionsRouter,      // Gestão de sessões
  settlements: pokerSettlementsRouter, // Fechamento semanal
  imports: pokerImportsRouter,        // Importação de planilhas
  analytics: pokerAnalyticsRouter,    // Rake, bank, top players
  transactions: pokerTransactionsRouter, // Transações de chips
  weekPeriods: pokerWeekPeriodsRouter,  // Períodos semanais
});
```

---

### 1. Poker Imports Router

**File:** `apps/api/src/trpc/routers/poker/imports.ts` (1,668 linhas)

**Propósito:** Sistema crítico de importação de planilhas PPPoker (Excel) com validação e processamento em múltiplas etapas.

#### Procedures

| Procedure | Type | Input Schema | Purpose |
|-----------|------|--------------|---------|
| `get` | query | `getPokerImportsSchema` | Lista imports com paginação, filtros (status, sourceType), estatísticas detalhadas |
| `getById` | query | `getPokerImportByIdSchema` | Busca import por ID com raw_data completo |
| `create` | mutation | `createPokerImportSchema` | Cria registro de import (status: "validating") |
| `validate` | mutation | `validatePokerImportSchema` | Valida dados, conta players novos/existentes, verifica estrutura |
| `process` | mutation | `processPokerImportSchema` | **CRÍTICO** - Processa import validado em 12 etapas (ver abaixo) |
| `cancel` | mutation | `cancelPokerImportSchema` | Cancela import (apenas status pending/validating/validated) |
| `delete` | mutation | `getPokerImportByIdSchema` | Remove registro de import |

#### Fluxo de Processamento (Procedure `process`)

**Etapas de processamento:**

```
STEP 0: Create/upsert week period
  ↓
PRE-SCAN: Identify agents and super_agents from summaries
  ↓
STEP 1: Batch upsert ALL players from "Detalhes do usuário" (skip agents)
  ↓
STEP 2: Extract and upsert agents/super_agents FIRST (with correct type)
  ↓
STEP 2.5: Batch upsert players from summaries (Geral sheet)
  ↓
STEP 2.6: Batch upsert players from sessions (Partidas sheet)
  ↓
STEP 3: Get player ID map (pppoker_id → internal id)
  ↓
STEP 3.5: Link players to agents (update agent_id, super_agent_id)
  ↓
STEP 4: Batch insert transactions
  ↓
STEP 5: Batch upsert sessions
  ↓
STEP 6: Get session ID map (external_id → internal id)
  ↓
STEP 7: Batch upsert session_players
  ↓
STEP 8: Batch upsert player summaries
  ↓
STEP 9: Batch upsert player detailed data
  ↓
STEP 10: Batch upsert agent rakeback data
  ↓
STEP 11: Batch insert demonstrativo data
  ↓
STEP 12: Calculate activity metrics for all players
```

**Características importantes:**
- **Batch operations:** BATCH_SIZE = 500 (Supabase max 1000)
- **Deduplication:** Usa `deduplicateByKey` para evitar "cannot affect row a second time"
- **Pagination:** Queries usam range() para evitar limite de 1000 rows
- **Error handling:** Coleta `processingErrors[]`, continua processamento, marca status "failed" se houver erros
- **Activity metrics:** Calcula last_session_at, sessions_last_4_weeks, weeks_active_last_4

**Tabelas afetadas:**
1. `poker_week_periods`
2. `poker_players` (players, agents, super_agents)
3. `poker_chip_transactions`
4. `poker_sessions`
5. `poker_session_players`
6. `poker_player_summary`
7. `poker_player_detailed`
8. `poker_agent_rakeback`
9. `poker_demonstrativo`

---

### 2. Poker Players Router

**File:** `apps/api/src/trpc/routers/poker/players.ts` (1,179 linhas)

**Propósito:** CRUD completo de jogadores, agentes e super-agentes com hierarquia e estatísticas.

#### Procedures

| Procedure | Type | Input Schema | Purpose |
|-----------|------|--------------|---------|
| `get` | query | `getPokerPlayersSchema` | Lista com paginação, busca (q), filtros complexos (type, status, agent, VIP, shark, hasRake, hasBalance) |
| `getById` | query | `getPokerPlayerByIdSchema` | Detalhes completos: agent info, rake stats, agent stats (se agent), activity metrics |
| `upsert` | mutation | `upsertPokerPlayerSchema` | Cria ou atualiza jogador (verifica pppoker_id unique) |
| `delete` | mutation | `deletePokerPlayerSchema` | Remove jogador |
| `updateStatus` | mutation | `updatePokerPlayerStatusSchema` | Atualiza apenas status (active/inactive/banned) |
| `updateRakeback` | mutation | `updatePokerPlayerRakebackSchema` | Atualiza porcentagem de rakeback |
| `getAgents` | query | `getPokerAgentsSchema` | Lista apenas agents ativos (type='agent', status='active') |
| `getPlayersByAgent` | query | `getPlayersByAgentSchema` | Jogadores gerenciados por um agente específico |
| `getStats` | query | - | Estatísticas gerais: total players/agents, VIPs, sharks, balances |
| `getAgentStats` | query | `getAgentStatsSchema` | **Estatísticas detalhadas de agentes:** rake, comissões, breakdown por super_agent |
| `checkExistingByPpPokerIds` | query | `checkExistingPlayersSchema` | Valida quais PPPoker IDs já existem (bulk import) |
| `bulkCreate` | mutation | `bulkCreatePlayersSchema` | Criação em lote (batch 100), resolve agent relationships |

#### Filtros Complexos

**Filtro `hasRake`:**
- Agrega de `poker_session_players` onde `rake > 0`
- Retorna apenas players com rake positivo

**Committed Data:**
- Helper `getCommittedImportIds()` filtra por imports committed
- `includeDraft` param permite visualizar dados não-comitados

#### Activity Metrics

**Calculados em tempo real via `calculateBatchActivityMetrics()`:**
- `lastSessionAt` - Última sessão jogada
- `sessionsLast4Weeks` - Sessões nos últimos 28 dias
- `weeksActiveLast4` - Semanas com atividade (máx 4)
- `daysSinceLastSession` - Dias desde última sessão
- `activityStatus` - "active" | "inactive" | "dormant" | "new"

---

### 3. Poker Sessions Router

**File:** `apps/api/src/trpc/routers/poker/sessions.ts` (662 linhas)

**Propósito:** Gestão de sessões de poker (cash_game, mtt, sit_n_go, spin).

#### Procedures

| Procedure | Type | Input Schema | Purpose |
|-----------|------|--------------|---------|
| `get` | query | `getPokerSessionsSchema` | Lista com filtros: sessionType, gameVariant, dateRange, q (table_name/external_id) |
| `getById` | query | `getPokerSessionByIdSchema` | Detalhes da sessão + session_players (jogadores participantes com rake individual) |
| `upsert` | mutation | `upsertPokerSessionSchema` | Cria ou atualiza sessão (unique: external_id) |
| `delete` | mutation | `deletePokerSessionSchema` | Remove sessão |
| `getStats` | query | subset of `getPokerSessionsSchema` | Estatísticas agregadas: total rake, buy-in, hands, breakdown por tipo/variante |
| `getByPlayer` | query | extends `getPokerSessionsSchema` | Sessões de um jogador específico com dados player-specific (ranking, winnings, rake) |

#### Joins Importantes

**getById inclui:**
- `created_by` (poker_players) - Quem criou a sessão
- `session_players` (poker_session_players) - Jogadores participantes
  - Nested join com `player` (poker_players)

**Agregações em getStats:**
- Conta unique players via `poker_session_players.player_id`
- Soma total_rake, total_buy_in, hands_played, guaranteed_prize
- Breakdown por `session_type`, `game_variant`, `organizer` (raw_data)

---

### 4. Poker Transactions Router

**File:** `apps/api/src/trpc/routers/poker/transactions.ts` (412 linhas)

**Propósito:** Operações com transações de chips (12 tipos: credit_given, transfer_in, etc.).

#### Procedures

| Procedure | Type | Input Schema | Purpose |
|-----------|------|--------------|---------|
| `get` | query | `getPokerTransactionsSchema` | Lista com filtros: type, playerId, sessionId, clubId, dateRange, amountRange |
| `getById` | query | `getPokerTransactionByIdSchema` | Detalhes completos da transação com sender/recipient/session joins |
| `getStats` | query | subset of `getPokerTransactionsSchema` | Agregações: total credit/chips sent/redeemed, net amount, breakdown por tipo |
| `delete` | mutation | `deletePokerTransactionSchema` | Remove transação |

#### Campos de Transação

**Identificação:**
- `sender_player_id` / `recipient_player_id` (foreign keys)
- `sender_nickname`, `sender_memo_name` (100% coverage - fallback se player não existir)
- `recipient_nickname`, `recipient_memo_name`

**Valores:**
- `credit_sent`, `credit_redeemed`, `credit_left_club`
- `chips_sent`, `chips_redeemed`, `chips_left_club`
- `chips_ppsr`, `chips_ring`, `chips_custom_ring`, `chips_mtt` (classificação)
- `ticket_sent`, `ticket_redeemed`, `ticket_expired`
- `amount` = (sent) - (redeemed) (calculado)

**Busca:**
- Permite buscar por `q` em sender OR recipient (nickname, memo_name)
- Filtro `playerId` busca sender OR recipient

---

### 5. Poker Settlements Router

**File:** `apps/api/src/trpc/routers/poker/settlements.ts` (484 linhas)

**Propósito:** Fechamento semanal (settlements) com cálculos de rake, rakeback, comissões.

#### Procedures

| Procedure | Type | Input Schema | Purpose |
|-----------|------|--------------|---------|
| `get` | query | `getPokerSettlementsSchema` | Lista com filtros: status, playerId, agentId, periodRange |
| `getById` | query | `getPokerSettlementByIdSchema` | Detalhes do settlement com player/agent joins |
| `create` | mutation | `createPokerSettlementSchema` | Cria settlement manual |
| `updateStatus` | mutation | `updatePokerSettlementStatusSchema` | Atualiza status (pending → partial → completed) |
| `markPaid` | mutation | `markSettlementPaidSchema` | Marca como pago (paid_amount, paid_at, status="completed") |
| `delete` | mutation | `deletePokerSettlementSchema` | Remove settlement |
| `getStats` | query | - | Agregações: total pending/completed, totalGross/Net/Paid |
| **`closeWeek`** | mutation | periodStart/End optional | **CRÍTICO** - Cria settlements para todos players com chip_balance != 0 |

#### Lógica de Fechamento Semanal (`closeWeek`)

**Algoritmo:**
```typescript
1. Definir período (default: últimos 7 dias)
2. Buscar players com chip_balance != 0 e status='active'
3. Para cada player:
   grossAmount = chip_balance
   rakebackAmount = grossAmount > 0 ? (grossAmount * rakeback_percent / 100) : 0
   netAmount = grossAmount - rakebackAmount
4. Inserir settlements em lote
5. Resetar chip_balance para 0 em todos players com settlements
```

**Campos calculados:**
- `gross_amount` - Valor bruto do saldo
- `rakeback_amount` - Desconto de rakeback
- `rakeback_percent_used` - Percentual aplicado (histórico)
- `commission_amount` - Comissão do agente
- `adjustment_amount` - Ajustes manuais
- `net_amount` = gross - rakeback + commission + adjustment
- `paid_amount` - Valor já pago
- `paid_at` - Data do pagamento

**Status tracking:**
- `pending` - Criado, aguardando pagamento
- `partial` - Pagamento parcial
- `completed` - Totalmente pago

---

### 6. Poker Analytics Router

**File:** `apps/api/src/trpc/routers/poker/analytics.ts`

**Status:** Não lido ainda (será documentado em Task 2)

**Procedures esperados:**
- Rake analysis
- Bank result
- Top players
- Relatórios agregados

---

### 7. Poker Week Periods Router

**File:** `apps/api/src/trpc/routers/poker/week-periods.ts`

**Status:** Não lido ainda (será documentado em Task 2)

**Procedures esperados:**
- Gestão de períodos semanais
- Status tracking (open, closed, locked)
- Vínculo com imports

---

## Schemas de Validação

**Localização:** `apps/api/src/schemas/poker/`

### Schemas Identificados

```
poker/
├── imports.ts          # createPokerImportSchema, validatePokerImportSchema, processPokerImportSchema
├── players.ts          # upsertPokerPlayerSchema, getPokerPlayersSchema, bulkCreatePlayersSchema
├── sessions.ts         # upsertPokerSessionSchema, getPokerSessionsSchema
├── transactions.ts     # getPokerTransactionsSchema
└── settlements.ts      # createPokerSettlementSchema, markSettlementPaidSchema
```

### Regras de Validação Críticas

**Import validation (12+ regras):**
1. Estrutura: Tab names, column count
2. Players: Valid IDs, no duplicates
3. Transactions: Balanced totals, valid types
4. Sessions: Rake matches transaction totals
5. Settlements: Amounts match transaction sums
6. Period dates: Valid date ranges
7. Agent hierarchy: Valid agent/super_agent references
8. Balance consistency: Chip/credit balances match transactions
9. Session totals: total_rake = sum(session_players.rake)
10. Transaction types: Only allowed types (credit_given, transfer_in, etc.)
11. PPPoker IDs: Format validation
12. Mandatory fields: Nickname, dates, amounts

**Localização da validação:** `apps/dashboard/src/lib/poker/validation.ts`

---

## Database Queries

**Localização:** `packages/db/src/queries/`

### Queries Reutilizáveis por Domínio

```
queries/
├── players.ts          # getPlayerById, listPlayersByTeam, getPlayerStats
├── sessions.ts         # getSessionById, listSessionsByTeam, getSessionStats
├── transactions.ts     # getTransactionById, listTransactionsByTeam, getTransactionStats
├── settlements.ts      # getSettlementById, listSettlementsByTeam, calculateWeeklySettlements
├── imports.ts          # getImportById, listImportsByTeam, validateImportData
└── analytics.ts        # getRakeByPeriod, getBankResult, getTopPlayers
```

**Total:** 43 query files organizados por domínio

### Queries Complexas Identificadas

**Joins multi-nível:**
- `players` → `agent` → `super_agent` (3 níveis de hierarquia)
- `sessions` → `session_players` → `player` → `agent`
- `transactions` → `sender/recipient` → `session`

**Agregações:**
- Activity metrics (last_session_at, sessions_last_4_weeks)
- Rake totals (por player, agent, session, período)
- Settlement calculations (gross, rakeback, net)
- Stats (total players, active agents, VIPs, sharks)

**Queries críticas para settlements:**
- `calculateWeeklySettlements()` - Calcula settlements baseado em chip_balance
- `getPlayerRakeStats()` - Agrega rake de session_players
- `getAgentCommission()` - Calcula comissão baseado em rake dos managed players

---

## Database Schema

**Localização:** `packages/db/src/schema.ts` (4,274 linhas)

### Entidades Poker

#### Core Entities

**1. poker_players**
```sql
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id)
import_id UUID REFERENCES poker_imports(id)
pppoker_id TEXT NOT NULL        -- PPPoker ID único
nickname TEXT NOT NULL
memo_name TEXT
country TEXT
type TEXT NOT NULL              -- 'player' | 'agent' | 'super_agent'
status TEXT NOT NULL            -- 'active' | 'inactive' | 'banned'
agent_id UUID REFERENCES poker_players(id)        -- Self-referencing
super_agent_id UUID REFERENCES poker_players(id)  -- Self-referencing
phone TEXT
whatsapp_number TEXT
email TEXT
credit_limit DECIMAL(15,2)
current_balance DECIMAL(15,2)
chip_balance DECIMAL(15,2)
agent_credit_balance DECIMAL(15,2)
super_agent_credit_balance DECIMAL(15,2)
risk_score INTEGER
is_vip BOOLEAN
is_shark BOOLEAN
last_active_at TIMESTAMP
rakeback_percent DECIMAL(5,2)
customer_id TEXT
note TEXT
-- Activity metrics
last_session_at TIMESTAMP
sessions_last_4_weeks INTEGER
weeks_active_last_4 INTEGER
days_since_last_session INTEGER
created_at TIMESTAMP
updated_at TIMESTAMP

UNIQUE(pppoker_id, team_id)
INDEX idx_poker_players_team_type (team_id, type)
INDEX idx_poker_players_agent (agent_id)
INDEX idx_poker_players_super_agent (super_agent_id)
```

**Hierarquia:**
- `player` → `agent` (via agent_id)
- `agent` → `super_agent` (via super_agent_id)
- `player` → `super_agent` (via super_agent_id, direto)

**2. poker_sessions**
```sql
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id)
import_id UUID REFERENCES poker_imports(id)
external_id TEXT NOT NULL       -- PPPoker session ID
table_name TEXT
session_type TEXT NOT NULL      -- 'cash_game' | 'mtt' | 'sit_n_go' | 'spin'
game_variant TEXT NOT NULL      -- 'nlh' | 'plo' | 'plo5' | 'ofc' | ...
started_at TIMESTAMP NOT NULL
ended_at TIMESTAMP
blinds TEXT
buy_in_amount DECIMAL(15,2)
guaranteed_prize DECIMAL(15,2)
total_rake DECIMAL(15,2)
total_buy_in DECIMAL(15,2)
total_cash_out DECIMAL(15,2)
player_count INTEGER
hands_played INTEGER
created_by_id UUID REFERENCES poker_players(id)
raw_data JSONB
created_at TIMESTAMP

UNIQUE(external_id, team_id)
INDEX idx_poker_sessions_team_date (team_id, started_at)
INDEX idx_poker_sessions_type (session_type)
```

**3. poker_session_players** (Many-to-Many)
```sql
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id)
session_id UUID NOT NULL REFERENCES poker_sessions(id)
player_id UUID NOT NULL REFERENCES poker_players(id)
nickname TEXT                   -- Snapshot at session time
memo_name TEXT
ranking INTEGER
buy_in_chips DECIMAL(15,2)
buy_in_ticket DECIMAL(15,2)
cash_out DECIMAL(15,2)
winnings DECIMAL(15,2)
rake DECIMAL(15,2)
rake_ppst DECIMAL(15,2)
rake_ppsr DECIMAL(15,2)
-- Cash game specific
hands INTEGER
winnings_opponents DECIMAL(15,2)
winnings_jackpot DECIMAL(15,2)
winnings_ev_split DECIMAL(15,2)
club_winnings_general DECIMAL(15,2)
club_winnings_jackpot_fee DECIMAL(15,2)
club_winnings_jackpot_prize DECIMAL(15,2)
club_winnings_ev_split DECIMAL(15,2)
-- Tournament specific
bounty DECIMAL(15,2)
prize DECIMAL(15,2)
created_at TIMESTAMP

UNIQUE(session_id, player_id)
INDEX idx_poker_session_players_player (player_id)
```

**4. poker_chip_transactions**
```sql
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id)
import_id UUID REFERENCES poker_imports(id)
occurred_at TIMESTAMP NOT NULL
type TEXT NOT NULL              -- 'credit_given' | 'transfer_in' | ...
sender_club_id TEXT
sender_player_id UUID REFERENCES poker_players(id)
recipient_player_id UUID REFERENCES poker_players(id)
session_id UUID REFERENCES poker_sessions(id)
-- Fallback identification (100% coverage)
sender_nickname TEXT
sender_memo_name TEXT
recipient_nickname TEXT
recipient_memo_name TEXT
-- Credit
credit_sent DECIMAL(15,2)
credit_redeemed DECIMAL(15,2)
credit_left_club DECIMAL(15,2)
-- Chips
chips_sent DECIMAL(15,2)
chips_redeemed DECIMAL(15,2)
chips_left_club DECIMAL(15,2)
-- Chip classification
chips_ppsr DECIMAL(15,2)
chips_ring DECIMAL(15,2)
chips_custom_ring DECIMAL(15,2)
chips_mtt DECIMAL(15,2)
-- Tickets
ticket_sent DECIMAL(15,2)
ticket_redeemed DECIMAL(15,2)
ticket_expired DECIMAL(15,2)
-- Calculated
amount DECIMAL(15,2)            -- (sent) - (redeemed)
note TEXT
created_at TIMESTAMP

INDEX idx_poker_transactions_team_date (team_id, occurred_at)
INDEX idx_poker_transactions_sender (sender_player_id)
INDEX idx_poker_transactions_recipient (recipient_player_id)
```

**5. poker_settlements**
```sql
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id)
period_start DATE NOT NULL
period_end DATE NOT NULL
player_id UUID REFERENCES poker_players(id)
agent_id UUID REFERENCES poker_players(id)
status TEXT NOT NULL            -- 'pending' | 'partial' | 'completed'
gross_amount DECIMAL(15,2) NOT NULL
rakeback_amount DECIMAL(15,2)
rakeback_percent_used DECIMAL(5,2)
commission_amount DECIMAL(15,2)
adjustment_amount DECIMAL(15,2)
net_amount DECIMAL(15,2) NOT NULL
paid_amount DECIMAL(15,2)
paid_at TIMESTAMP
created_by_id UUID REFERENCES users(id)
note TEXT
created_at TIMESTAMP
updated_at TIMESTAMP

INDEX idx_poker_settlements_team_period (team_id, period_start, period_end)
INDEX idx_poker_settlements_player (player_id)
INDEX idx_poker_settlements_status (status)
```

**6. poker_imports**
```sql
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id)
file_name TEXT NOT NULL
file_size INTEGER
file_type TEXT
source_type TEXT                -- 'club' | 'league'
status TEXT NOT NULL            -- 'validating' | 'validated' | 'processing' | 'completed' | 'failed' | 'cancelled'
committed BOOLEAN DEFAULT FALSE
committed_at TIMESTAMP
period_start DATE
period_end DATE
total_players INTEGER
total_sessions INTEGER
total_transactions INTEGER
new_players INTEGER
updated_players INTEGER
validation_passed BOOLEAN
validation_errors TEXT[]
validation_warnings TEXT[]
processing_errors TEXT[]
processed_at TIMESTAMP
processed_by_id UUID REFERENCES users(id)
raw_data JSONB NOT NULL         -- Original parsed Excel data
created_at TIMESTAMP
updated_at TIMESTAMP

INDEX idx_poker_imports_team_status (team_id, status)
INDEX idx_poker_imports_committed (team_id, committed)
```

**7. poker_player_summary** (Weekly aggregations)
```sql
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id)
import_id UUID REFERENCES poker_imports(id)
player_id UUID NOT NULL REFERENCES poker_players(id)
period_start DATE NOT NULL
period_end DATE NOT NULL
-- Balance snapshot
chip_balance DECIMAL(15,2)
agent_credit_balance DECIMAL(15,2)
super_agent_credit_balance DECIMAL(15,2)
-- Winnings by game type
winnings_total DECIMAL(15,2)
winnings_general DECIMAL(15,2)
winnings_ring DECIMAL(15,2)
winnings_mtt_sitgo DECIMAL(15,2)
winnings_spinup DECIMAL(15,2)
winnings_caribbean DECIMAL(15,2)
winnings_color_game DECIMAL(15,2)
winnings_crash DECIMAL(15,2)
winnings_lucky_draw DECIMAL(15,2)
winnings_jackpot DECIMAL(15,2)
winnings_ev_split DECIMAL(15,2)
-- Club earnings / Rake
club_earnings_general DECIMAL(15,2)
rake_total DECIMAL(15,2)
rake_ppst DECIMAL(15,2)
rake_ppsr DECIMAL(15,2)
rake_non_ppst DECIMAL(15,2)
rake_non_ppsr DECIMAL(15,2)
club_earnings_jackpot DECIMAL(15,2)
-- Chip classifications
classification_ppsr DECIMAL(15,2)
classification_ring DECIMAL(15,2)
classification_custom_ring DECIMAL(15,2)
classification_mtt DECIMAL(15,2)
-- Tickets
ticket_value_won DECIMAL(15,2)
ticket_buy_in DECIMAL(15,2)
custom_prize_value DECIMAL(15,2)
-- Game-specific
spinup_buy_in DECIMAL(15,2)
spinup_prize DECIMAL(15,2)
caribbean_bets DECIMAL(15,2)
caribbean_prize DECIMAL(15,2)
color_game_bets DECIMAL(15,2)
color_game_prize DECIMAL(15,2)
crash_bets DECIMAL(15,2)
crash_prize DECIMAL(15,2)
lucky_draw_bets DECIMAL(15,2)
lucky_draw_prize DECIMAL(15,2)
ev_split DECIMAL(15,2)
ticket_delivered_value DECIMAL(15,2)
ticket_delivered_buy_in DECIMAL(15,2)
created_at TIMESTAMP

UNIQUE(player_id, period_start, period_end)
INDEX idx_poker_player_summary_period (team_id, period_start, period_end)
```

**8. poker_player_detailed** (Daily breakdown)
```sql
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id)
import_id UUID REFERENCES poker_imports(id)
player_id UUID NOT NULL REFERENCES poker_players(id)
period_start DATE NOT NULL
period_end DATE NOT NULL
date DATE                       -- Specific day within period
-- Identification
country TEXT
nickname TEXT
memo_name TEXT
agent_nickname TEXT
agent_pppoker_id TEXT
super_agent_nickname TEXT
super_agent_pppoker_id TEXT
-- Winnings by game variant (NLH, PLO, Flash, etc.) - 33 columns
nlh_regular, nlh_three_one, nlh_six_plus, nlh_aof, nlh_sitng, nlh_spinup, nlh_mtt, ...
plo4, plo5, plo6, plo4_hilo, plo5_hilo, plo6_hilo, ...
flash_plo4, flash_plo5, mixed_game, ofc, seka_36, seka_32, ...
caribbean, color_game, crash, lucky_draw, jackpot, ev_split_winnings
total_winnings DECIMAL(15,2)
-- Fees by variant (33 columns)
fee_nlh_regular, fee_nlh_three_one, fee_plo4, ...
fee_total DECIMAL(15,2)
-- SpinUp, Jackpot, EV Split
spinup_buy_in, spinup_prize, jackpot_fee, jackpot_prize, ev_split_nlh, ev_split_plo, ev_split_total
-- Ticket data
ticket_delivered_value, chip_ticket_buy_in
-- Chips sent/redeemed
chip_sent, chip_redeemed, chip_class_ppsr, chip_class_ring, chip_class_custom_ring, chip_class_mtt
-- Credit
credit_left_club, credit_sent, credit_redeemed, credit_left_club_2
-- Hands by variant (36 columns)
hands_nlh_regular, hands_nlh_three_one, hands_plo4, ...
hands_total INTEGER
created_at TIMESTAMP

UNIQUE(player_id, period_start, period_end, date)
INDEX idx_poker_player_detailed_period (team_id, period_start, period_end)
```

**9. poker_agent_rakeback**
```sql
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id)
import_id UUID REFERENCES poker_imports(id)
period_start DATE NOT NULL
period_end DATE NOT NULL
agent_id UUID REFERENCES poker_players(id)
agent_pppoker_id TEXT NOT NULL
agent_nickname TEXT
memo_name TEXT
country TEXT
super_agent_id UUID REFERENCES poker_players(id)
super_agent_pppoker_id TEXT
average_rakeback_percent DECIMAL(5,2)
total_rt DECIMAL(15,2)
created_at TIMESTAMP

UNIQUE(team_id, agent_pppoker_id, period_start, period_end)
```

**10. poker_demonstrativo**
```sql
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id)
import_id UUID REFERENCES poker_imports(id)
occurred_at TIMESTAMP
player_id UUID REFERENCES poker_players(id)
pppoker_id TEXT
nickname TEXT
memo_name TEXT
type TEXT
amount DECIMAL(15,2)
created_at TIMESTAMP

INDEX idx_poker_demonstrativo_team_date (team_id, occurred_at)
```

**11. poker_week_periods**
```sql
id UUID PRIMARY KEY
team_id UUID NOT NULL REFERENCES teams(id)
import_id UUID REFERENCES poker_imports(id)
week_start DATE NOT NULL
week_end DATE NOT NULL
status TEXT NOT NULL            -- 'open' | 'closed' | 'locked'
created_at TIMESTAMP
updated_at TIMESTAMP

UNIQUE(team_id, week_start)
INDEX idx_poker_week_periods_team_status (team_id, status)
```

### Relacionamentos

```
teams (1) ───────┐
                 │
poker_imports (1)├─→ poker_players (N)
                 │   ├─→ agent (self-ref)
                 │   └─→ super_agent (self-ref)
                 │
                 ├─→ poker_sessions (N)
                 │   └─→ created_by (poker_players)
                 │
                 ├─→ poker_session_players (N:M)
                 │   ├─→ session (poker_sessions)
                 │   └─→ player (poker_players)
                 │
                 ├─→ poker_chip_transactions (N)
                 │   ├─→ sender (poker_players)
                 │   ├─→ recipient (poker_players)
                 │   └─→ session (poker_sessions)
                 │
                 ├─→ poker_settlements (N)
                 │   ├─→ player (poker_players)
                 │   └─→ agent (poker_players)
                 │
                 ├─→ poker_player_summary (N)
                 │   └─→ player (poker_players)
                 │
                 ├─→ poker_player_detailed (N)
                 │   └─→ player (poker_players)
                 │
                 ├─→ poker_agent_rakeback (N)
                 │   ├─→ agent (poker_players)
                 │   └─→ super_agent (poker_players)
                 │
                 ├─→ poker_demonstrativo (N)
                 │   └─→ player (poker_players)
                 │
                 └─→ poker_week_periods (N)
```

### Índices Críticos

**Performance:**
- `idx_poker_players_team_type` - Filtragem rápida de players/agents
- `idx_poker_sessions_team_date` - Range queries por data
- `idx_poker_transactions_team_date` - Range queries por data
- `idx_poker_session_players_player` - Lookup por player

**Auditoria:**
- `import_id` em todas tabelas - Rastreabilidade de origem
- `team_id` em todas tabelas - Isolamento multi-tenant

**Unique constraints:**
- `(pppoker_id, team_id)` - Evita duplicação de players
- `(external_id, team_id)` - Evita duplicação de sessions
- `(session_id, player_id)` - Garante unicidade em session_players
- `(player_id, period_start, period_end)` - Garante unicidade em summaries

---

## Fluxo de Dados

### Request Flow Completo

```
1. Dashboard (Next.js 16)
   ↓ tRPC Client (src/trpc/client.tsx)
   ↓ HTTP POST https://api/trpc/poker.players.get
   ↓ Authorization: Bearer <Supabase JWT>

2. API (Hono + tRPC)
   ↓ Middleware: withRateLimiting (Redis check: 1000/10min)
   ↓ Middleware: withTeamPermission (JWT validation, team check)
   ↓ Middleware: withPrimaryReadAfterWrite (DB consistency)
   ↓ Router: pokerPlayersRouter.get
   ↓ Validation: getPokerPlayersSchema (Zod)
   ↓ Business Logic: Apply filters, build query

3. Database Layer (Drizzle ORM)
   ↓ Query: supabase.from('poker_players').select(...)
   ↓ Filters: team_id, type, status, search, etc.
   ↓ Joins: agent, super_agent
   ↓ Aggregations: rake stats from session_players
   ↓ Pagination: range(offset, offset + pageSize - 1)

4. PostgreSQL (Supabase)
   ↓ Execute query
   ↓ RLS: Verify team_id matches user's team
   ↓ Return rows

5. Response
   ↓ Transform: snake_case → camelCase
   ↓ Serialize: SuperJSON (handles dates, bigints)
   ↓ HTTP 200 OK + JSON payload

6. Dashboard
   ↓ React Query: Cache, refetch, optimistic updates
   ↓ Render: Display data in UI
```

### Transformações de Dados

**Layer 1: Excel → Raw Data**
- Frontend parse: `@midpoker/excel-parser`
- Output: `{ summaries: [], players: [], sessions: [], transactions: [] }`
- Stored: `poker_imports.raw_data` (JSONB)

**Layer 2: Raw Data → Validation**
- Validation: 12+ rules in `apps/dashboard/src/lib/poker/validation.ts`
- Output: `{ errors: [], warnings: [] }`
- Stored: `poker_imports.validation_errors`, `validation_warnings`

**Layer 3: Validated → Processing**
- Processing: `poker/imports.ts` procedure `process`
- 12 steps: Create/upsert players, sessions, transactions, summaries
- Deduplication, batch operations, pagination
- Output: All entities in database
- Status: `poker_imports.status = 'completed'`

**Layer 4: Database → tRPC Response**
- Query: Drizzle ORM select with joins
- Transform: `snake_case` → `camelCase`
- Aggregations: Sum, count, group by
- Output: Type-safe JSON via SuperJSON

**Layer 5: tRPC → React**
- React Query: `useQuery()` hook
- Cache: Background refetch, stale-while-revalidate
- Optimistic updates: Instant UI feedback
- Output: Component renders data

---

## Pontos Críticos

### 1. Sistema de Importação (CRÍTICO)

**Arquivo:** `apps/api/src/trpc/routers/poker/imports.ts`

**Riscos:**
- **Performance:** Importações grandes (5000+ players) podem causar timeout
- **Atomicidade:** 12 etapas com múltiplos batches - rollback complexo
- **Deduplicação:** Conflict "cannot affect row a second time" se não deduplic corretamente
- **Memory:** raw_data JSONB pode crescer muito (MB por import)

**Áreas para auditoria:**
- [ ] Batch size adequado (500 vs 1000)?
- [ ] Deduplication em todos os pontos?
- [ ] Error handling: rollback parcial ou continuar?
- [ ] Timeout: 2min suficiente para imports grandes?
- [ ] Pagination: range() em todos os loops?

**Código crítico:**
- Lines 414-443: chunkArray e deduplicateByKey helpers
- Lines 445-475: STEP 0 - Week period upsert
- Lines 479-492: PRE-SCAN - Identify agents
- Lines 754-851: STEP 3.5 - Link players to agents (nested updates)
- Lines 1524-1578: STEP 12 - Activity metrics calculation

### 2. Lógica de Settlement (`closeWeek`)

**Arquivo:** `apps/api/src/trpc/routers/poker/settlements.ts`

**Riscos:**
- **Cálculo incorreto:** rakeback_percent pode estar desatualizado
- **Race condition:** Múltiplos closeWeek simultâneos
- **Reset de saldo:** chip_balance zerado sem verificação

**Áreas para auditoria:**
- [ ] Validar rakeback_percent atual vs histórico
- [ ] Lock de transação para closeWeek?
- [ ] Verificar chip_balance antes de resetar?
- [ ] Rollback se settlement.insert falhar?

**Código crítico:**
- Lines 398-444: Lógica de cálculo (grossAmount, rakebackAmount, netAmount)
- Lines 446-456: Insert settlements em lote
- Lines 459-474: Reset chip_balance para 0

### 3. Queries com Agregação

**Arquivo:** Vários routers (players, sessions, transactions)

**Riscos:**
- **Limite de 1000 rows:** Supabase API limit
- **N+1 queries:** Fetching agents/super_agents para cada player
- **Timeout:** Aggregations complexas sem índices

**Áreas para auditoria:**
- [ ] Usar .limit(50000) em queries grandes?
- [ ] Usar pagination com range()?
- [ ] Joins otimizados (select only needed columns)?
- [ ] Índices existem para todos filtros comuns?

**Código crítico:**
- `players.ts` lines 138-169: hasRake filter (agrega session_players)
- `players.ts` lines 269-276: Aggregate rake stats
- `sessions.ts` lines 511-518: Unique player count
- `analytics.ts`: Todas queries (não lido ainda)

### 4. Hierarquia de Agentes

**Arquivo:** `apps/api/src/trpc/routers/poker/players.ts`, `imports.ts`

**Riscos:**
- **Ciclo infinito:** player → agent → super_agent → player
- **Foreign key order:** Super_agent deve existir antes de agent
- **Cascading deletes:** Deletar agent quebra links?

**Áreas para auditoria:**
- [ ] Validar ciclos na hierarquia?
- [ ] Ordem de insert: super_agents → agents → players?
- [ ] ON DELETE behavior (CASCADE, SET NULL, RESTRICT)?
- [ ] Visualização da árvore de hierarquia?

**Código crítico:**
- `imports.ts` lines 479-492: PRE-SCAN agents
- `imports.ts` lines 542-620: STEP 2 - Insert agents BEFORE players
- `imports.ts` lines 754-851: STEP 3.5 - Link relationships

### 5. Committed vs Draft Data

**Padrão:** Helper `getCommittedImportIds()` em todos routers

**Riscos:**
- **Inconsistência:** Ver dados draft por padrão?
- **Performance:** Filter by import_id em queries grandes?
- **UI confusa:** Indicação clara de draft vs committed?

**Áreas para auditoria:**
- [ ] Default deve ser committed only?
- [ ] includeDraft param em todos endpoints?
- [ ] Índice em (team_id, committed)?
- [ ] UI mostra badge "DRAFT" claramente?

**Código crítico:**
- Implementado em: players.ts, sessions.ts, transactions.ts, analytics.ts
- Pattern: lines 14-30 em cada router (helper function)

### 6. Activity Metrics Calculation

**Arquivo:** `apps/api/src/utils/poker-activity.ts` (inferido)

**Riscos:**
- **Performance:** Calcula para 1000+ players ao mesmo tempo?
- **Timeout:** Batch size de 100 adequado?
- **Erro não-fatal:** Import continua se activity metrics falhar?

**Áreas para auditoria:**
- [ ] Batch size: 100 vs 500?
- [ ] Async processing: Background job?
- [ ] Error handling: Try/catch não falha import?
- [ ] Cálculos corretos: last_session_at, weeks_active?

**Código crítico:**
- `imports.ts` lines 1524-1578: STEP 12 - Activity calculation
- `players.ts` lines 281-282: `calculateBatchActivityMetrics()`
- `players.ts` lines 445-450: `calculatePlayerActivityMetrics()`

---

## Próximos Passos (Fase 2)

**Áreas para auditoria profunda:**

1. **Validação de dados:**
   - Revisar 12+ regras em `apps/dashboard/src/lib/poker/validation.ts`
   - Testar edge cases (valores negativos, datas inválidas, IDs duplicados)
   - Validar consistência: session.total_rake = sum(session_players.rake)

2. **Cálculos matemáticos:**
   - Settlement: grossAmount, rakebackAmount, netAmount
   - Transaction balance: (sent) - (redeemed) = amount
   - Session totals: total_cash_out = total_buy_in + total_winnings

3. **Performance:**
   - Queries com limit > 1000: usar pagination
   - N+1 queries: otimizar joins
   - Índices: verificar execution plans

4. **Transações atômicas:**
   - Import processing: rollback strategy?
   - Settlement closeWeek: transaction lock?
   - Batch operations: all-or-nothing?

5. **Testes:**
   - Unit tests para cálculos
   - Integration tests para import flow
   - Edge cases: imports vazios, valores extremos, dados malformados

---

**Documento criado:** 2026-01-21
**Última atualização:** 2026-01-21
**Status:** Parcial (routers analytics e week-periods não lidos)
**Próximo passo:** Completar Task 2 (schemas e analytics router)
