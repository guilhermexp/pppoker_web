# Dashboard e Widgets do Clube

**Data:** 2026-01-31
**Modulo:** Poker > Dashboard
**Rota:** `/poker`

---

## Visao Geral

O dashboard de clubes e a pagina principal do modulo poker. Exibe 8 widgets customizaveis em grid de 4 colunas com drag-and-drop, suportando dois modos de visualizacao (semana atual e historico).

---

## Arquitetura de Componentes

```
/poker (page.tsx)
+-- PokerDashboardHeader
|   +-- WeekPeriodIndicator (semana aberta com datas)
|   +-- WeekViewToggle (current_week <-> historical)
|   +-- DateRangePicker (somente modo historico)
|   +-- ImportButton (link /poker/import)
|   +-- CustomizeWidgetsButton
|
+-- PokerWidgetProvider (Zustand store)
    +-- PokerWidgetsGrid (4 colunas, @dnd-kit)
        +-- PrimaryWidgets (8 visiveis)
        |   +-- TotalSessionsWidget
        |   +-- TotalPlayersWidget
        |   +-- ActiveAgentsWidget
        |   +-- RakeTotalWidget
        |   +-- RakeBreakdownWidget
        |   +-- TotalRakebackWidget
        |   +-- PlayerResultsWidget
        |   +-- GeneralResultWidget
        |
        +-- AvailableWidgets (modo customizacao)
            +-- GameTypesWidget
            +-- PlayersByRegionWidget
```

---

## Arquivos-Chave

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `apps/dashboard/src/app/[locale]/(app)/(sidebar)/poker/page.tsx` | 47 | Pagina principal |
| `apps/dashboard/src/components/poker/poker-dashboard-header.tsx` | ~250 | Header com controles |
| `apps/dashboard/src/components/widgets/poker/poker-widget-provider.tsx` | ~100 | Store Zustand |
| `apps/dashboard/src/components/widgets/poker/poker-widgets-grid.tsx` | ~700 | Grid com drag-and-drop |
| `apps/dashboard/src/components/widgets/poker/poker-stat-card.tsx` | ~460 | Card base + todos widgets |
| `apps/dashboard/src/hooks/use-poker-dashboard-params.ts` | ~50 | URL state management |

---

## Modos de Visualizacao

### current_week (Semana Atual)

- Mostra dados da semana aberta (periodo com `status: open`)
- Inclui dados **draft** (importacoes nao committed)
- Parametro `includeDraft: true` nas queries
- Datas vem do `poker_week_periods` mais recente com `status: open`
- **Sem** date range picker

### historical (Historico)

- Mostra somente dados **committed** (semanas fechadas)
- Parametro `includeDraft: false` nas queries
- Date range selecionado pelo usuario
- Quick selects: 7d, 30d, 90d, this_month, last_month
- Calendar picker com range

### Logica no Codigo

```typescript
// poker-widgets-grid.tsx (L494-524)
const effectiveFrom = viewMode === "current_week" && currentWeekPeriod
  ? currentWeekPeriod.weekStart
  : from ?? undefined;

const effectiveTo = viewMode === "current_week" && currentWeekPeriod
  ? currentWeekPeriod.weekEnd
  : to ?? undefined;

const { data } = useQuery(
  trpc.poker.analytics.getDashboardStats.queryOptions({
    from: effectiveFrom,
    to: effectiveTo,
    includeDraft: viewMode === "current_week",
  })
);
```

---

## Header do Dashboard

**Arquivo:** `poker-dashboard-header.tsx`

### Week Period Indicator (L136-161)

Mostra a semana aberta atual:
- Datas do periodo (ex: "13/01 - 19/01")
- Botao para fechar semana
- Busca via `trpc.poker.weekPeriods.getOpenPeriods()`

### PendingWeeksWarning

Exibido quando existem multiplos periodos abertos (mais de 1 importacao sem fechar semana).

### Quick Actions (L234-244)

- **Importar**: Link direto para `/poker/import`
- **Customizar Widgets**: Toggle modo de edicao do grid

---

## Sistema de Widgets

### Provider (Zustand Store)

**Arquivo:** `poker-widget-provider.tsx`

```typescript
type PokerWidgetStore = {
  isCustomizing: boolean;
  primaryWidgets: string[];      // max 8
  availableWidgets: string[];    // ocultos
  isSaving: boolean;

  // Acoes
  reorderPrimaryWidgets: (from, to) => void;
  moveToAvailable: (widgetType) => void;
  moveToPrimary: (widgetType) => void;
  swapWithLastPrimary: (widgetType) => void;
};
```

### Grid (@dnd-kit)

**Arquivo:** `poker-widgets-grid.tsx`

Layout responsivo:
- **Large (lg)**: 4 colunas
- **Medium (md)**: 2 colunas
- **Small**: 1 coluna

Comportamento de drag:
- Reordenar dentro dos widgets visiveis (L558-568)
- Mover de ocultos para visiveis (L571-592)
- Mover de visiveis para ocultos (L595-601)
- Auto-save com debounce de 100ms

---

## Os 10 Widgets

### 1. TotalSessionsWidget (L131-160)

| Campo | Valor |
|-------|-------|
| Titulo | Total de Sessoes |
| Valor principal | Contagem total |
| Breakdown | Cash Games, MTT, SPIN |
| Link | /poker/sessions |

### 2. TotalPlayersWidget (L163-185)

