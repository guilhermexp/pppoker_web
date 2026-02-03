# Dashboard e Widgets do SU (Super Union)

**Data:** 2026-01-31
**Modulo:** SU > Dashboard
**Rota:** `/su`

---

## Visao Geral

O dashboard SU e a pagina principal do modulo Super Union. Exibe 8 widgets customizaveis em grid de 4 colunas com drag-and-drop, suportando dois modos de visualizacao. Inclui tambem paginas de grade de torneios e sistema de rateio.

---

## Arquitetura de Componentes

```
/su (page.tsx)
+-- SUDashboardHeader
|   +-- SUWeekPeriodIndicator (semana aberta com datas)
|   +-- SUWeekViewToggle (current_week <-> historical)
|   +-- DateRangePicker (somente modo historico)
|   +-- ImportButton (link /su/import)
|   +-- CustomizeWidgetsButton
|   +-- CloseWeekButton -> CloseSUWeekPreviewModal
|
+-- SUWidgetProvider (Zustand store)
    +-- SUWidgetsGrid (4 colunas)
        +-- TotalLeaguesWidget
        +-- TotalGamesPPSTWidget
        +-- TotalGamesPPSRWidget
        +-- LeagueEarningsWidget
        +-- GapGuaranteedWidget
        +-- PlayerWinningsWidget
        +-- BreakdownPPSTPPSRWidget
        +-- TopLeaguesWidget
```

---

## Arquivos-Chave

| Arquivo | Linhas | Descricao |
|---------|--------|-----------|
| `apps/dashboard/src/app/[locale]/(app)/(sidebar)/su/page.tsx` | 40 | Pagina principal |
| `apps/dashboard/src/components/su/su-dashboard-header.tsx` | ~229 | Header com controles |
| `apps/dashboard/src/components/su/widgets/su-widget-provider.tsx` | ~240 | Store Zustand |
| `apps/dashboard/src/components/su/widgets/su-widgets-grid.tsx` | ~340 | Grid com widgets |
| `apps/dashboard/src/components/su/widgets/su-stat-card.tsx` | ~132 | Card base |
| `apps/dashboard/src/components/su/su-week-period-indicator.tsx` | ~128 | Indicador de semana |
| `apps/dashboard/src/components/su/su-week-view-toggle.tsx` | ~46 | Toggle de modo |
| `apps/dashboard/src/hooks/use-su-dashboard-params.ts` | ~90 | URL state management |

---

## Modos de Visualizacao

### current_week (Semana Atual)

- Mostra dados da semana aberta (periodo com `status: open`)
- Inclui dados **draft** (importacoes nao committed)
- Busca imports do week_period_id com `status = completed` (qualquer committed)
- **Sem** date range picker

### historical (Historico)

- Mostra somente dados **committed** (semanas fechadas)
- Filtra por `committed = true`
- Date range selecionado pelo usuario
- Quick selects: 7d, 30d, 90d, this_month, last_month

---

## Header do Dashboard

**Arquivo:** `su-dashboard-header.tsx` (~229 linhas)

### SUWeekPeriodIndicator

Mostra a semana aberta atual:
- Datas do periodo (yyyy-MM-dd)
- Contagem de dias
- Numero da semana com comparacao
- Badge de status (Aberta/Fechada) com animacao pulse

### SUWeekViewToggle

Tabs de modo:
1. "Semana Atual" - Esconde date picker
2. "Historico" - Mostra date picker

### Quick Actions

- **Fechar Semana**: Abre CloseSUWeekPreviewModal
- **Importar**: Link para `/su/import`
- **Customizar**: Toggle modo de edicao do grid

---

## Sistema de Widgets

### Provider (Zustand Store)

**Arquivo:** `su-widget-provider.tsx` (~240 linhas)

```typescript
type SUWidgetStore = {
  isCustomizing: boolean;
  primaryWidgets: SUWidgetType[];    // max 8
  availableWidgets: SUWidgetType[];  // ocultos
  isSaving: boolean;

  // Acoes
  reorderPrimaryWidgets: (from, to) => void;
  moveToAvailable: (widgetType) => void;
  moveToPrimary: (widgetType) => void;
  swapWithLastPrimary: (widgetType) => void;
};
```

### Hooks Disponveis

- `useSUIsCustomizing()` - Estado do modo customizacao
- `useSUPrimaryWidgets()` - Widgets visiveis
- `useSUAvailableWidgets()` - Widgets ocultos
- `useSUWidgetActions()` - Todas as acoes

---

## Os 8 Widgets

### 1. TotalLeaguesWidget

| Campo | Valor |
|-------|-------|
| Titulo | Total de Ligas |
| Valor principal | Contagem de ligas ativas |
| Breakdown | Com PPST, Com PPSR |

### 2. TotalGamesPPSTWidget

| Campo | Valor |
|-------|-------|
| Titulo | Jogos PPST |
| Valor principal | Total de torneios |
| Breakdown | NLH, SpinUp, PKO, MKO, SAT |

### 3. TotalGamesPPSRWidget

| Campo | Valor |
|-------|-------|
| Titulo | Jogos PPSR |
| Valor principal | Total de cash games |
| Breakdown | NLH, PLO4, PLO5, PLO6, OFC, Other |

### 4. LeagueEarningsWidget

| Campo | Valor |
|-------|-------|
| Titulo | Ganhos das Ligas |
| Valor principal | Total de taxas (fees) coletadas |
| Breakdown | PPST earnings, PPSR earnings |

