"use client";

import { ErrorBoundary } from "@/components/error-boundary";
import { useSUDashboardParams } from "@/hooks/use-su-dashboard-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midpoker/ui/icons";
import { useQuery } from "@tanstack/react-query";
import { SUStatCard } from "./su-stat-card";
import {
  type SUWidgetType,
  useSUAvailableWidgets,
  useSUIsCustomizing,
  useSUPrimaryWidgets,
  useSUWidgetActions,
} from "./su-widget-provider";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

// Widget Error Fallback
function WidgetErrorFallback() {
  return (
    <SUStatCard title="Error" icon={<Icons.Error className="size-4" />}>
      <p className="text-sm text-muted-foreground">Failed to load widget</p>
    </SUStatCard>
  );
}

// ============= WIDGET COMPONENTS =============

function TotalLeaguesWidget({ data }: { data: any }) {
  return (
    <SUStatCard
      title="Total de Ligas"
      icon={<Icons.Link className="size-4" />}
      description="Ligas ativas no período"
      action="Ver ligas"
      actionHref="/su/ligas"
      breakdown={[
        { label: "Com jogos PPST", value: formatNumber(data?.leaguesWithPPST ?? 0) },
        { label: "Com jogos PPSR", value: formatNumber(data?.leaguesWithPPSR ?? 0) },
      ]}
    >
      <h2 className="text-2xl font-normal mb-2">
        {formatNumber(data?.totalLeagues ?? 0)}
      </h2>
    </SUStatCard>
  );
}

function TotalGamesPPSTWidget({ data }: { data: any }) {
  return (
    <SUStatCard
      title="Jogos PPST"
      icon={<Icons.Inbox className="size-4" />}
      description="Total de torneios"
      action="Ver jogos"
      actionHref="/su/jogos?type=ppst"
      breakdown={[
        { label: "NLH", value: data?.gamesPPSTByType?.nlh ?? 0 },
        { label: "SpinUp", value: data?.gamesPPSTByType?.spinup ?? 0 },
        { label: "PKO/MKO", value: data?.gamesPPSTByType?.knockout ?? 0 },
      ]}
    >
      <h2 className="text-2xl font-normal mb-2">
        {formatNumber(data?.totalGamesPPST ?? 0)}
      </h2>
    </SUStatCard>
  );
}

function TotalGamesPPSRWidget({ data }: { data: any }) {
  return (
    <SUStatCard
      title="Jogos PPSR"
      icon={<Icons.Inbox className="size-4" />}
      description="Total de cash games"
      action="Ver jogos"
      actionHref="/su/jogos?type=ppsr"
      breakdown={[
        { label: "NLH", value: data?.gamesPPSRByType?.nlh ?? 0 },
        { label: "PLO", value: data?.gamesPPSRByType?.plo ?? 0 },
        { label: "Outros", value: data?.gamesPPSRByType?.other ?? 0 },
      ]}
    >
      <h2 className="text-2xl font-normal mb-2">
        {formatNumber(data?.totalGamesPPSR ?? 0)}
      </h2>
    </SUStatCard>
  );
}

function LeagueEarningsWidget({ data }: { data: any }) {
  return (
    <SUStatCard
      title="Ganhos das Ligas"
      icon={<Icons.Currency className="size-4" />}
      description="Taxa total cobrada pelas ligas"
      breakdown={[
        {
          label: "PPST (Torneios)",
          value: formatCurrency(data?.leagueEarningsPPST ?? 0),
          color: "green" as const,
        },
        {
          label: "PPSR (Cash)",
          value: formatCurrency(data?.leagueEarningsPPSR ?? 0),
          color: "green" as const,
        },
      ]}
    >
      <h2 className="text-2xl font-normal mb-2 text-green-500">
        {formatCurrency(data?.leagueEarningsTotal ?? 0)}
      </h2>
    </SUStatCard>
  );
}

function GapGuaranteedWidget({ data }: { data: any }) {
  const gapTotal = data?.gapGuaranteedTotal ?? 0;
  const isNegative = gapTotal < 0;

  return (
    <SUStatCard
      title="Gap Garantido"
      icon={<Icons.TrendingDown className="size-4" />}
      description="Overlay de premiação garantida"
      breakdown={[
        { label: "Torneios com gap", value: data?.gamesWithGap ?? 0 },
        {
          label: "Maior gap",
          value: formatCurrency(data?.maxGap ?? 0),
          color: "red" as const,
        },
      ]}
    >
      <h2
        className={`text-2xl font-normal mb-2 ${isNegative ? "text-red-500" : "text-green-500"}`}
      >
        {formatCurrency(gapTotal)}
      </h2>
    </SUStatCard>
  );
}

