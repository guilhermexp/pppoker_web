# Plano: Poker Club Management SaaS (Mid.Poker)

## Resumo Executivo

Transformar o SaaS de gestão financeira existente em um **Sistema de Gestão de Clubes de Poker Online** para clubes PPPoker, mantendo toda infraestrutura existente e adicionando módulos específicos para poker.

### Decisões do Usuário
- **Modelo**: SaaS Multi-clube (vender para outros clubes)
- **Importação**: Todas opções (CSV, Google Sheets, API PPPoker)
- **Agentes**: Afiliados com comissão sobre rake
- **Moeda**: Multi-moeda com conversão

---

## 1. ESTRUTURA DE BANCO DE DADOS

### 1.1 Novos Enums

```typescript
// packages/db/src/schema.ts

export const pokerPlayerStatusEnum = pgEnum("poker_player_status", [
  "active", "inactive", "suspended", "blacklisted"
]);

export const pokerPlayerTypeEnum = pgEnum("poker_player_type", [
  "player", "agent"
]);

export const pokerGameVariantEnum = pgEnum("poker_game_variant", [
  "nlh", "plo4", "plo5", "plo6", "ofc", "shortdeck", "mixed", "other"
]);

export const pokerSessionTypeEnum = pgEnum("poker_session_type", [
  "cash_game", "tournament", "spin"
]);

export const pokerTransactionTypeEnum = pgEnum("poker_transaction_type", [
  "buy_in", "cash_out", "credit_given", "credit_paid",
  "rake", "agent_commission", "jackpot", "adjustment"
]);

export const settlementStatusEnum = pgEnum("settlement_status", [
  "pending", "partial", "completed", "disputed"
]);
```

### 1.2 Tabelas Principais

| Tabela | Descrição | Fonte CSV |
|--------|-----------|-----------|
| `poker_players` | Jogadores e Agentes | Detalhes do usuário.csv |
| `poker_sessions` | Sessões de jogo | Partidas.csv |
| `poker_session_players` | Participantes por sessão | Partidas.csv |
| `poker_chip_transactions` | Movimentações de fichas | Transações.csv |
| `poker_settlements` | Acertos semanais | Retorno de taxa.csv |
| `poker_rake_records` | Registros de rake | Geral.csv |
| `poker_player_badges` | Badges de risco/status | Calculado |
| `poker_alerts` | Alertas de liquidez/fraude | Calculado |
| `poker_imports` | Histórico de importações | Sistema |
| `shared_blacklist` | Blacklist compartilhada (anônima) | Sistema |

### 1.3 Esquema Detalhado das Tabelas

#### poker_players
```sql
CREATE TABLE poker_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- PPPoker identity
  pppoker_id TEXT NOT NULL,
  nickname TEXT NOT NULL,

  -- Classification
  type poker_player_type DEFAULT 'player',
  status poker_player_status DEFAULT 'active',
  agent_id UUID REFERENCES poker_players(id) ON DELETE SET NULL,

  -- Contact
  phone TEXT,
  whatsapp_number TEXT,
  email TEXT,

  -- Financial
  credit_limit NUMERIC(12,2) DEFAULT 0,
  current_balance NUMERIC(12,2) DEFAULT 0,

  -- Risk management
  risk_score SMALLINT DEFAULT 50,
  is_vip BOOLEAN DEFAULT false,
  is_shark BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ,

  -- Links
  customer_id UUID REFERENCES customers(id),
  note TEXT,
  fts TSVECTOR GENERATED ALWAYS AS (...),

  UNIQUE(pppoker_id, team_id)
);
```

#### poker_sessions
```sql
CREATE TABLE poker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  external_id TEXT,
  session_type poker_session_type DEFAULT 'cash_game',
  game_variant poker_game_variant DEFAULT 'nlh',

  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  blinds TEXT,
  table_name TEXT,

  total_rake NUMERIC(12,2) DEFAULT 0,
  total_buy_in NUMERIC(12,2) DEFAULT 0,
  total_cash_out NUMERIC(12,2) DEFAULT 0,
  player_count INTEGER DEFAULT 0,
  hands_played INTEGER DEFAULT 0,

  raw_data JSONB
);
```

