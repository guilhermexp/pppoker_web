# Schema do Banco de Dados - Modulo Poker

**Data:** 2026-01-31
**Fonte:** `packages/db/src/schema.ts`

---

## Visao Geral

O modulo poker possui 10 tabelas principais, todas isoladas por `team_id` via RLS (Row Level Security) no Supabase. Valores monetarios usam `numeric(14, 2)` para precisao.

---

## Enums

```sql
-- Status do jogador
CREATE TYPE poker_player_status AS ENUM ('active', 'inactive', 'suspended', 'blacklisted');

-- Tipo do jogador
CREATE TYPE poker_player_type AS ENUM ('player', 'agent');

-- Tipo de sessao
CREATE TYPE poker_session_type AS ENUM ('cash_game', 'mtt', 'sit_n_go', 'spin');

-- Variante de jogo
CREATE TYPE poker_game_variant AS ENUM (
  'nlh', 'nlh_6plus', 'nlh_aof',
  'plo4', 'plo5', 'plo6', 'plo4_hilo', 'plo5_hilo', 'plo6_hilo',
  'ofc', 'mixed', 'other'
);

-- Tipo de transacao (12 tipos)
CREATE TYPE poker_transaction_type AS ENUM (
  'buy_in', 'cash_out',
  'credit_given', 'credit_received', 'credit_paid',
  'rake', 'agent_commission', 'rakeback',
  'jackpot', 'adjustment',
  'transfer_in', 'transfer_out'
);

-- Status do settlement
CREATE TYPE poker_settlement_status AS ENUM ('pending', 'partial', 'completed', 'disputed', 'cancelled');

-- Status da importacao
CREATE TYPE poker_import_status AS ENUM ('pending', 'validating', 'validated', 'processing', 'completed', 'failed', 'cancelled');

-- Status do periodo semanal
CREATE TYPE poker_week_period_status AS ENUM ('open', 'closed');

-- Tipo de alerta
CREATE TYPE poker_alert_type AS ENUM (
  'liquidity_low', 'liquidity_critical', 'shark_detected',
  'churn_risk', 'high_debt', 'collusion_suspected', 'unusual_activity'
);

-- Severidade de alerta
CREATE TYPE poker_alert_severity AS ENUM ('info', 'warning', 'critical');

-- Plataforma
CREATE TYPE poker_platform AS ENUM ('pppoker', 'suprema', 'pokerbros', 'fishpoker', 'xpoker', 'other');

-- Tipo de entidade
CREATE TYPE poker_entity_type AS ENUM ('clube_privado', 'clube_liga', 'liga', 'ambos');
```

---

## Tabelas

### 1. poker_players (L3395-3516)

Cadastro de jogadores e agentes com hierarquia auto-referencial.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador unico |
| created_at | TIMESTAMP | Data de criacao |
| updated_at | TIMESTAMP | Data de atualizacao |
| team_id | UUID FK (teams) | Time/organizacao (CASCADE) |
| pppoker_id | TEXT | ID do PPPoker (unique com team_id) |
| nickname | TEXT | Apelido no PPPoker |
| memo_name | TEXT | Nome de memorando |
| country | TEXT | Pais |
| type | ENUM | 'player' ou 'agent' |
| status | ENUM | 'active', 'inactive', 'suspended', 'blacklisted' |
| agent_id | UUID FK (self) | Agente responsavel (SET NULL) |
| super_agent_id | UUID FK (self) | Super agente (SET NULL) |
| phone | TEXT | Telefone |
| whatsapp_number | TEXT | WhatsApp |
| email | TEXT | Email |
| credit_limit | NUMERIC(14,2) | Limite de credito |
| current_balance | NUMERIC(14,2) | Saldo atual |
| chip_balance | NUMERIC(14,2) | Saldo de fichas |
| agent_credit_balance | NUMERIC(14,2) | Saldo de credito do agente |
| risk_score | SMALLINT | Score de risco (default 50) |
| is_vip | BOOLEAN | Flag VIP |
| is_shark | BOOLEAN | Flag de jogador forte |
| last_active_at | TIMESTAMP | Ultima atividade |
| rakeback_percent | NUMERIC(5,2) | % de rakeback (para agentes) |
| customer_id | UUID FK (customers) | Integracao com sistema financeiro |
| note | TEXT | Observacoes |
| metadata | JSONB | Metadados extras |
| fts | TSVECTOR | Full-text search (portugues) |