function PlayerWinningsWidget({ data }: { data: any }) {
  const winnings = data?.playerWinningsTotal ?? 0;

  return (
    <SUStatCard
      title="Ganhos dos Jogadores"
      icon={<Icons.ShowChart className="size-4" />}
      description="Resultado total dos jogadores"
      breakdown={[
        {
          label: "PPST",
          value: formatCurrency(data?.playerWinningsPPST ?? 0),
          color:
            (data?.playerWinningsPPST ?? 0) >= 0
              ? ("green" as const)
              : ("red" as const),
        },
        {
          label: "PPSR",
          value: formatCurrency(data?.playerWinningsPPSR ?? 0),
          color:
            (data?.playerWinningsPPSR ?? 0) >= 0
              ? ("green" as const)
              : ("red" as const),
        },
      ]}
    >
      <h2
        className={`text-2xl font-normal mb-2 ${winnings >= 0 ? "text-green-500" : "text-red-500"}`}
      >
        {formatCurrency(winnings)}
      </h2>
    </SUStatCard>
  );
}

function BreakdownPPSTPPSRWidget({ data }: { data: any }) {
  const ppstTotal = data?.totalGamesPPST ?? 0;
  const ppsrTotal = data?.totalGamesPPSR ?? 0;
  const total = ppstTotal + ppsrTotal;

  const ppstPercent = total > 0 ? Math.round((ppstTotal / total) * 100) : 0;
  const ppsrPercent = total > 0 ? Math.round((ppsrTotal / total) * 100) : 0;

  return (
    <SUStatCard
      title="Distribuição PPST/PPSR"
      icon={<Icons.Category className="size-4" />}
      description="Proporção de jogos por tipo"
      breakdown={[
        {
          label: `PPST (Torneios) - ${ppstPercent}%`,
          value: formatNumber(ppstTotal),
          color: "blue" as const,
        },
        {
          label: `PPSR (Cash) - ${ppsrPercent}%`,
          value: formatNumber(ppsrTotal),
          color: "purple" as const,
        },
      ]}
    >
      <h2 className="text-2xl font-normal mb-2">{formatNumber(total)} jogos</h2>
    </SUStatCard>
  );
}

function TopLeaguesWidget({ data }: { data: any }) {
  const topLeagues = data?.topLeagues ?? [];

  return (
    <SUStatCard
      title="Top Ligas"
      icon={<Icons.Star className="size-4" />}
      description="Ligas por volume de taxa"
      action="Ver ranking"
      actionHref="/su/ligas"
      breakdown={topLeagues.slice(0, 3).map((league: any, index: number) => ({
        label: `${index + 1}. ${league.ligaNome}`,
        value: formatCurrency(league.totalFee),
        color: index === 0 ? ("green" as const) : undefined,
      }))}
    >
      <h2 className="text-2xl font-normal mb-2">
        {topLeagues.length} ligas ativas
      </h2>
    </SUStatCard>
  );
}

// Widget mapping to components
const WIDGET_COMPONENTS: Record<
  SUWidgetType,
  React.ComponentType<{ data: any }>
> = {
  "su-total-leagues": TotalLeaguesWidget,
  "su-total-games-ppst": TotalGamesPPSTWidget,
  "su-total-games-ppsr": TotalGamesPPSRWidget,
  "su-league-earnings": LeagueEarningsWidget,
  "su-gap-guaranteed": GapGuaranteedWidget,
  "su-player-winnings": PlayerWinningsWidget,
  "su-breakdown-ppst-ppsr": BreakdownPPSTPPSRWidget,
  "su-top-leagues": TopLeaguesWidget,
};

export function SUWidgetsGrid() {
  const t = useI18n();
  const trpc = useTRPC();
  const { from, to, viewMode } = useSUDashboardParams();

  const isCustomizing = useSUIsCustomizing();
  const primaryWidgets = useSUPrimaryWidgets();
  const availableWidgets = useSUAvailableWidgets();
  const { setIsCustomizing } = useSUWidgetActions();

  // Fetch data from su.analytics.getDashboardStats
  const { data, isLoading } = useQuery(
    trpc.su.analytics.getDashboardStats.queryOptions(
      {
        from: from ?? undefined,
        to: to ?? undefined,
        viewMode: viewMode ?? undefined,
      },
      {
        refetchOnWindowFocus: false,
      },
    ),
  );

  if (isLoading) {
    return <SUWidgetsGrid.Skeleton />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
      {primaryWidgets.map((widgetType) => {
        const WidgetComponent = WIDGET_COMPONENTS[widgetType];
        if (!WidgetComponent) return null;
        return (
          <ErrorBoundary key={widgetType} fallback={<WidgetErrorFallback />}>
            <WidgetComponent data={data} />
          </ErrorBoundary>
        );
      })}
    </div>
  );
}

SUWidgetsGrid.Skeleton = function SUWidgetsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <SUStatCard.Skeleton key={i} />
      ))}
    </div>
  );
};