#### poker_settlements
```sql
CREATE TABLE poker_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status settlement_status DEFAULT 'pending',

  player_id UUID REFERENCES poker_players(id),
  agent_id UUID REFERENCES poker_players(id),

  gross_amount NUMERIC(12,2) NOT NULL,
  rakeback_amount NUMERIC(12,2) DEFAULT 0,
  commission_amount NUMERIC(12,2) DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL,

  paid_amount NUMERIC(12,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,

  -- Links to existing system
  transaction_id UUID REFERENCES transactions(id),
  invoice_id UUID REFERENCES invoices(id),

  note TEXT
);
```

---

## 2. ESTRUTURA DE ROTAS (tRPC)

### 2.1 Novos Routers

```
apps/api/src/trpc/routers/poker/
├── players.ts           # CRUD jogadores/agentes
├── sessions.ts          # Sessões de jogo
├── chip-transactions.ts # Movimentações
├── settlements.ts       # Acertos semanais
├── rake.ts              # Tracking de rake
├── imports.ts           # Importação CSV
├── analytics.ts         # Analytics/BI
├── alerts.ts            # Alertas
├── treasury.ts          # Tesouraria
└── audit.ts             # Auditoria
```

### 2.2 Endpoints Principais

#### pokerPlayers
- `get` - Lista com paginação cursor, filtros
- `getById` - Detalhes do jogador
- `upsert` - Criar/atualizar
- `delete` - Remover
- `getAgents` - Apenas agentes
- `getPlayersByAgent` - Jogadores por agente
- `checkBlacklist` - Verificar blacklist compartilhada

#### pokerSettlements
- `get` - Lista de acertos
- `calculate` - **"Fechar Semana"** - calcula acertos
- `create` - Criar acerto manual
- `markPaid` - Marcar como pago
- `generateInvoice` - Gerar fatura

#### pokerImports
- `uploadCsv` - Upload de arquivo
- `parseGeral` - Processar Geral.csv
- `parseTransacoes` - Processar Transações.csv
- `parsePartidas` - Processar Partidas.csv
- `parseUsuarios` - Processar Detalhes usuário.csv
- `parseDetalhado` - Processar Detalhado.csv
- `syncGoogleSheets` - Sincronizar Sheets

#### pokerAnalytics
- `getGrossRake` - Rake bruto (widget)
- `getBankResult` - Resultado banca (widget)
- `getWeeklyNetting` - Netting semanal (widget)
- `getLiquidityAlert` - Alerta liquidez
- `getRevenueByGameType` - Mix receita (donut)
- `getProfitabilityRanking` - Ranking lucratividade
- `getSharkPlayers` - Jogadores shark (ROI > 20%)
- `getChurnRiskPlayers` - Risco de churn
- `getDebtors` - Devedores

---

## 3. ESTRUTURA DE PÁGINAS (Frontend)

### 3.1 Novas Rotas

```
apps/dashboard/src/app/[locale]/(app)/(sidebar)/poker/
├── page.tsx                    # Dashboard (Torre de Controle)
├── players/
│   └── page.tsx                # CRM Jogadores
├── agents/
│   └── page.tsx                # Gestão Agentes
├── sessions/
│   └── page.tsx                # Auditoria (Sheriff)
├── treasury/
│   └── page.tsx                # Tesouraria (Cofre)
├── settlements/
│   └── page.tsx                # Acertos Semanais
├── analytics/
│   └── page.tsx                # Business Intelligence
├── import/
│   └── page.tsx                # Importação Dados
└── settings/
    └── page.tsx                # Configurações Poker
```

### 3.2 Navegação Sidebar

```typescript
const pokerNavItems = [
  { href: "/poker", label: "Dashboard", icon: Icons.LayoutDashboard },
  { href: "/poker/players", label: "Jogadores", icon: Icons.Users },
  { href: "/poker/agents", label: "Agentes", icon: Icons.UserCog },
  { href: "/poker/sessions", label: "Sessões", icon: Icons.History },
  { href: "/poker/treasury", label: "Tesouraria", icon: Icons.Vault },
  { href: "/poker/settlements", label: "Acertos", icon: Icons.Calculator },
  { href: "/poker/analytics", label: "Analytics", icon: Icons.BarChart },
  { href: "/poker/import", label: "Importar", icon: Icons.Upload },
];
```

---

## 4. WIDGETS DO DASHBOARD

### 4.1 Novos Widgets