**Unique:** `(pppoker_id, team_id)`
**Indexes:** team_id, agent_id, super_agent_id, status, type, last_active_at, fts (GIN)

### Hierarquia de Jogadores

```
Super Agente (type=agent, super_agent_id=null)
  +-- Agente (type=agent, super_agent_id=FK)
       +-- Jogador (type=player, agent_id=FK, super_agent_id=FK)
```

---

### 2. poker_sessions (L3522-3614)

Sessoes/partidas de jogo importadas da planilha PPPoker.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMP | Data de criacao |
| team_id | UUID FK (teams) | Time (CASCADE) |
| external_id | TEXT | ID do jogo no PPPoker |
| table_name | TEXT | Nome da mesa |
| session_type | ENUM | cash_game, mtt, sit_n_go, spin |
| game_variant | ENUM | nlh, plo4, plo5, etc. |
| started_at | TIMESTAMP | Inicio da sessao |
| ended_at | TIMESTAMP | Fim da sessao |
| blinds | TEXT | Blinds (ex: "1/2") |
| buy_in_amount | NUMERIC | Valor do buy-in |
| guaranteed_prize | NUMERIC | Premiacao garantida (torneios) |
| total_rake | NUMERIC | Rake total da sessao |
| total_buy_in | NUMERIC | Total de buy-ins |
| total_cash_out | NUMERIC | Total de cash-outs |
| player_count | INT | Quantidade de jogadores |
| hands_played | INT | Maos jogadas |
| created_by_id | UUID FK (poker_players) | Criador da mesa |
| raw_data | JSONB | Dados brutos originais |

**Unique:** `(external_id, team_id)`
**Indexes:** team_id, started_at, session_type, game_variant, (team_id, started_at)

---

### 3. poker_session_players (L3620-3692)

Relacao many-to-many entre sessoes e jogadores com resultados individuais.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMP | Data de criacao |
| team_id | UUID FK (teams) | Time (CASCADE) |
| session_id | UUID FK (poker_sessions) | Sessao (CASCADE) |
| player_id | UUID FK (poker_players) | Jogador (CASCADE) |
| ranking | INT | Posicao final (torneios) |
| buy_in_chips | NUMERIC | Buy-in em fichas |
| buy_in_ticket | NUMERIC | Buy-in com ticket |
| cash_out | NUMERIC | Cash-out |
| winnings | NUMERIC | Ganhos totais |
| rake | NUMERIC | Rake pago |
| rake_ppst | NUMERIC | Rake PPST (torneios) |
| rake_ppsr | NUMERIC | Rake PPSR (cash) |

**Unique:** `(session_id, player_id)`

---

### 4. poker_chip_transactions (L3698-3815)

Todas as movimentacoes de fichas e creditos (12 tipos).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMP | Data de criacao |
| team_id | UUID FK (teams) | Time (CASCADE) |
| occurred_at | TIMESTAMP | Quando ocorreu |
| type | ENUM | 12 tipos de transacao |
| sender_club_id | TEXT | ID do clube remetente |
| sender_player_id | UUID FK (poker_players) | Remetente (SET NULL) |
| recipient_player_id | UUID FK (poker_players) | Destinatario (SET NULL) |
| credit_sent | NUMERIC | Credito enviado |
| credit_redeemed | NUMERIC | Credito resgatado |
| credit_left_club | NUMERIC | Credito que saiu do clube |
| chips_sent | NUMERIC | Fichas enviadas |
| chips_ppsr | NUMERIC | Fichas PPSR |
| chips_ring | NUMERIC | Fichas Ring |
| chips_custom_ring | NUMERIC | Fichas Custom Ring |
| chips_mtt | NUMERIC | Fichas MTT |
| chips_redeemed | NUMERIC | Fichas resgatadas |
| amount | NUMERIC(14,2) | Valor total calculado |
| session_id | UUID FK (poker_sessions) | Sessao vinculada |
| note | TEXT | Observacao |
| raw_data | JSONB | Dados brutos |

