# Fechamento da Semana e Settlements

**Data:** 2026-01-31
**Modulo:** Poker > Week Periods + Settlements
**Rota:** `/poker` (botao Fechar) + `/poker/settlements`

---

## Visao Geral

O fechamento da semana e o processo que:
1. Calcula settlements para todos jogadores com saldo != 0
2. Aplica rakeback (com possibilidade de override temporario)
3. Zera os saldos de fichas
4. Marca o periodo como fechado
5. Commita as importacoes (dados passam de draft para historico)
6. Gera snapshot de estatisticas

---

## Componentes UI

### Botao de Fechar Semana

**Arquivo:** `apps/dashboard/src/components/poker/close-week-button.tsx`

Localizado no header do dashboard. Mostra `AlertDialog` de confirmacao antes de abrir o modal de preview.

### Modal de Preview (7 Abas)

**Arquivo:** `apps/dashboard/src/components/poker/close-week-preview-modal.tsx` (L55-387)

| Aba | Componente | Conteudo |
|-----|-----------|----------|
| **Resumo** | - | Stats gerais + financeiro |
| **Geral** | - | Player summaries da semana |
| **Partidas** | - | Todas as sessoes |
| **Retorno de Taxa** | - | Rakeback por agente (com override) |
| **Acertos** | `SettlementsTab` | Preview dos settlements |
| **Despesas** | - | Despesas fixas/variaveis |
| **Liga** | - | Configuracoes multi-clube |

### Aba de Settlements (Preview)

**Arquivo:** `apps/dashboard/src/components/poker/close-week-tabs/settlements-tab.tsx` (L47-160)

**Cards de resumo:**
- Quantidade de acertos
- Valor Bruto total
- Rakeback total (cor laranja)
- Valor Liquido total (cor verde)
- Ratio de saldo

**Tabela ordenavel:**

| Coluna | Descricao | Cor |
|--------|-----------|-----|
| Jogador | Nickname + memo | - |
| Tipo | player / agent / super_agent | - |
| Agente | Nickname do agente | - |
| Saldo de Fichas | chip_balance | Verde/Vermelho |
| Rakeback % | Percentual aplicado | - |
| Rakeback R$ | Valor calculado | Laranja |
| Valor Liquido | gross - rakeback | Verde/Vermelho |

---

## Feature: Override de Rakeback

Na aba "Retorno de Taxa" do modal de preview:

1. Usuario pode editar o % de rakeback de agentes especificos
2. Overrides coletados como `RakebackOverride[]`:
   ```typescript
   type RakebackOverride = {
     agentId: string;        // UUID do agente
     rakebackPercent: number; // 0-100
   };
   ```
3. Passados no input de `trpc.poker.weekPeriods.close()`
4. Backend verifica override por agente durante calculo
5. Campo `rakeback_percent_used` armazena o % aplicado
6. **ONE-TIME:** Nao altera o cadastro do agente permanentemente

---

## Logica Backend: Fechar Semana

**Router:** `apps/api/src/trpc/routers/poker/week-periods.ts`
**Procedure:** `close` (L920-1167)

### Input

```typescript
{
  weekPeriodId?: string;              // UUID (opcional, usa atual)
  note?: string;                      // Nota de fechamento
  rakebackOverrides?: [{
    agentId: string;
    rakebackPercent: number;          // 0-100
  }];
}
```

### Fluxo de Execucao