| Widget | Descrição | Dados |
|--------|-----------|-------|
| `poker-gross-rake` | Rake Bruto | pokerAnalytics.getGrossRake |
| `poker-bank-result` | Resultado da Banca | pokerAnalytics.getBankResult |
| `poker-weekly-netting` | Netting Semanal | pokerAnalytics.getWeeklyNetting |
| `poker-liquidity-alert` | Alerta Liquidez | pokerAnalytics.getLiquidityAlert |
| `poker-revenue-by-game` | Mix Receita (Donut) | pokerAnalytics.getRevenueByGameType |
| `poker-top-players` | Top Jogadores | pokerAnalytics.getPlayerPerformance |
| `poker-debt-overview` | Visão Dívidas | pokerAnalytics.getDebtors |
| `poker-close-week` | Botão "Fechar Semana" | pokerSettlements.calculate |

### 4.2 Arquivos de Widget

```
components/widgets/poker/
├── gross-rake.tsx
├── bank-result.tsx
├── weekly-netting.tsx
├── liquidity-alert.tsx
├── revenue-by-game.tsx
├── top-players.tsx
├── debt-overview.tsx
└── close-week-action.tsx
```

---

## 5. SISTEMA DE IMPORTAÇÃO - MAPEAMENTO COMPLETO PPPoker

### 5.0 Visão Geral das Planilhas

O PPPoker exporta um arquivo Excel com 7 abas. Estrutura identificada:

| Aba | Colunas | Linhas | Descrição |
|-----|---------|--------|-----------|
| Geral | 48 | 338 | Resumo por jogador (ganhos por tipo de jogo) |
| Detalhado | 137 | 371 | Breakdown granular por variante de jogo |
| Partidas | 17 | 23,594 | Sessões de jogo (estrutura complexa aninhada) |
| Transações | 21 | 2,147 | Movimentações de fichas e crédito |
| Demonstrativo | 6 | 2 | Disclaimer legal (ignorar) |
| Detalhes do usuário | 12 | 2,405 | Cadastro de jogadores |
| Retorno de taxa | 8 | 94 | Percentual de rakeback por agente |

---

### 5.1 Aba "Geral" → poker_player_summary + poker_rake_records

**48 colunas, 338 linhas** - Resumo consolidado por jogador

| Coluna | Header PPPoker | Campo Interno | Tipo |
|--------|---------------|---------------|------|
| B | ID do jogador | `pppoker_id` | int |
| C | País/região | `country` | str |
| D | Apelido | `nickname` | str |
| E | Nome de memorando | `memo_name` | str |
| F | Agente | `agent_nickname` | str |
| G | ID do agente | `agent_pppoker_id` | int |
| H | Superagente | `super_agent_nickname` | str |
| I | ID do superagente | `super_agent_pppoker_id` | str |
| **Ganhos do Jogador** ||||
| J | Geral + Eventos | `player_winnings_total` | float |
| O | Geral | `player_winnings_general` | float |
| P | Ring Games | `player_winnings_ring` | float |
| Q | MTT SitNGo | `player_winnings_mtt_sitgo` | float |
| R | SPINUP | `player_winnings_spinup` | float |
| S | Caribbean+ | `player_winnings_caribbean` | float |
| T | COLOR GAME | `player_winnings_color_game` | float |
| U | CRASH | `player_winnings_crash` | float |
| V | LUCKY DRAW | `player_winnings_lucky_draw` | float |
| W | Jackpot | `player_winnings_jackpot` | float |
| X | Dividir EV | `player_winnings_ev_split` | float |
| **Ganhos do Clube (Rake)** ||||
| AB | Geral | `club_earnings_general` | float |
| AC | Taxa | `rake_total` | float |
| AD | Taxa PPST | `rake_ppst` | float |
| AE | Taxa não PPST | `rake_non_ppst` | float |
| AF | Taxa PPSR | `rake_ppsr` | float |
| AG | SPINUP | `club_earnings_spinup` | float |
| AH | Caribbean+ | `club_earnings_caribbean` | float |
| AI | COLOR GAME | `club_earnings_color_game` | float |
| AJ | CRASH | `club_earnings_crash` | float |
| AK | LUCKY DRAW | `club_earnings_lucky_draw` | float |
| AL | Jackpot | `club_earnings_jackpot` | float |
| AM-AT | Dividir EV / Outros | `club_earnings_other` | float |

