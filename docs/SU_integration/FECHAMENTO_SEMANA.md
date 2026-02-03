# Fechamento da Semana e Settlements - Modulo SU

**Data:** 2026-01-31
**Modulo:** SU > Week Periods + Settlements
**Rota:** `/su` (botao Fechar) + `/su/acertos` (stub)

---

## Visao Geral

O fechamento da semana SU e o processo que:
1. Calcula settlements para todas as ligas com atividade no periodo
2. Cria um settlement por liga (gross = ppst_fee + ppsr_fee)
3. Marca o periodo como fechado com snapshot de estatisticas
4. Commita as importacoes (dados passam de draft para historico)
5. Torna dados visiveis em relatorios historicos

**Diferenca do Clube:** No SU, settlements sao **por liga** (nao por jogador).

---

## Componentes UI

### Botao de Fechar Semana

**Arquivo:** `apps/dashboard/src/components/su/su-dashboard-header.tsx`

Localizado no header do dashboard SU. Visivel apenas quando:
- Modo de visualizacao = "current_week"
- Existe periodo com status = "open"

### Modal de Preview (5 Abas)

**Arquivo:** `apps/dashboard/src/components/su/close-su-week-preview-modal.tsx` (~232 linhas)

| Aba | Conteudo |
|-----|----------|
| **Resumo** | Stats gerais PPST + PPSR + settlements |
| **Ligas** | Resumo por liga (fees, gap, earnings) |
| **Jogos PPST** | Todos os torneios do periodo |
| **Jogos PPSR** | Todos os cash games do periodo |
| **Acertos** | Preview dos settlements por liga |

---

## Dados do Preview

**Procedure:** `su.weekPeriods.getCloseWeekData`

### Input

```typescript
{
  weekPeriodId?: string;  // UUID (opcional, usa atual)
}
```

### Output

```typescript
{
  weekPeriod: {
    id: string;
    weekStart: string;
    weekEnd: string;
    status: 'open' | 'closed';
    timezone: string;
  };

  summaries: LeagueSummaryRecord[];

  games: GameRecord[];  // Ate 50,000

  settlements: Array<{
    ligaId: number;
    ppstLeagueFee: number;
    ppsrLeagueFee: number;
    ppstGapGuaranteed: number;
    grossAmount: number;
    netAmount: number;
    existingSettlement: SettlementRecord | null;
  }>;

  existingSettlements: SettlementRecord[];

  stats: {
    totalLeagues: number;
    leaguesWithPPST: number;
    leaguesWithPPSR: number;
    totalGamesPPST: number;
    totalGamesPPSR: number;
    totalPlayersPPST: number;
    totalPlayersPPSR: number;
    totalLeagueFee: number;
    totalGapGuaranteed: number;
    overlayCount: number;
    overlayTotal: number;
    totalPlayerWinnings: number;
    totalTaxaPPST: number;
    totalTaxaPPSR: number;
    totalPlayerWinningsPPST: number;
    totalPlayerWinningsPPSR: number;
    gameVariantDistribution: Array<{
      variant: string;
      type: string;
      count: number;
    }>;
  };

  settlementsSummary: {
    count: number;
    totalGrossAmount: number;
    totalNetAmount: number;
    alreadySettled: number;
  };
}
```

---

## Logica Backend: Fechar Semana

**Router:** `apps/api/src/trpc/routers/su/week-periods.ts`
**Procedure:** `close` (Lines 358-581)

### Input

```typescript
{
  weekPeriodId?: string;  // UUID (opcional, usa mais recente open)
}
```

### Fluxo de Execucao

```
1. VALIDAR
   - Buscar poker_su_week_periods pelo ID (ou mais recente open)
   - Verificar status != "closed" (erro se ja fechada)

2. BUSCAR LEAGUE SUMMARIES
   - SELECT * FROM poker_su_league_summary
     WHERE week_period_id = X AND team_id = Y

3. BUSCAR IMPORTS COMPLETADOS
   - SELECT * FROM poker_su_imports
     WHERE week_period_id = X AND status = 'completed'

4. BUSCAR GAMES (stats)
   - SELECT game_type, player_count FROM poker_su_games
     WHERE week_period_id = X

5. CRIAR SETTLEMENTS (para cada liga)
   - ppstLeagueFee = summary.ppst_ganhos_liga_taxa
   - ppsrLeagueFee = summary.ppsr_ganhos_liga_taxa
   - grossAmount = ppstLeagueFee + ppsrLeagueFee
   - netAmount = grossAmount (sem ajustes inicialmente)
   - UPSERT INTO poker_su_settlements:
     - team_id, week_period_id, liga_id
     - ppst_league_fee, ppsr_league_fee
     - ppst_gap_guaranteed, ppst_games_count, ppsr_games_count
     - gross_amount, net_amount
     - status: "pending"
     - created_by_id: userId
   - ON CONFLICT (team_id, week_period_id, liga_id) DO UPDATE

6. ATUALIZAR WEEK PERIOD
   UPDATE poker_su_week_periods SET
   - status: "closed"
   - closed_at: NOW()
   - closed_by_id: userId
   - total_leagues, total_games_ppst, total_games_ppsr
   - total_players_ppst, total_players_ppsr
   - total_league_earnings, total_gap_guaranteed
   - total_player_winnings
   - total_settlements, settlements_gross_amount, settlements_net_amount

7. COMMITAR IMPORTACOES
   UPDATE poker_su_imports SET
   - committed: true
   - committed_at: NOW()
   - committed_by_id: userId
   WHERE team_id = X
     AND status = 'completed'
     AND week_period_id = weekPeriod.id

8. RETORNAR
   {
     success: true,
     settlementsCreated: N,
     totalGrossAmount: X,
     totalNetAmount: Y,
     weekPeriodId: Z
   }
```

