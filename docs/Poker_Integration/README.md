# Poker Integration - Documentacao Atualizada

> Ultima atualizacao: 22/12/2025
> Estado atual do modulo de poker no projeto Mid

## Visao Geral

O modulo de poker gerencia clubes PPPoker, incluindo jogadores, sessoes, transacoes, acertos e importacao de dados.

---

## Arquitetura

```
apps/
├── api/src/
│   ├── schemas/poker/        # Schemas Zod
│   │   ├── players.ts
│   │   ├── sessions.ts
│   │   ├── settlements.ts
│   │   ├── transactions.ts
│   │   ├── imports.ts
│   │   └── team-settings.ts
│   └── trpc/routers/poker/   # Routers tRPC
│       ├── index.ts
│       ├── players.ts
│       ├── sessions.ts
│       ├── settlements.ts
│       ├── transactions.ts
│       ├── imports.ts
│       └── analytics.ts
│
├── dashboard/src/
│   ├── app/[locale]/(app)/(sidebar)/poker/  # Paginas
│   │   ├── page.tsx           # Overview
│   │   ├── players/page.tsx
│   │   ├── agents/page.tsx
│   │   ├── sessions/page.tsx
│   │   ├── settlements/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── import/page.tsx
│   │   └── league-import/page.tsx
│   │
│   ├── components/poker/      # Componentes
│   │   ├── import-uploader.tsx
│   │   ├── import-validation-modal.tsx
│   │   ├── validation-tabs/*.tsx
│   │   └── *-header.tsx, *-filters.tsx
│   │
│   ├── components/league/     # Componentes de Liga
│   │   ├── league-import-uploader.tsx
│   │   ├── league-import-validation-modal.tsx
│   │   └── validation-tabs/*.tsx
│   │
│   ├── components/widgets/poker/  # Widgets Dashboard
│   │   ├── index.tsx
│   │   ├── top-players-widget.tsx
│   │   ├── debtors-widget.tsx
│   │   ├── gross-rake-widget.tsx
│   │   ├── bank-result-widget.tsx
│   │   ├── revenue-by-game-widget.tsx
│   │   ├── recent-transactions-widget.tsx
│   │   ├── sessions-by-type-widget.tsx
│   │   └── rake-trend-widget.tsx
│   │
│   ├── components/sheets/     # Sheets (Modais)
│   │   ├── poker-player-detail-sheet.tsx
│   │   ├── poker-session-detail-sheet.tsx
│   │   └── global-sheets.tsx
│   │
│   ├── lib/poker/             # Logica de Negocio
│   │   ├── types.ts
│   │   └── validation.ts
│   │
│   ├── lib/league/            # Logica de Liga
│   │   ├── types.ts
│   │   └── validation.ts
│   │
│   └── hooks/                 # Hooks
│       ├── use-poker-player-params.ts
│       ├── use-poker-session-params.ts
│       ├── use-poker-settlement-params.ts
│       └── use-poker-transaction-params.ts
│
packages/
└── db/migrations/
    └── 0001_poker_club_management.sql  # Schema DB
```

---

## Schema do Banco de Dados

### Tabelas Principais

| Tabela | Descricao |
|--------|-----------|
| `poker_players` | Jogadores e agentes |
| `poker_sessions` | Sessoes/partidas de jogo |
| `poker_session_players` | Jogadores em cada sessao |
| `poker_chip_transactions` | Movimentacoes de fichas/credito |
| `poker_player_summary` | Resumo mensal por jogador |
| `poker_settlements` | Acertos/pagamentos |
| `poker_imports` | Historico de importacoes |
| `poker_alerts` | Alertas (shark, churn, fraude) |

### Enums

```sql
-- Tipo de jogador
CREATE TYPE poker_player_type AS ENUM ('player', 'agent');

-- Status do jogador
CREATE TYPE poker_player_status AS ENUM (
  'active', 'inactive', 'suspended', 'blacklisted'
);

-- Tipo de sessao
CREATE TYPE poker_session_type AS ENUM (
  'cash_game', 'mtt', 'sit_n_go', 'spin'
);

-- Variante do jogo
CREATE TYPE poker_game_variant AS ENUM (
  'nlh', 'nlh_6plus', 'nlh_aof',
  'plo4', 'plo5', 'plo6',
  'plo4_hilo', 'plo5_hilo', 'plo6_hilo',
  'ofc', 'mixed', 'other'
);

-- Tipo de transacao
CREATE TYPE poker_transaction_type AS ENUM (
  'buy_in', 'cash_out',
  'credit_given', 'credit_received', 'credit_paid',
  'rake', 'agent_commission', 'rakeback',
  'jackpot', 'adjustment',
  'transfer_in', 'transfer_out'
);

-- Status do acerto
CREATE TYPE poker_settlement_status AS ENUM (
  'pending', 'partial', 'completed', 'disputed', 'cancelled'
);

-- Status da importacao
CREATE TYPE poker_import_status AS ENUM (
  'pending', 'validating', 'validated',
  'processing', 'completed', 'failed', 'cancelled'
);

-- Tipo de alerta
CREATE TYPE poker_alert_type AS ENUM (
  'liquidity_low', 'liquidity_critical',
  'shark_detected', 'churn_risk', 'high_debt',
  'collusion_suspected', 'unusual_activity'
);
```