---

### 5.2 Aba "Detalhado" → poker_player_game_breakdown

**137 colunas, 371 linhas** - Mesma estrutura base + granularidade por variante

| Grupo | Variantes Incluídas |
|-------|---------------------|
| NLHoldem | Regular, 3-1, 3-1F, 6+, AOF, SitNGo, SPINUP, MTT NLH, MTT 6+ |
| PLO | PLO4, PLO5, PLO6, PLO4 H/L, PLO5 H/L, PLO6 H/L |
| OFC | Open Face Chinese |
| Outros | Caribbean+, COLOR GAME, CRASH, LUCKY DRAW |

**Colunas-chave para variantes (sob "Ganhos do jogador")**:
- NLHoldem Regular, NLHoldem 3-1, NLHoldem 3-1F
- NLHoldem 6+, NLHoldem AOF
- SitNGo, SPINUP
- MTT NLH, MTT 6+
- PLO4, PLO5, PLO6
- PLO4 H/L, PLO5 H/L, PLO6 H/L

---

### 5.3 Aba "Partidas" → poker_sessions + poker_session_players

**17 colunas, 23,594 linhas** - Estrutura complexa aninhada

**IMPORTANTE**: Esta aba tem estrutura não-tabular. Cada sessão tem:
- **Linha de header** com metadados (merged cells B-O)
- **Linhas de jogadores** com resultados individuais

**Metadados extraídos do header (linha 2-4)**:
```
Linha 2: "Início: 2025/11/24 00:00   By pp8590048(8590048)   Fim: 2025/11/24 04:10"
Linha 3: "ID do jogo: 251124094743-99638270   Nome da mesa: REENTRY"
Linha 4: "PPST/NLH   Buy-in: 9+1   Premiação Garantida: 1000"
```

**Parser deve extrair**:
| Campo | Regex/Padrão | Exemplo |
|-------|--------------|---------|
| `started_at` | `Início: (\d{4}/\d{2}/\d{2} \d{2}:\d{2})` | 2025/11/24 00:00 |
| `ended_at` | `Fim: (\d{4}/\d{2}/\d{2} \d{2}:\d{2})` | 2025/11/24 04:10 |
| `created_by_id` | `By pp(\d+)` | 8590048 |
| `game_id` | `ID do jogo: ([\d-]+)` | 251124094743-99638270 |
| `table_name` | `Nome da mesa: (.+)` | REENTRY |
| `game_type` | `^(PPST/NLH\|PLO4\|...)` | PPST/NLH |
| `buy_in` | `Buy-in: (\d+\+\d+)` | 9+1 |
| `guaranteed` | `Premiação Garantida: (\d+)` | 1000 |

**Colunas por jogador (linha 5 = header de dados)**:

| Coluna | Header | Campo Interno | Tipo |
|--------|--------|---------------|------|
| B | ID do jogador | `player_pppoker_id` | int |
| C | Apelido | `player_nickname` | str |
| D | Nome de memorando | `player_memo` | str |
| E | Ranking | `ranking` | int |
| F | Buy-in de fichas | `buy_in_chips` | float |
| G | Buy-in de ticket | `buy_in_ticket` | float |
| H | Ganhos | `winnings` | float |
| I | Taxa | `rake` | float |
| J-Q | Taxa (colunas adicionais) | `rake_extra` | float[] |

---

### 5.4 Aba "Transações" → poker_chip_transactions

**21 colunas, 2,147 linhas** - Movimentações de fichas e crédito

| Coluna | Header | Campo Interno | Tipo |
|--------|--------|---------------|------|
| A | Tempo | `occurred_at` | datetime |
| **Remetente** ||||
| B | ID de clube | `sender_club_id` | int |
| C | ID do jogador | `sender_player_id` | int |
| D | Apelido | `sender_nickname` | str |
| E | Nome de memorando | `sender_memo` | str |
| **Destinatário** ||||
| F | ID do jogador | `recipient_player_id` | int |
| G | Apelido | `recipient_nickname` | str |
| H | Nome de memorando | `recipient_memo` | str |
| **Dar crédito** ||||
| I | Enviado | `credit_sent` | float |
| J | Resgatado | `credit_redeemed` | float |
| K | Saiu do clube | `credit_left_club` | float |
| **Fichas** ||||
| L | Enviado | `chips_sent` | float |
| M | Classificação PPSR | `chips_ppsr` | float |
| N | Classificação Ring Game | `chips_ring` | float |
| O | Classificação RG Personalizado | `chips_custom_ring` | float |
| P | Classificação MTT | `chips_mtt` | float |
| Q | Resgatado | `chips_redeemed` | float |