**Indexes:** team_id, occurred_at, type, sender_player_id, recipient_player_id

---

### 5. poker_player_summary (L3821-3969)

Resumo agregado por jogador e periodo (aba "Geral" da planilha).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| team_id | UUID FK | Time (CASCADE) |
| period_start | DATE | Inicio do periodo |
| period_end | DATE | Fim do periodo |
| player_id | UUID FK (poker_players) | Jogador (CASCADE) |
| winnings_total | NUMERIC | Total de ganhos |
| winnings_general | NUMERIC | Ganhos gerais |
| winnings_ring | NUMERIC | Ganhos ring games |
| winnings_mtt_sitgo | NUMERIC | Ganhos MTT/SitNGo |
| winnings_spinup | NUMERIC | Ganhos SpinUp |
| winnings_caribbean | NUMERIC | Ganhos Caribbean |
| winnings_color_game | NUMERIC | Ganhos Color Game |
| winnings_crash | NUMERIC | Ganhos Crash |
| winnings_lucky_draw | NUMERIC | Ganhos Lucky Draw |
| winnings_jackpot | NUMERIC | Ganhos Jackpot |
| winnings_ev_split | NUMERIC | Ganhos EV Split |
| club_earnings_general | NUMERIC | Rake geral do clube |
| rake_total | NUMERIC | Rake total |
| rake_ppst | NUMERIC | Rake PPST (torneios) |
| rake_non_ppst | NUMERIC | Rake nao-PPST |
| rake_ppsr | NUMERIC | Rake PPSR (cash) |
| club_earnings_spinup | NUMERIC | Ganhos do clube SpinUp |
| club_earnings_jackpot | NUMERIC | Ganhos do clube Jackpot |
| import_id | UUID FK (poker_imports) | Importacao de origem |

**Unique:** `(player_id, period_start, period_end)`

---

### 6. poker_week_periods (L3975-4050)

Periodos semanais para controle de abertura/fechamento.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMP | Data de criacao |
| updated_at | TIMESTAMP | Data de atualizacao |
| team_id | UUID FK (teams) | Time (CASCADE) |
| week_start | DATE | Inicio da semana (segunda) |
| week_end | DATE | Fim da semana (domingo) |
| status | ENUM | 'open' ou 'closed' |
| closed_at | TIMESTAMP | Quando foi fechada |
| closed_by_id | UUID FK (users) | Quem fechou |
| total_sessions | INT | Snapshot: total de sessoes |
| total_players | INT | Snapshot: total de jogadores |
| total_rake | NUMERIC | Snapshot: rake total |
| total_settlements | INT | Snapshot: settlements criados |
| settlements_gross_amount | NUMERIC | Snapshot: valor bruto |
| settlements_net_amount | NUMERIC | Snapshot: valor liquido |
| note | TEXT | Observacao de fechamento |

**Unique:** `(team_id, week_start)`

---

### 7. poker_settlements (L4056-4180)

Acertos financeiros semanais por jogador/agente.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMP | Data de criacao |
| updated_at | TIMESTAMP | Data de atualizacao |
| team_id | UUID FK (teams) | Time (CASCADE) |
| period_start | DATE | Inicio do periodo |
| period_end | DATE | Fim do periodo |
| week_period_id | UUID FK (poker_week_periods) | Periodo semanal |
| status | ENUM | pending, partial, completed, disputed, cancelled |
| player_id | UUID FK (poker_players) | Jogador do settlement |
| agent_id | UUID FK (poker_players) | Agente do jogador |
| gross_amount | NUMERIC(14,2) | Valor bruto (chip_balance) |
| rakeback_amount | NUMERIC(14,2) | Valor do rakeback |
| rakeback_percent_used | NUMERIC(5,2) | % aplicado (historico) |
| commission_amount | NUMERIC(14,2) | Comissao |
| adjustment_amount | NUMERIC(14,2) | Ajustes manuais |
| net_amount | NUMERIC(14,2) | Valor liquido final |
| paid_amount | NUMERIC(14,2) | Valor ja pago |
| paid_at | TIMESTAMP | Quando foi pago |
| transaction_id | UUID FK (transactions) | Integracao financeira |
| invoice_id | UUID FK (invoices) | Integracao faturamento |
| created_by_id | UUID FK (users) | Quem criou |
| note | TEXT | Observacao |