### Tabela poker_players

```sql
CREATE TABLE poker_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),

  -- Identificacao PPPoker
  pppoker_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  memo_name TEXT,
  country TEXT,

  -- Tipo e Status
  type poker_player_type DEFAULT 'player',
  status poker_player_status DEFAULT 'active',

  -- Hierarquia de Agentes
  agent_id UUID REFERENCES poker_players(id),
  super_agent_id UUID REFERENCES poker_players(id),

  -- Contato
  phone TEXT,
  whatsapp_number TEXT,
  email TEXT,

  -- Financeiro
  credit_limit NUMERIC(14,2) DEFAULT 0,
  current_balance NUMERIC(14,2) DEFAULT 0,
  chip_balance NUMERIC(14,2) DEFAULT 0,
  agent_credit_balance NUMERIC(14,2) DEFAULT 0,

  -- Classificacao
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  is_vip BOOLEAN DEFAULT false,
  is_shark BOOLEAN DEFAULT false,

  -- Rakeback (para agentes)
  rakeback_percent NUMERIC(5,2),

  -- Vinculacao
  customer_id UUID REFERENCES customers(id),
  last_active_at TIMESTAMPTZ,

  -- Metadata
  note TEXT,
  metadata JSONB DEFAULT '{}',

  -- FTS
  fts TSVECTOR,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, pppoker_id)
);
```

### Tabela poker_sessions

```sql
CREATE TABLE poker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  external_id TEXT NOT NULL,

  -- Identificacao
  table_name TEXT,
  session_type poker_session_type NOT NULL,
  game_variant poker_game_variant DEFAULT 'nlh',

  -- Temporalidade
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Configuracao
  blinds TEXT,
  buy_in_amount NUMERIC(14,2),
  guaranteed_prize NUMERIC(14,2),

  -- Totais
  total_rake NUMERIC(14,2) DEFAULT 0,
  total_buy_in NUMERIC(14,2) DEFAULT 0,
  total_cash_out NUMERIC(14,2) DEFAULT 0,
  player_count INTEGER DEFAULT 0,
  hands_played INTEGER DEFAULT 0,

  -- Criador
  created_by_id UUID REFERENCES poker_players(id),

  -- Raw data
  raw_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, external_id)
);
```

### Tabela poker_chip_transactions