**Formato de data**: `2025-11-24 10:13:28` (str → parse para TIMESTAMPTZ)

---

### 5.5 Aba "Detalhes do usuário" → poker_players

**12 colunas, 2,405 linhas** - Cadastro completo de jogadores

| Coluna | Header | Campo Interno | Tipo |
|--------|--------|---------------|------|
| A | Última conexão | `last_active_at` | datetime |
| B | ID do jogador | `pppoker_id` | int |
| C | País/região | `country` | str |
| D | Apelido | `nickname` | str |
| E | Nome de memorando | `memo_name` | str |
| F | Saldo de fichas PP | `chip_balance` | float |
| G | Agente | `agent_nickname` | str |
| H | ID do agente | `agent_pppoker_id` | str |
| I | Saldo de crédito do agente | `agent_credit_balance` | float |
| J | Superagente | `super_agent_nickname` | str |
| K | ID do superagente | `super_agent_pppoker_id` | str |

**Formato de data**: `2025-12-11 04:20:36` (str → parse para TIMESTAMPTZ)

---

### 5.6 Aba "Retorno de taxa" → poker_agent_rakeback

**8 colunas, 94 linhas** - Configuração de rakeback por agente

| Coluna | Header | Campo Interno | Tipo |
|--------|--------|---------------|------|
| B | ID do superagente | `super_agent_pppoker_id` | int |
| C | ID do agente | `agent_pppoker_id` | int |
| D | País/região | `country` | str |
| E | Apelido | `agent_nickname` | str |
| F | Nome de memorando | `agent_memo` | str |
| G | Retorno% médio de taxa | `average_rakeback_percent` | float |

---

### 5.7 Aba "Demonstrativo" (IGNORAR)

**6 colunas, 2 linhas** - Apenas disclaimer legal do PPPoker

> "Esta planilha é feita pelo PPPoker e se baseia em dados derivados da moeda virtual do jogo. Ela serve apenas como referência e não tem efeito jurídico."

**Ação**: Não importar. Pode ser usado para validar que é arquivo PPPoker genuíno.

---

### 5.8 Modal de Validação Pré-Importação

**CRÍTICO**: Antes de processar qualquer dado, exibir modal de validação completa.

#### 5.8.1 Estrutura do Modal

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Validação Completa dos Dados da Planilha PPPoker                      X │
│ Análise detalhada e validação dos dados extraídos antes do             │
│ processamento final                                                     │
│                                                                         │
│ [Qualidade dos Dados: 100% Válido]     14/14 verificações aprovadas    │
├─────────────────────────────────────────────────────────────────────────┤
│ [Visão Geral] [Jogadores] [Partidas] [Transações] [Agentes]            │
│ [Análises] [Validação] [Avisos]                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                         << CONTEÚDO DA ABA >>                          │
├─────────────────────────────────────────────────────────────────────────┤
│ [Rejeitar e Cancelar]                          [✓ Aprovar e Processar] │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 5.8.2 Aba "Visão Geral"

**Período da Análise**
| Campo | Valor |
|-------|-------|
| Período Completo | 24/11/2025 - 30/11/2025 |
| Data Inicial | 24/11/2025 |
| Data Final | 30/11/2025 |

**KPIs Principais (4 cards)**

| KPI | Valor | Detalhes |
|-----|-------|----------|
| Total de Jogadores | 326 | 102 winners · 216 losers |
| Total de Ganhos | -R$ 24.489,23 | Média por jogador: -R$ 75,12 |
| Total de Taxas (Rake) | R$ 12.450,00 | Média por jogador: R$ 38,19 |
| Total de Partidas | 2.683 | Cash: 2405 · MTT: 278 · Sit&Go: 0 |

**Seções Adicionais**

1. **Distribuição por Tipo de Jogo** (mini donut)
   - Ring Games: R$ X (X%)
   - MTT/Sit&Go: R$ X (X%)
   - SPINUP: R$ X (X%)
   - Outros: R$ X (X%)