**Indexes:** team_id, player_id, agent_id, status, (period_start, period_end), week_period_id

---

### 8. poker_imports (L4185-4258)

Historico de importacoes de planilhas com auditoria completa.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMP | Data de criacao |
| updated_at | TIMESTAMP | Data de atualizacao |
| team_id | UUID FK (teams) | Time (CASCADE) |
| file_name | TEXT | Nome do arquivo |
| file_size | INT | Tamanho em bytes |
| file_type | TEXT | Tipo MIME |
| status | ENUM | pending -> validating -> validated -> processing -> completed |
| period_start | DATE | Inicio do periodo importado |
| period_end | DATE | Fim do periodo importado |
| total_players | INT | Jogadores detectados |
| total_sessions | INT | Sessoes detectadas |
| total_transactions | INT | Transacoes detectadas |
| new_players | INT | Jogadores novos |
| updated_players | INT | Jogadores atualizados |
| validation_passed | BOOLEAN | Se passou na validacao |
| validation_errors | JSONB | Erros de validacao |
| validation_warnings | JSONB | Avisos de validacao |
| processed_at | TIMESTAMP | Quando foi processado |
| processed_by_id | UUID FK (users) | Quem processou |
| processing_errors | JSONB | Erros de processamento |
| raw_data | JSONB | Snapshot completo dos dados |
| committed | BOOLEAN | Se dados estao finalizados |
| committed_at | TIMESTAMP | Quando foi committed |
| committed_by_id | UUID FK (users) | Quem committed |

---

### 9. poker_alerts (L4263-4334)

Sistema de alertas automaticos.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| team_id | UUID FK | Time |
| type | ENUM | 7 tipos de alerta |
| severity | ENUM | info, warning, critical |
| title | TEXT | Titulo do alerta |
| message | TEXT | Mensagem detalhada |
| player_id | UUID FK | Jogador relacionado |
| session_id | UUID FK | Sessao relacionada |
| is_read | BOOLEAN | Se foi lido |
| is_dismissed | BOOLEAN | Se foi descartado |
| dismissed_at | TIMESTAMP | Quando descartou |
| dismissed_by_id | UUID FK (users) | Quem descartou |
| metadata | JSONB | Dados extras |

---

### 10. poker_team_clubs (L4340-4390)

Mapeamento de clubes dentro de uma liga (Super Union).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| liga_team_id | UUID FK (teams) | Liga proprietaria (CASCADE) |
| club_id | TEXT | ID do clube na plataforma |
| club_name | TEXT | Nome do clube |
| linked_team_id | UUID FK (teams) | Time vinculado se existir |

**Unique:** `(liga_team_id, club_id)`

---

## Diagrama de Relacionamentos

```
teams
  |
  +-- poker_players <-------------- agent_id (self-ref)
  |     |  |  |                     super_agent_id (self-ref)
  |     |  |  +-- poker_session_players ---- poker_sessions
  |     |  +-- poker_chip_transactions ----------+
  |     +-- poker_player_summary ------- poker_imports
  |                                         |
  +-- poker_week_periods ------- poker_settlements
  |                                 |    |
  |                                 |    +-- transactions (sistema financeiro)
  |                                 +-- invoices (faturamento)
  +-- poker_team_clubs (liga -> clube)
  +-- poker_alerts
```

---

## Padroes de Acesso

Todos os routers usam **Supabase client direto** (nao Drizzle ORM nos routers):

```typescript
const { data } = await supabase
  .from("poker_players")
  .select("*")
  .eq("team_id", teamId)
  .order("created_at", { ascending: false });
```

As queries do `packages/db/src/queries/` usam Drizzle ORM para queries reutilizaveis.

---

**Ultima atualizacao:** 2026-01-31