```
1. VALIDAR
   - Buscar poker_week_periods pelo ID (ou mais recente open)
   - Verificar status != "closed" (erro se ja fechada)

2. BUSCAR JOGADORES COM SALDO
   - SELECT * FROM poker_players
     WHERE team_id = X AND chip_balance != 0 AND status = 'active'

3. CALCULAR SETTLEMENTS (para cada jogador)
   - grossAmount = player.chip_balance
   - Verificar se agente tem override no input
     - Se sim: rakebackPercent = override.rakebackPercent
     - Se nao: rakebackPercent = player.rakeback_percent
   - rakebackAmount = (grossAmount * rakebackPercent) / 100
   - netAmount = grossAmount - rakebackAmount

4. CRIAR REGISTROS DE SETTLEMENT
   INSERT INTO poker_settlements:
   - team_id, period_start, period_end, week_period_id
   - player_id, agent_id
   - gross_amount, rakeback_amount, rakeback_percent_used
   - commission_amount: 0
   - adjustment_amount: 0
   - net_amount
   - status: "pending"
   - created_by_id: userId
   - note: "Fechamento semana: {start} a {end}"

5. ZERAR SALDOS
   UPDATE poker_players SET chip_balance = 0
   WHERE id IN (jogadores com settlement)

6. SALVAR ESTATISTICAS DA SEMANA
   UPDATE poker_week_periods SET
   - total_sessions, total_players, total_rake
   - total_settlements, settlements_gross_amount, settlements_net_amount

7. FECHAR PERIODO
   UPDATE poker_week_periods SET
   - status: "closed"
   - closed_at: NOW()
   - closed_by_id: userId

8. COMMITAR IMPORTACOES
   UPDATE poker_imports SET
   - committed: true
   - committed_at: NOW()
   - committed_by_id: userId
   WHERE team_id = X
     AND status = 'completed'
     AND period_start >= week_start
     AND period_end <= week_end

9. RETORNAR
   { success: true, settlementsCreated: N }
```

---

## Dados do Preview

**Procedure:** `getCloseWeekData` (L209-780)

Retorna dados completos para o modal:

```typescript
{
  weekPeriod: WeekPeriod;
  sessions: SessionWithPlayers[];
  summaries: PlayerSummary[];
  rakebacks: AgentRakeback[];
  agentsFromApp: AgentInfo[];
  settlements: SettlementPreview[];
  settlementsSummary: {
    totalSettlements: number;
    totalGross: number;
    totalRakeback: number;
    totalNet: number;
    playersWithPositiveBalance: number;
    playersWithNegativeBalance: number;
  };
  stats: WeekStats;
}
```

---

## Settlements: Ciclo de Vida

### Status e Transicoes

**Arquivo:** `apps/api/src/trpc/routers/poker/settlements.ts` (L15-21)

```
VALID_STATUS_TRANSITIONS = {
  pending:   ['partial', 'completed', 'cancelled'],
  partial:   ['completed', 'cancelled'],
  completed: ['disputed'],
  disputed:  ['completed', 'cancelled'],
  cancelled: []  // terminal
};
```

```
                  +---> PARTIAL --+---> COMPLETED ---> DISPUTED
                  |               |         |              |
PENDING ----------+               |         |              |
  |               |               |         |              |
  |               +---> COMPLETED |         |              |
  |                               |         |              |
  +-----------> CANCELLED <-------+---------+--------------+
```

### Cores dos Badges

| Status | Variante | Cor |
|--------|----------|-----|
| pending | outline | Borda padrao |
| partial | secondary | Fundo muted |
| completed | default | Verde |
| disputed | destructive | Vermelho |
| cancelled | secondary | Cinza |

---

## Router de Settlements

**Arquivo:** `apps/api/src/trpc/routers/poker/settlements.ts` (596 linhas)

### Procedures

| Procedure | Linhas | Descricao |
|-----------|--------|-----------|
| `get` | L27-143 | Lista paginada com filtros |
| `getById` | L148-214 | Detalhe completo |
| `create` | L219-253 | Criacao manual |
| `updateStatus` | L258-315 | Transicao de status |
| `markPaid` | L320-379 | Registrar pagamento |
| `delete` | L384-441 | Deletar settlement |
| `getStats` | L446-485 | Estatisticas agregadas |

### Filtros Disponiveis (get)

```typescript
{
  cursor?: string;          // Paginacao
  pageSize?: number;        // 1-1000
  sort?: [column, direction];
  status?: 'pending' | 'partial' | 'completed' | 'disputed' | 'cancelled';
  playerId?: string;        // UUID
  agentId?: string;         // UUID
  periodStart?: string;     // ISO date
  periodEnd?: string;       // ISO date
}
```

---

## Regras de Negocio

### Pagamento (markPaid)

1. `paidAmount` nao pode exceder `netAmount`
2. Auto-status:
   - Se `paidAmount >= netAmount` -> `completed`
   - Senao -> `partial`
3. Define `paid_at` com timestamp

### Delecao (delete)