2. **Top Performances**
   - Major Winner: [Nome] - R$ X
   - Major Loser: [Nome] - R$ X

3. **Estatísticas de Transações**
   - Total de Transações: 2.144
   - Volume Total: R$ 1.264.804,56
   - Média por Transação: R$ 589,93

#### 5.8.3 Aba "Jogadores"

**Tabela paginada com preview dos jogadores**

| ID PPPoker | Apelido | Agente | Saldo | Status | Ação |
|------------|---------|--------|-------|--------|------|
| 13067958 | CleissonSC02 | Borafti | R$ 150,00 | Novo | Criar |
| 8590048 | pp8590048 | - | R$ 0,00 | Existente | Atualizar |

**Badges de status:**
- 🟢 Novo (será criado)
- 🔵 Existente (será atualizado)
- 🟡 Conflito (requer decisão)
- 🔴 Erro (dados inválidos)

#### 5.8.4 Aba "Partidas"

**Preview das sessões de jogo**

| ID Jogo | Mesa | Tipo | Data | Jogadores | Rake | Status |
|---------|------|------|------|-----------|------|--------|
| 251124094743 | REENTRY | PPST/NLH | 24/11 00:00 | 72 | R$ 72,00 | Novo |

#### 5.8.5 Aba "Transações"

**Preview das movimentações**

| Data/Hora | De | Para | Tipo | Valor | Status |
|-----------|----|----|------|-------|--------|
| 24/11 10:13 | Clube | CleissonSC02 | Crédito | R$ 500,00 | Novo |

#### 5.8.6 Aba "Agentes"

**Resumo por agente**

| Agente | Jogadores | Rake Gerado | Rakeback % | Comissão |
|--------|-----------|-------------|------------|----------|
| Borafti | 45 | R$ 3.200,00 | 15% | R$ 480,00 |

#### 5.8.7 Aba "Análises"

**Insights automáticos detectados**

- 🦈 **Sharks identificados**: 3 jogadores com ROI > 20%
- ⚠️ **Risco de churn**: 12 jogadores inativos há 7+ dias com saldo
- 📊 **Tendência**: Rake 15% maior que semana anterior
- 💰 **Devedores**: 5 jogadores com saldo negativo > R$ 500

#### 5.8.8 Aba "Validação"

**Checklist de validações (14 verificações)**

| Verificação | Status | Detalhes |
|-------------|--------|----------|
| ✅ Formato de arquivo válido | Passou | Excel .xlsx |
| ✅ Período dentro do esperado | Passou | 7 dias |
| ✅ IDs de jogadores válidos | Passou | 326/326 |
| ✅ Valores numéricos corretos | Passou | 0 erros |
| ✅ Datas no formato correto | Passou | 0 erros |
| ✅ Sem duplicatas de transação | Passou | 0 duplicatas |
| ✅ Agentes referenciados existem | Passou | 12/12 |
| ✅ Saldos batem com transações | Passou | Diferença: R$ 0,00 |
| ⚠️ Jogadores novos detectados | Aviso | 45 novos jogadores |
| ⚠️ Volume acima da média | Aviso | +23% vs média |

#### 5.8.9 Aba "Avisos"

**Alertas que requerem atenção**

| Severidade | Aviso | Ação Sugerida |
|------------|-------|---------------|
| ⚠️ Médio | 45 jogadores serão criados automaticamente | Revisar lista |
| ⚠️ Médio | Jogador "XYZ" tem saldo negativo -R$ 2.300 | Verificar |
| ℹ️ Info | Período sobrepõe importação anterior | Dados serão atualizados |

#### 5.8.10 Ações do Modal

**Botão "Rejeitar e Cancelar"** (vermelho, esquerda)
- Descarta todos os dados
- Volta para tela de upload

**Botão "Aprovar e Processar"** (primário, direita)
- Desabilitado se houver erros críticos
- Inicia processamento em background
- Mostra progresso com toast/modal

---

### 5.9 Fluxo Completo de Importação