| Campo | Valor |
|-------|-------|
| Titulo | Total de Jogadores |
| Valor principal | Contagem de jogadores ativos |
| Breakdown | Com agente, Sem agente |
| Link | /poker/players |

### 3. ActiveAgentsWidget (L188-207)

| Campo | Valor |
|-------|-------|
| Titulo | Agentes Ativos |
| Valor principal | Contagem de agentes |
| Breakdown | Agentes, Super agentes |
| Link | /poker/agents |

### 4. RakeTotalWidget (L210-235)

| Campo | Valor |
|-------|-------|
| Titulo | Rake Total |
| Valor principal | Soma total do rake |
| Breakdown | PPST (Torneios), PPSR (Cash) |
| Cor | Verde para valores positivos |

### 5. RakeBreakdownWidget (L238-272)

| Campo | Valor |
|-------|-------|
| Titulo | Distribuicao de Rake |
| Valor principal | Percentuais |
| Breakdown | % PPST, % PPSR |
| Calculo | `(rakePpst / rakeTotal) * 100` |

### 6. TotalRakebackWidget (L275-316)

| Campo | Valor |
|-------|-------|
| Titulo | Total Rakeback |
| Valor principal | Rakeback distribuido |
| Breakdown | PPST, PPSR |
| Contexto | Resumo do periodo |

### 7. PlayerResultsWidget (L319-346)

| Campo | Valor |
|-------|-------|
| Titulo | Resultado dos Jogadores |
| Valor principal | Resultado liquido |
| Breakdown | Winners, Losers |
| Cor | Verde se positivo, vermelho se negativo |

### 8. GeneralResultWidget (L407-438)

| Campo | Valor |
|-------|-------|
| Titulo | Resultado Geral |
| Valor principal | Player Results - Rake Total |
| Breakdown | Ganhos, Rake |
| Calculo master | Consolida tudo |

### 9. GameTypesWidget (L361-381) - Oculto por padrao

| Campo | Valor |
|-------|-------|
| Titulo | Tipos de Jogo |
| Valor principal | Top variantes |
| Breakdown | NLH, PLO4, PLO5, etc. com contagem e % |

### 10. PlayersByRegionWidget (L384-404) - Oculto por padrao

| Campo | Valor |
|-------|-------|
| Titulo | Jogadores por Regiao |
| Valor principal | Distribuicao geografica |
| Breakdown | Top regioes com contagens e % |

---

## Fonte de Dados: getDashboardStats

**Router:** `apps/api/src/trpc/routers/poker/analytics.ts` (L141-197)

### Input

```typescript
{
  from?: string;          // Data inicio (ISO)
  to?: string;            // Data fim (ISO)
  includeDraft?: boolean; // Incluir dados nao committed (default: false)
  viewMode?: string;      // 'current_week' | 'historical'
}
```

### Output

```typescript
{
  viewMode: string;
  periodFrom: string;
  periodTo: string;

  // Contagens
  totalSessions: number;
  totalPlayers: number;
  activeAgents: number;

  // Rake
  rakeTotal: number;
  rakePpst: number;
  rakePpsr: number;

  // Rakeback
  totalRakeback: number;
  rakebackBreakdown: { ppst: number; ppsr: number };

  // Resultados
  generalResult: number;
  bankResult: number;
  playerResults: number;

  // Banco
  bankBreakdown: {
    chipsSent: number;
    chipsRedeemed: number;
    creditsSent: number;
    creditsRedeemed: number;
  };

  // Distribuicoes
  sessionsByType: Array<{ type: string; count: number; percentage: number }>;
  gameTypeBreakdown: Array<{ variant: string; count: number; percentage: number }>;
  playersByRegion: Array<{ region: string; count: number; percentage: number }>;

  // Breakdowns
  playersBreakdown: { withAgent: number; withoutAgent: number };
  agentsBreakdown: { regular: number; super: number };
  resultsBreakdown: { winners: number; losers: number };
}
```

### Fontes de Dados

- `poker_player_summary`: Jogadores ativos com dados de rake
- `poker_sessions`: Contagem e tipos de sessao
- `poker_chip_transactions`: Movimentacoes bancarias
- `poker_players`: Contagem de agentes, regioes, hierarquias

---

## URL State Management

**Hook:** `use-poker-dashboard-params.ts`

```typescript
type DashboardParams = {
  from: string | null;        // ISO date
  to: string | null;          // ISO date
  viewMode: "current_week" | "historical";
  weekPeriodId?: string;      // UUID opcional
};

// Computed
hasDateFilter: boolean;       // from ou to definido
isCurrentWeekView: boolean;   // viewMode === "current_week"
```

Comportamento:
- Trocar para `current_week` limpa filtros de data
- Trocar para `historical` preserva filtros de data

---

## Paginas Relacionadas

Todas seguem o mesmo padrao: Server-side prefetch + Suspense + useTRPC().

| Rota | Pagina | tRPC Query |
|------|--------|-----------|
| `/poker/players` | Lista de jogadores | `poker.players.get` |
| `/poker/agents` | Lista de agentes | `poker.players.get` (type=agent) |
| `/poker/sessions` | Sessoes | `poker.sessions.get` |
| `/poker/transactions` | Transacoes | `poker.transactions.get` |
| `/poker/settlements` | Settlements | `poker.settlements.get` |
| `/poker/import` | Importacao | `poker.imports.get` |

---

**Ultima atualizacao:** 2026-01-31