Proibida quando:
- `status = 'completed'`
- `paid_amount > 0`

### Transicao de Status (updateStatus)

- Valida contra mapa `VALID_STATUS_TRANSITIONS`
- Throw `BAD_REQUEST` se transicao invalida
- `cancelled` e estado terminal (sem transicoes)

---

## Pagina de Settlements

**Rota:** `/poker/settlements`
**Arquivo:** `apps/dashboard/src/app/[locale]/(app)/(sidebar)/poker/settlements/page.tsx`

### Colunas da Tabela

**Arquivo:** `apps/dashboard/src/components/tables/poker-settlements/columns.tsx` (L112-274)

| Coluna | Largura | Descricao |
|--------|---------|-----------|
| Period | 180px (sticky left) | Datas start-end + data criacao |
| Player/Agent | 180px | Nome + badge tipo |
| Status | 100px | Badge colorido |
| Gross | 120px | Valor bruto (font-mono) |
| % Usado | 90px | Rakeback % (aviso se != atual) |
| Net | 120px | Valor liquido (verde/vermelho) |
| Paid | 120px | Valor pago + restante |
| Actions | 50px (sticky right) | View, Mark Paid, Delete |

### Filtros

**Arquivo:** `apps/dashboard/src/components/poker/poker-settlement-filters.tsx`

- **Date Range:** periodStart, periodEnd
- **Status:** dropdown com pending, partial, completed, disputed
- **Clear Filters:** Reset

### Acoes por Linha

| Acao | Disponivel | Efeito |
|------|-----------|--------|
| View Details | Sempre | Abre detalhes |
| Mark as Paid | Somente `pending` | Abre dialog de pagamento |
| Delete | Exceto `completed` e com pagamento | Remove settlement |

---

## Schemas de Input

### Settlement

**Arquivo:** `apps/api/src/schemas/poker/settlements.ts`

```typescript
createPokerSettlementSchema = {
  periodStart: string;           // required
  periodEnd: string;             // required
  playerId?: string;             // UUID
  agentId?: string;              // UUID
  grossAmount: number;           // required
  rakebackAmount?: number;
  commissionAmount?: number;
  adjustmentAmount?: number;
  netAmount: number;             // required
  note?: string;
}

markSettlementPaidSchema = {
  id: string;                    // UUID required
  paidAmount: number;            // required
  paidAt?: string;               // ISO date
}
```

### Week Period

**Arquivo:** `apps/api/src/schemas/poker/week-periods.ts`

```typescript
closeWeekSchema = {
  weekPeriodId?: string;         // UUID
  note?: string;
  rakebackOverrides?: [{
    agentId: string;             // UUID required
    rakebackPercent: number;     // 0-100 required
  }];
}

settlementPreviewItemSchema = {
  playerId: string;
  playerNickname: string;
  playerMemoName: string | null;
  playerType: 'player' | 'agent' | 'super_agent';
  agentId: string | null;
  agentNickname: string | null;
  chipBalance: number;
  rakebackPercent: number;
  grossAmount: number;
  rakebackAmount: number;
  netAmount: number;
}
```

---

## Fluxo Completo

```
Dashboard (/poker)
  |
  +-- [Fechar Semana] -> CloseWeekButton
       |
       +-- AlertDialog confirmacao
            |
            +-- CloseWeekPreviewModal
                 |
                 +-- Fetch getCloseWeekData()
                 |
                 +-- 7 Abas:
                 |   Resumo | Geral | Partidas | Retorno de Taxa
                 |   Acertos | Despesas | Liga
                 |
                 +-- Override rakeback % (opcional)
                 |
                 +-- [Confirmar e Fechar]
                      |
                      +-- trpc.poker.weekPeriods.close()
                           |
                           +-- Criar settlements (status: pending)
                           +-- Zerar chip_balance
                           +-- Fechar periodo (status: closed)
                           +-- Commitar imports (committed: true)
                           |
                           +-- Dados agora visiveis no Historico
                                |
                                +-- /poker/settlements (lista)
                                     |
                                     +-- Mark as Paid -> partial/completed
                                     +-- Disputa -> disputed
                                     +-- Cancelar -> cancelled
```

---

**Ultima atualizacao:** 2026-01-31