```
┌─────────────┐    ┌─────────────┐    ┌─────────────────┐    ┌──────────────┐
│   Upload    │ -> │   Parser    │ -> │   Validação     │ -> │  Processar   │
│   Arquivo   │    │   (async)   │    │   (Modal)       │    │  (background)│
└─────────────┘    └─────────────┘    └─────────────────┘    └──────────────┘
      │                  │                    │                      │
      v                  v                    v                      v
  Drag & drop      Extrai dados        Usuário revisa        Background job
  ou selecionar    de todas abas       e aprova/rejeita      com progresso
```

**Etapas detalhadas:**

1. **Upload arquivo** Excel (.xlsx) ou CSV individual
2. **Parser assíncrono** extrai dados de todas as abas
3. **Cálculo de métricas** (KPIs, validações, insights)
4. **Modal de Validação** - usuário revisa TUDO antes de confirmar
5. **Aprovação** - usuário clica "Aprovar e Processar"
6. **Importação em background**:
   - Background job com progresso
   - Upsert (atualiza se já existe)
   - Log de erros por linha
7. **Pós-processamento**:
   - Recalcular saldos
   - Atualizar `last_active_at`
   - Gerar alertas se necessário
8. **Notificação** - toast/email quando concluído

---

### 5.10 Ordem de Importação Recomendada

1. **Detalhes do usuário** → Cria jogadores e agentes
2. **Retorno de taxa** → Configura % rakeback dos agentes
3. **Geral** / **Detalhado** → Resumo do período (rake, ganhos)
4. **Transações** → Movimentações de fichas
5. **Partidas** → Sessões de jogo (mais complexo, pode ser incremental)

---

## 6. TABELAS E SHEETS

### 6.1 Componentes de Tabela

```
components/tables/poker/
├── players/
│   ├── columns.tsx
│   ├── data-table.tsx
│   ├── row.tsx
│   ├── skeleton.tsx
│   └── empty-states.tsx
├── agents/
├── sessions/
├── transactions/
└── settlements/
```

### 6.2 Sheets (Modais)

```
components/sheets/poker/
├── player-create-sheet.tsx
├── player-edit-sheet.tsx
├── player-detail-sheet.tsx
├── session-detail-sheet.tsx
├── settlement-create-sheet.tsx
├── settlement-detail-sheet.tsx
├── transaction-detail-sheet.tsx
└── alert-detail-sheet.tsx
```

---

## 7. INTEGRAÇÕES COM SISTEMA EXISTENTE

### 7.1 Transações Financeiras

```typescript
// Ao criar settlement, criar transaction no sistema financeiro
async function createSettlementWithTransaction(settlement) {
  const settlementRecord = await createSettlement(settlement);

  if (settlement.netAmount !== 0) {
    const transaction = await createTransaction({
      name: `Acerto Poker - ${settlement.player.nickname}`,
      amount: settlement.netAmount,
      currency: "BRL",
      categorySlug: "poker-settlement",
      manual: true,
    });

    await updateSettlement(settlementRecord.id, {
      transactionId: transaction.id
    });
  }
}
```

### 7.2 Faturas para Agentes

```typescript
// Gerar invoice a partir do settlement
async function generateSettlementInvoice(settlementId) {
  const settlement = await getSettlement(settlementId);
  const agent = await getPokerPlayer(settlement.agentId);

  const invoice = await createInvoice({
    customerId: agent.customerId,
    amount: settlement.netAmount,
    lineItems: [{
      name: `Comissão Agente - ${settlement.periodStart} a ${settlement.periodEnd}`,
      quantity: 1,
      price: settlement.commissionAmount,
    }],
  });

  await updateSettlement(settlementId, { invoiceId: invoice.id });
}
```

### 7.3 Link com Customers

```typescript
// Jogador pode ser linkado a Customer existente
pokerPlayer.customerId → customers.id
```

---

## 8. ALGORITMOS DE DETECÇÃO

### 8.1 Shark Detection (ROI > 20%)

```sql
SELECT
  player_id,
  SUM(cash_out - buy_in) as profit,
  SUM(buy_in) as total_invested,
  (SUM(cash_out - buy_in) / NULLIF(SUM(buy_in), 0)) * 100 as roi
FROM poker_session_players
WHERE team_id = $1
GROUP BY player_id
HAVING (SUM(cash_out - buy_in) / NULLIF(SUM(buy_in), 0)) * 100 > 20
```

### 8.2 Churn Risk (Inativo 7+ dias com saldo)

```sql
SELECT * FROM poker_players
WHERE team_id = $1
  AND current_balance > 0
  AND last_active_at < NOW() - INTERVAL '7 days'
```