```sql
CREATE TABLE poker_chip_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  occurred_at TIMESTAMPTZ NOT NULL,

  type poker_transaction_type NOT NULL,

  -- Partes
  sender_club_id TEXT,
  sender_player_id UUID REFERENCES poker_players(id),
  recipient_player_id UUID REFERENCES poker_players(id),

  -- Credito
  credit_sent NUMERIC(14,2) DEFAULT 0,
  credit_redeemed NUMERIC(14,2) DEFAULT 0,
  credit_left_club NUMERIC(14,2) DEFAULT 0,

  -- Fichas
  chips_sent NUMERIC(14,2) DEFAULT 0,
  chips_ppsr NUMERIC(14,2) DEFAULT 0,
  chips_ring NUMERIC(14,2) DEFAULT 0,
  chips_custom_ring NUMERIC(14,2) DEFAULT 0,
  chips_mtt NUMERIC(14,2) DEFAULT 0,
  chips_redeemed NUMERIC(14,2) DEFAULT 0,

  -- Valor total calculado
  amount NUMERIC(14,2) NOT NULL,

  -- Vinculacao
  session_id UUID REFERENCES poker_sessions(id),

  -- Metadata
  note TEXT,
  raw_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Routers tRPC

### poker.players

| Procedimento | Tipo | Descricao |
|--------------|------|-----------|
| `get` | query | Lista paginada com filtros |
| `getById` | query | Detalhe de um jogador |
| `getAgents` | query | Lista apenas agentes ativos |
| `getPlayersByAgent` | query | Jogadores de um agente |
| `getStats` | query | Estatisticas gerais |
| `checkExistingByPpPokerIds` | query | Verificar IDs existentes |
| `upsert` | mutation | Criar ou atualizar jogador |
| `delete` | mutation | Deletar jogador |
| `updateStatus` | mutation | Mudar status |
| `bulkCreate` | mutation | Criar multiplos em batch |

### poker.sessions

| Procedimento | Tipo | Descricao |
|--------------|------|-----------|
| `get` | query | Lista paginada com filtros |
| `getById` | query | Detalhe com session_players |
| `getStats` | query | Estatisticas por periodo |
| `upsert` | mutation | Criar ou atualizar |
| `delete` | mutation | Deletar |

### poker.transactions

| Procedimento | Tipo | Descricao |
|--------------|------|-----------|
| `get` | query | Lista com filtros |
| `getById` | query | Detalhe completo |
| `getStats` | query | Estatisticas por periodo/jogador |
| `delete` | mutation | Deletar |

### poker.settlements

| Procedimento | Tipo | Descricao |
|--------------|------|-----------|
| `get` | query | Lista com filtros |
| `getById` | query | Detalhe completo |
| `getStats` | query | Estatisticas |
| `create` | mutation | Criar acerto manual |
| `updateStatus` | mutation | Mudar status |
| `markPaid` | mutation | Marcar como pago |
| `delete` | mutation | Deletar |
| `closeWeek` | mutation | Fechar semana (criar acertos) |

### poker.imports

| Procedimento | Tipo | Descricao |
|--------------|------|-----------|
| `get` | query | Lista de imports |
| `getById` | query | Detalhe com raw_data |
| `create` | mutation | Criar import record |
| `validate` | mutation | Validar estrutura |
| `process` | mutation | Processar em 8 steps |
| `cancel` | mutation | Cancelar |
| `delete` | mutation | Deletar |

### poker.analytics

| Procedimento | Tipo | Descricao |
|--------------|------|-----------|
| `getOverview` | query | Contadores principais |
| `getGrossRake` | query | Rake total por periodo |
| `getBankResult` | query | Chips in - chips out |
| `getWeeklyNetting` | query | Acertos dos ultimos 7 dias |
| `getTopPlayers` | query | Top 5+ por chip_balance |
| `getRevenueByGameType` | query | Distribuicao por tipo |
| `getDebtors` | query | Jogadores com saldo negativo |
| `getSessionsByType` | query | Breakdown por session_type |
| `getRakeTrend` | query | Rake por semana |

---

## Paginas do Dashboard

| Rota | Descricao |
|------|-----------|
| `/poker` | Overview com widgets de analytics |
| `/poker/players` | CRUD de jogadores |
| `/poker/agents` | Gerenciar agentes |
| `/poker/sessions` | Historico de partidas |
| `/poker/settlements` | Acertos e pagamentos |
| `/poker/transactions` | Movimentacao de fichas |
| `/poker/import` | Upload de Excel (clube) |
| `/poker/league-import` | Upload de Excel (liga) |

---

## Widgets do Dashboard

| Widget | Descricao |
|--------|-----------|
| `PokerOverviewWidget` | Contadores: jogadores, agentes, ativos, pendentes |
| `TopPlayersWidget` | Top 5 jogadores por saldo |
| `DebtorsWidget` | Lista de devedores |
| `GrossRakeWidget` | Total rake coletado |
| `BankResultWidget` | Resultado de caixa |
| `RevenueByGameWidget` | Grafico pizza por tipo de jogo |
| `RecentTransactionsWidget` | Ultimas transacoes |
| `SessionsByTypeWidget` | Grafico pizza por tipo de sessao |
| `RakeTrendWidget` | Grafico linha rake por semana |

---

## Fluxo de Importacao (Clube)

```
1. Upload arquivo .xlsx
   └── components/poker/import-uploader.tsx

2. Parse de cada aba
   ├── parseGeralSheet() -> summaries[]
   ├── parseDetalhadoSheet() -> detailed[]
   ├── parsePartidasSheet() -> sessions[]
   ├── parseTransacoesSheet() -> transactions[]
   ├── parseUsuariosSheet() -> players[]
   └── parseRakebackSheet() -> rakebacks[]

3. Validacao
   └── lib/poker/validation.ts -> validateImportData()

4. Modal de Validacao (8 abas)
   ├── Visao Geral
   ├── Cadastro (jogadores)
   ├── Resumo (aba Geral)
   ├── Partidas
   ├── Transacoes
   ├── Agentes
   ├── Validacao
   └── Avisos

5. Aprovacao pelo usuario

6. Processamento (8 steps)
   ├── Step 1: Batch upsert players (Detalhes do usuario)
   ├── Step 2: Batch upsert summary players (aba Geral)
   ├── Step 3: Map player IDs (pppoker_id -> UUID)
   ├── Step 4: Batch insert transactions
   ├── Step 5: Batch upsert sessions
   ├── Step 6: Map session IDs
   ├── Step 7: Batch upsert session_players
   └── Step 8: Batch upsert player_summary
```

---

## Seguranca

- **RLS**: Todas as tabelas tem Row Level Security habilitado
- **Autenticacao**: Routers usam `protectedProcedure`
- **Validacao**: Zod em todas as inputs
- **Team Isolation**: Dados isolados por `team_id`

---

## Pendencias

### Liga (Prioridade Alta)
- [ ] Backend para processar importacao de ligas
- [ ] Tabelas para armazenar dados de ligas (se separado)
- [ ] Parser para PPSR (cash games de liga)

### Melhorias
- [ ] Regras de consistencia no validador de clubes
- [ ] Regras matematicas no validador de clubes
- [ ] Deteccao de sharks
- [ ] Analise de risco de churn
- [ ] Deteccao de conluio

### UI/UX
- [ ] Graficos interativos de performance
- [ ] Exportacao de relatorios
- [ ] Notificacoes de alertas