### 5. GapGuaranteedWidget

| Campo | Valor |
|-------|-------|
| Titulo | Gap Garantido |
| Valor principal | Total gap + overlay |
| Breakdown | Overlay count, Gap amount, Jogos com GTD |

### 6. PlayerWinningsWidget

| Campo | Valor |
|-------|-------|
| Titulo | Ganhos dos Jogadores |
| Valor principal | Resultado liquido total |
| Breakdown | PPST winnings, PPSR winnings |

### 7. BreakdownPPSTPPSRWidget

| Campo | Valor |
|-------|-------|
| Titulo | Distribuicao PPST/PPSR |
| Valor principal | Percentuais |
| Breakdown | % PPST, % PPSR |

### 8. TopLeaguesWidget

| Campo | Valor |
|-------|-------|
| Titulo | Top Ligas |
| Valor principal | Top 3 por receita |
| Breakdown | Liga nome + total fee |

---

## Fonte de Dados: getDashboardStats

**Router:** `apps/api/src/trpc/routers/su/analytics.ts`

### Input

```typescript
{
  from?: string;          // Data inicio (ISO)
  to?: string;            // Data fim (ISO)
  viewMode?: 'current_week' | 'historical';
}
```

### Output

```typescript
{
  // Contagens
  totalLeagues: number;
  totalGamesPPST: number;
  totalGamesPPSR: number;
  totalPlayersPPST: number;
  totalPlayersPPSR: number;

  // Ganhos das Ligas
  leagueEarningsTotal: number;
  leagueEarningsPPST: number;
  leagueEarningsPPSR: number;

  // Gap/Overlay
  gapGuaranteedTotal: number;
  overlayCount: number;
  overlayTotal: number;
  gamesWithGTD: number;

  // Ganhos Jogadores
  playerWinningsTotal: number;
  playerWinningsPPST: number;
  playerWinningsPPSR: number;

  // Distribuicao
  leaguesWithPPST: number;
  leaguesWithPPSR: number;
  topLeagues: Array<{ ligaId: number; ligaNome: string; totalFee: number }>;

  // Variantes
  gamesPPSTByType: { nlh, spinup, pko, mko, sat };
  gamesPPSRByType: { nlh, plo4, plo5, plo6, ofc, other };
}
```

---

## Calculo de Overlay

Executado no backend para jogos PPST com GTD:

```
Para cada jogo PPST com premiacao_garantida > 0:
  buyinLiquido = total_buyin - total_taxa
  resultado = buyinLiquido - premiacao_garantida
  Se resultado < 0:
    overlayCount++
    overlayTotal += resultado  (valor negativo)
```

**Significado:** A liga pagou mais do que arrecadou em buy-ins para cobrir o garantido.

---

## Paginas do Modulo SU

### Rotas

| Rota | Arquivo | Status | tRPC Calls |
|------|---------|--------|------------|
| `/su` | `page.tsx` | Ativo | `su.analytics.getDashboardStats` |
| `/su/import` | `import/page.tsx` | Ativo | `su.imports.*` |
| `/su/grade` | `grade/page.tsx` | Ativo | localStorage + cross-validation |
| `/su/ligas` | `ligas/page.tsx` | Stub | "Em construcao" |
| `/su/jogos` | `jogos/page.tsx` | Stub | "Em construcao" |
| `/su/acertos` | `acertos/page.tsx` | Stub | "Em construcao" |

### Navegacao (Sidebar)

```
Super Union (sidebar.su)
+-- Super Union -> /su
+-- Ligas -> /su/ligas
+-- Jogos -> /su/jogos
+-- Acertos -> /su/acertos
+-- Importar -> /su/import
+-- Grade -> /su/grade
```

---

## Grade de Torneios (/su/grade)

**Arquivo:** `apps/dashboard/src/app/[locale]/(app)/(sidebar)/su/grade/`

### GradeTab

- Visualizacao da grade de torneios por dia (segunda a domingo)
- GTD total por dia
- Detalhes: nome do torneio, horario, buy-in, GTD, tipo de jogo
- Dados vem do localStorage (salvos na validacao da importacao)

### OverlaysTab

- Confronto entre grade agendada e torneios realizados
- Compara torneios importados (PPST) com grade planejada
- Detecta torneios faltantes
- Calcula diferenca GTD previsto vs realizado

### Cross-Validation (Na validacao da importacao)

Na aba Overview do modal de validacao:
- Compara Grade semana X com PPST semana Y
- Verifica se semanas coincidem
- Mostra: Previsto, Realizado, Diff, Torneios encontrados
- Lista torneios da grade nao encontrados nos dados PPST

### Bibliotecas de Suporte

| Arquivo | Descricao |
|---------|-----------|
| `lib/league/tournament-schedule.ts` | Parsing e agrupamento de grade |
| `lib/league/tournament-matching.ts` | Logica de matching |
| `lib/league/overlay-spreadsheet-parser.ts` | Parser de overlay |

---

## URL State Management

**Hook:** `use-su-dashboard-params.ts` (~90 linhas)

```typescript
type SUDashboardParams = {
  from: string | null;        // ISO date
  to: string | null;          // ISO date
  viewMode: "current_week" | "historical";
  weekPeriodId?: string;      // UUID opcional
};

// Computed
hasDateFilter: boolean;       // from ou to definido
isCurrentWeekView: boolean;   // viewMode === "current_week"
```

Usa `nuqs` para query state type-safe.

---

**Ultima atualizacao:** 2026-01-31