### 8.3 Collusion Detection

```sql
-- Jogadores que jogam juntos >90% das vezes
-- E um sempre perde para o outro
WITH player_pairs AS (
  SELECT
    sp1.player_id as player_a,
    sp2.player_id as player_b,
    COUNT(*) as sessions_together
  FROM poker_session_players sp1
  JOIN poker_session_players sp2
    ON sp1.session_id = sp2.session_id
    AND sp1.player_id < sp2.player_id
  GROUP BY sp1.player_id, sp2.player_id
)
-- Análise de padrões suspeitos
```

---

## 9. FASES DE IMPLEMENTAÇÃO

### Fase 1: Fundação
- [ ] Criar schema de banco (migrations Drizzle)
- [ ] Implementar RLS policies
- [ ] Criar routers tRPC básicos (players CRUD)
- [ ] Adicionar seção poker no sidebar
- [ ] Criar página de listagem de jogadores
- [ ] Implementar sheets de criar/editar jogador

### Fase 2: Core Features
- [ ] Sistema de importação CSV
- [ ] Parsers para todos os arquivos CSV
- [ ] Modal de importação com preview
- [ ] Sessões e transações de fichas
- [ ] Widgets básicos do dashboard

### Fase 3: Settlements & Treasury
- [ ] Sistema de acertos ("Fechar Semana")
- [ ] Cálculo de comissão de agentes
- [ ] Tesouraria com reconciliação
- [ ] Integração com invoices existentes

### Fase 4: Analytics & BI
- [ ] Gráficos de receita por variante
- [ ] Ranking de lucratividade
- [ ] Performance de jogadores/agentes
- [ ] Detecção de sharks

### Fase 5: Auditoria & Segurança
- [ ] Timeline de sessões (Sheriff)
- [ ] Replay de sessão
- [ ] Detecção de conluio
- [ ] Sistema de alertas
- [ ] Blacklist compartilhada

### Fase 6: Polish & Avançado
- [ ] Sync Google Sheets
- [ ] Benchmarking entre clubes
- [ ] Sugestões de grade
- [ ] Botão WhatsApp
- [ ] Otimizações mobile

---

## 10. ARQUIVOS CRÍTICOS

### Para Modificar

| Arquivo | Modificação |
|---------|-------------|
| `packages/db/src/schema.ts` | Adicionar todas as novas tabelas |
| `apps/api/src/trpc/routers/_app.ts` | Registrar novos routers |
| `apps/dashboard/src/components/sidebar.tsx` | Adicionar navegação poker |
| `apps/dashboard/src/components/widgets/widgets-grid.tsx` | Registrar widgets |
| `apps/dashboard/src/components/sheets/global-sheets.tsx` | Registrar sheets |

### Para Criar

```
packages/db/src/schema/poker.ts              # Esquema poker separado
apps/api/src/trpc/routers/poker/             # Todos os routers
apps/api/src/schemas/poker/                  # Schemas Zod
apps/dashboard/src/app/[locale]/(app)/(sidebar)/poker/  # Páginas
apps/dashboard/src/components/widgets/poker/ # Widgets
apps/dashboard/src/components/tables/poker/  # Tabelas
apps/dashboard/src/components/sheets/poker/  # Sheets
apps/dashboard/src/components/forms/poker/   # Formulários
apps/dashboard/src/hooks/poker/              # Hooks (params, filters)
packages/imports/src/parsers/poker/          # Parsers CSV
```

---

## 11. PRÓXIMOS PASSOS IMEDIATOS

1. **Criar arquivo de schema poker** em `packages/db/src/schema/poker.ts`
2. **Rodar migration** para criar tabelas
3. **Criar router básico** `pokerPlayers` com CRUD
4. **Adicionar rota** `/poker` no sidebar
5. **Criar página** de listagem de jogadores
6. **Implementar sheet** de criação de jogador

---

## Notas Técnicas

- **Multi-tenancy**: Usar `team_id` em todas as queries (já existe)
- **FTS**: Usar tsvector para busca em jogadores
- **Moeda**: Usar sistema de conversão existente (`baseCurrency`)
- **Componentes**: Reusar 100% do @midday/ui
- **Padrões**: Seguir exatamente os padrões existentes de tables/sheets/forms