---

## Invalidacao de Cache (Pos-Fechamento)

Apos fechamento bem-sucedido, o frontend invalida:
- `su.weekPeriods.getCurrent` - Nao ha mais periodo aberto
- `su.weekPeriods.getOpenPeriods` - Lista vazia
- `su.analytics.getDashboardStats` - Atualiza widgets
- `su.settlements.list` - Mostra novos settlements

---

## Settlements: Ciclo de Vida

### Status e Transicoes

```
                  +---> PARTIAL --+---> COMPLETED
                  |               |         |
PENDING ----------+               |         |
  |               |               |         |
  |               +---> COMPLETED |         |
  |                               |         |
  +-----------> CANCELLED <-------+---------+
                                            |
                               DISPUTED ----+
```

### Auto-Transicao por Pagamento

Quando `paidAmount` e informado:
- Se `paidAmount >= netAmount` -> status = `"completed"`
- Se `0 < paidAmount < netAmount` -> status = `"partial"`

### Calculo com Ajuste

Quando `adjustmentAmount` e informado:
- `netAmount = grossAmount + adjustmentAmount`
- Exemplo: gross=1000, adjustment=-100 -> net=900

---

## Router de Settlements

**Arquivo:** `apps/api/src/trpc/routers/su/settlements.ts`

### Procedures

| Procedure | Descricao |
|-----------|-----------|
| `list` | Lista paginada com filtros (status, weekPeriodId, ligaId) |
| `getById` | Detalhe completo de um settlement |
| `getByPeriod` | Todos os settlements de um periodo, ordenados por liga |
| `getPendingSummary` | Contagem + valores de settlements pendentes/parciais |
| `update` | Atualizar: ajuste, pagamento, status, nota |
| `markAsCompleted` | Marcar como pago integralmente |
| `getStats` | Estatisticas agregadas por data range |

### Filtros Disponiveis (list)

```typescript
{
  status?: 'pending' | 'partial' | 'completed' | 'disputed' | 'cancelled';
  weekPeriodId?: string;     // UUID
  ligaId?: number;           // ID da liga
  limit?: number;            // 1-100
  offset?: number;
}
```

### getPendingSummary Output

```typescript
{
  count: number;              // Pendentes + parciais
  totalAmount: number;        // Soma net_amount
  paidAmount: number;         // Soma paid_amount
  remainingAmount: number;    // totalAmount - paidAmount
}
```

### getStats Output

```typescript
{
  total: number;
  pendingCount: number;
  partialCount: number;
  completedCount: number;
  totalGrossAmount: number;
  totalNetAmount: number;
  totalPaidAmount: number;
  pendingAmount: number;
}
```

---

## Diferenca: Settlement SU vs Clube

| Aspecto | SU | Clube |
|---------|-----|-------|
| **Granularidade** | Por liga | Por jogador |
| **Calculo gross** | ppst_fee + ppsr_fee | chip_balance |
| **Rakeback** | N/A | Aplicado com override |
| **Ajuste** | adjustment_amount | adjustment_amount |
| **Campos extras** | ppst_*, ppsr_* breakdown | rakeback_percent_used |
| **Upsert** | ON CONFLICT (team, week, liga) | INSERT simples |
| **Zera saldos** | N/A (nao ha chip_balance) | Zera chip_balance |

---

## Fluxo Completo

```
Dashboard (/su)
  |
  +-- [Fechar Semana] -> SUDashboardHeader
       |
       +-- CloseSUWeekPreviewModal
            |
            +-- Fetch getCloseWeekData()
            |
            +-- 5 Abas:
            |   Resumo | Ligas | Jogos PPST | Jogos PPSR | Acertos
            |
            +-- [Confirmar e Fechar]
                 |
                 +-- trpc.su.weekPeriods.close()
                      |
                      +-- Criar settlements (1 por liga, status: pending)
                      +-- Fechar periodo (status: closed + snapshot)
                      +-- Commitar imports (committed: true)
                      |
                      +-- Dados agora visiveis no Historico
                           |
                           +-- /su/acertos (lista - em construcao)
                                |
                                +-- Update pagamento -> partial/completed
                                +-- Ajuste manual -> recalcula net
                                +-- Marcar completo -> paid = net
```

---

## Week Periods Router

**Arquivo:** `apps/api/src/trpc/routers/su/week-periods.ts`

### Procedures

| Procedure | Descricao |
|-----------|-----------|
| `getOpenPeriods` | Lista periodos abertos (DESC por week_start) |
| `getCurrent` | Periodo aberto mais recente (ou null) |
| `getCloseWeekData` | Dados completos para modal de fechamento |
| `close` | Fechar semana + criar settlements + commitar imports |
| `list` | Lista paginada com filtro de status |

---

**Ultima atualizacao:** 2026-01-31
