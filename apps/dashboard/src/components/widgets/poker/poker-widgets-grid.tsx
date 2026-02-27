"use client";

import { ErrorBoundary } from "@/components/error-boundary";
import { usePokerDashboardParams } from "@/hooks/use-poker-dashboard-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import {
  formatCurrency,
  formatNumberPtBR as formatNumber,
} from "@/utils/format";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PokerWidgetType } from "@midpoker/cache/poker-widget-preferences-cache";
import { Icons } from "@midpoker/ui/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useOnClickOutside } from "usehooks-ts";
import { PokerStatCard } from "./poker-stat-card";
import {
  usePokerAvailableWidgets,
  usePokerIsCustomizing,
  usePokerPrimaryWidgets,
  usePokerWidgetActions,
} from "./poker-widget-provider";

const NUMBER_OF_WIDGETS = 12;

// Sortable Card Component
function SortableCard({
  id,
  children,
  className,
  customizeMode,
  wiggleClass,
}: {
  id: string;
  children: React.ReactNode;
  className: string;
  customizeMode: boolean;
  wiggleClass?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !customizeMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} ${wiggleClass || ""} ${
        isDragging
          ? "opacity-100 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)] scale-105"
          : ""
      } relative`}
      {...attributes}
      {...(customizeMode ? listeners : {})}
    >
      {children}
    </div>
  );
}

// Widget Error Fallback
function WidgetErrorFallback() {
  return (
    <PokerStatCard title="Error" icon={<Icons.Error className="size-4" />}>
      <p className="text-sm text-muted-foreground">Failed to load widget</p>
    </PokerStatCard>
  );
}

// Empty Drop Zone Component
function EmptyDropZone() {
  const { isOver, setNodeRef } = useDroppable({
    id: "__empty__",
  });

  return (
    <div
      ref={setNodeRef}
      className={`border border-dashed rounded p-4 text-center min-h-[60px] flex items-center justify-center transition-colors ${
        isOver ? "border-primary/30 bg-primary/5" : "border-[#2a2a2a]"
      }`}
    >
      <p className="text-xs text-muted-foreground/30">
        {isOver ? "Solte aqui" : "Arraste widgets aqui para ocultar"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NEW LIVE WIDGETS (default primary)
// ---------------------------------------------------------------------------

function TotalMembersWidget({ data }: { data: any }) {
  const memberStats = data?._memberStats;
  const totalMembers = memberStats?.totalMembers ?? 0;
  const onlineMembers = memberStats?.onlineMembers ?? 0;
  const offlineMembers = totalMembers - onlineMembers;

  return (
    <PokerStatCard
      title="Total de Membros"
      icon={<Icons.Customers className="size-4" />}
      description="Membros cadastrados no clube"
      action="Ver membros"
      actionHref="/poker/membros"
      breakdown={[
        { label: "Online", value: onlineMembers, color: "green" as const },
        { label: "Offline", value: offlineMembers },
      ]}
    >
      <h2 className="text-2xl font-normal mb-2">
        {formatNumber(totalMembers)}
      </h2>
    </PokerStatCard>
  );
}

function PendingMembersWidget({ data }: { data: any }) {
  const memberStats = data?._memberStats;
  const pendingMembers = memberStats?.pendingMembers ?? 0;
  const newThisWeek = memberStats?.newThisWeek ?? 0;

  return (
    <PokerStatCard
      title="Novo Membro"
      icon={<Icons.Face className="size-4" />}
      description="Solicitações de entrada pendentes"
      action="Ver solicitações"
      actionHref="/poker/membros?tab=pending"
      breakdown={[
        {
          label: "Pendentes",
          value: pendingMembers,
          color: pendingMembers > 0 ? ("orange" as const) : undefined,
        },
        { label: "Novos esta semana", value: newThisWeek },
      ]}
    >
      <h2
        className={`text-2xl font-normal mb-2 ${pendingMembers > 0 ? "text-orange-500" : ""}`}
      >
        {formatNumber(pendingMembers)}
      </h2>
    </PokerStatCard>
  );
}

function CreditRequestsWidget({ data }: { data: any }) {
  const memberStats = data?._memberStats;
  const pendingCredits = memberStats?.pendingCredits ?? 0;

  return (
    <PokerStatCard
      title="Solicitação de Crédito"
      icon={<Icons.Currency className="size-4" />}
      description="Pedidos de crédito pendentes"
      action="Ver solicitações"
      actionHref="/poker/membros?tab=credit"
      breakdown={[
        {
          label: "Pendentes",
          value: pendingCredits,
          color: pendingCredits > 0 ? ("orange" as const) : undefined,
        },
      ]}
    >
      <h2
        className={`text-2xl font-normal mb-2 ${pendingCredits > 0 ? "text-orange-500" : ""}`}
      >
        {formatNumber(pendingCredits)}
      </h2>
    </PokerStatCard>
  );
}

function LiveTablesWidget({ data }: { data: any }) {
  const lobbyData = data?._lobbyData;
  const rooms = lobbyData?.rooms ?? [];
  const totalRooms = rooms.length;
  const activeRooms = rooms.filter((r: any) => r.is_running).length;
  const tournaments = rooms.filter(
    (r: any) => r.is_tournament && r.status !== 3,
  ).length;
  const cashGames = rooms.filter((r: any) => !r.is_tournament).length;

  return (
    <PokerStatCard
      title="Mesas Ativas"
      icon={<Icons.Inbox className="size-4" />}
      description="Mesas do clube em tempo real"
      action="Ver lobby"
      actionHref="/poker/lobby"
      breakdown={[
        { label: "Rodando", value: activeRooms, color: "green" as const },
        { label: "Torneios", value: tournaments },
        { label: "Cash", value: cashGames },
      ]}
    >
      <h2 className="text-2xl font-normal mb-2">{formatNumber(totalRooms)}</h2>
    </PokerStatCard>
  );
}

function OnlinePlayersWidget({ data }: { data: any }) {
  const lobbyData = data?._lobbyData;
  const memberStats = data?._memberStats;
  const rooms = lobbyData?.rooms ?? [];
  const playersInRooms = rooms.reduce(
    (s: number, r: any) => s + r.current_players,
    0,
  );
  const registeredInTournaments = rooms.reduce(
    (s: number, r: any) => s + (r.is_tournament ? r.registered : 0),
    0,
  );
  const onlineClub = memberStats?.onlineMembers ?? 0;

  return (
    <PokerStatCard
      title="Jogadores Online"
      icon={<Icons.Face className="size-4" />}
      description="Jogadores ativos agora"
      action="Ver lobby"
      actionHref="/poker/lobby"
      breakdown={[
        {
          label: "Online no clube",
          value: onlineClub,
          color: "green" as const,
        },
        { label: "Nas mesas", value: playersInRooms, color: "blue" as const },
        ...(registeredInTournaments > 0
          ? [{ label: "Registrados torneios", value: registeredInTournaments }]
          : []),
      ]}
    >
      <h2 className="text-2xl font-normal mb-2 text-green-500">
        {formatNumber(onlineClub)}
      </h2>
    </PokerStatCard>
  );
}

function FastchipsSoldWidget({ data }: { data: any }) {
  const fastchipsStats = data?._fastchipsStats;
  const totalVendidoHoje = fastchipsStats?.totalVendidoHoje ?? 0;
  const fichasEnviadasHoje = fastchipsStats?.fichasEnviadasHoje ?? 0;
  const fichasEnviadasTotal = fastchipsStats?.fichasEnviadas ?? 0;
  const pagos = fastchipsStats?.pago ?? 0;

  return (
    <PokerStatCard
      title="Fastchips Vendidas"
      icon={<Icons.Currency className="size-4" />}
      description="Total de fichas vendidas via Fastchips"
      action="Ver fastchips"
      actionHref="/fastchips"
      breakdown={[
        {
          label: "Vendido hoje",
          value: formatCurrency(totalVendidoHoje),
          color: "green" as const,
        },
        { label: "Enviadas hoje", value: fichasEnviadasHoje },
        { label: "Total enviadas", value: fichasEnviadasTotal },
        ...(pagos > 0
          ? [
              {
                label: "Aguardando envio",
                value: pagos,
                color: "orange" as const,
              },
            ]
          : []),
      ]}
    >
      <h2 className="text-2xl font-normal mb-2 text-green-500">
        {formatCurrency(totalVendidoHoje)}
      </h2>
    </PokerStatCard>
  );
}

// ---------------------------------------------------------------------------
// ANALYTICS WIDGETS (available by default)
// ---------------------------------------------------------------------------

function TotalSessionsWidget({ data }: { data: any }) {
  const t = useI18n();

  const sessionsBreakdown =
    data?.sessionsByType?.slice(0, 3).map((s: any) => ({
      label:
        s.type === "cash_game"
          ? "Cash Games"
          : s.type === "mtt"
            ? "MTT"
            : s.type === "spin"
              ? "SPIN"
              : s.type.toUpperCase(),
      value: s.count,
    })) ?? [];

  return (
    <PokerStatCard
      title={t("poker.dashboard.total_sessions")}
      icon={<Icons.Inbox className="size-4" />}
      description={t("poker.dashboard.sessions_description")}
      action={t("poker.dashboard.view_sessions")}
      actionHref="/poker/sessions"
      breakdown={sessionsBreakdown}
    >
      <h2 className="text-2xl font-normal mb-2">
        {formatNumber(data?.totalSessions ?? 0)}
      </h2>
    </PokerStatCard>
  );
}

function TotalPlayersWidget({ data }: { data: any }) {
  const t = useI18n();

  return (
    <PokerStatCard
      title={t("poker.dashboard.total_players")}
      icon={<Icons.Face className="size-4" />}
      description={t("poker.dashboard.players_description")}
      action={t("poker.dashboard.view_players")}
      actionHref="/poker/players"
      breakdown={[
        { label: "Com agente", value: data?.playersBreakdown?.withAgent ?? 0 },
        {
          label: "Sem agente",
          value: data?.playersBreakdown?.withoutAgent ?? 0,
        },
      ]}
    >
      <h2 className="text-2xl font-normal mb-2">
        {formatNumber(data?.totalPlayers ?? 0)}
      </h2>
    </PokerStatCard>
  );
}

function ActiveAgentsWidget({ data }: { data: any }) {
  const t = useI18n();

  return (
    <PokerStatCard
      title={t("poker.dashboard.active_agents")}
      icon={<Icons.Customers className="size-4" />}
      description={t("poker.dashboard.agents_description")}
      action={t("poker.dashboard.view_agents")}
      actionHref="/poker/agents"
      breakdown={[
        { label: "Agentes", value: data?.agentsBreakdown?.regular ?? 0 },
        { label: "Super agentes", value: data?.agentsBreakdown?.super ?? 0 },
      ]}
    >
      <h2 className="text-2xl font-normal mb-2">
        {formatNumber(data?.activeAgents ?? 0)}
      </h2>
    </PokerStatCard>
  );
}

function RakeTotalWidget({ data }: { data: any }) {
  const t = useI18n();

  return (
    <PokerStatCard
      title={t("poker.dashboard.rake_total")}
      icon={<Icons.Currency className="size-4" />}
      description={t("poker.dashboard.rake_total_description")}
      breakdown={[
        {
          label: "PPST (Torneios)",
          value: formatCurrency(data?.rakePpst ?? 0),
          color: "green" as const,
        },
        {
          label: "PPSR (Cash)",
          value: formatCurrency(data?.rakePpsr ?? 0),
          color: "green" as const,
        },
      ]}
    >
      <h2 className="text-2xl font-normal mb-2 text-green-500">
        {formatCurrency(data?.rakeTotal ?? 0)}
      </h2>
    </PokerStatCard>
  );
}

function RakeBreakdownWidget({ data }: { data: any }) {
  const rakePpst = data?.rakePpst ?? 0;
  const rakePpsr = data?.rakePpsr ?? 0;
  const rakeTotal = data?.rakeTotal ?? 0;

  const ppstPercent =
    rakeTotal > 0 ? Math.round((rakePpst / rakeTotal) * 100) : 0;
  const ppsrPercent =
    rakeTotal > 0 ? Math.round((rakePpsr / rakeTotal) * 100) : 0;

  return (
    <PokerStatCard
      title="Rake por Tipo"
      icon={<Icons.Category className="size-4" />}
      description="Distribuição do rake por modalidade"
      breakdown={[
        {
          label: `PPST (Torneios) - ${ppstPercent}%`,
          value: formatCurrency(rakePpst),
          color: "green" as const,
        },
        {
          label: `PPSR (Cash) - ${ppsrPercent}%`,
          value: formatCurrency(rakePpsr),
          color: "green" as const,
        },
      ]}
    >
      <h2 className="text-2xl font-normal mb-2 text-green-500">
        {formatCurrency(rakeTotal)}
      </h2>
    </PokerStatCard>
  );
}

function TotalRakebackWidget({ data }: { data: any }) {
  const t = useI18n();
  const { from, to } = usePokerDashboardParams();

  const formatPeriod = () => {
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      return `${fromDate.toLocaleDateString("pt-BR")} - ${toDate.toLocaleDateString("pt-BR")}`;
    }
    return "Todo o período";
  };

  return (
    <PokerStatCard
      title={t("poker.dashboard.total_rakeback")}
      icon={<Icons.Vat className="size-4" />}
      description={t("poker.dashboard.rakeback_description")}
      breakdown={[
        {
          label: "PPST (Torneios)",
          value: formatCurrency(data?.rakebackBreakdown?.ppst ?? 0),
          color: "green" as const,
        },
        {
          label: "PPSR (Cash)",
          value: formatCurrency(data?.rakebackBreakdown?.ppsr ?? 0),
          color: "green" as const,
        },
      ]}
    >
      <h2 className="text-2xl font-normal mb-2 text-green-500">
        {formatCurrency(data?.totalRakeback ?? 0)}
      </h2>
      <div className="text-xs text-muted-foreground mb-2">
        <span>Rake total: {formatCurrency(data?.rakeTotal ?? 0)}</span>
        <span className="mx-2">•</span>
        <span>{formatPeriod()}</span>
      </div>
    </PokerStatCard>
  );
}

function PlayerResultsWidget({ data }: { data: any }) {
  const t = useI18n();

  return (
    <PokerStatCard
      title={t("poker.dashboard.player_results")}
      icon={<Icons.ShowChart className="size-4" />}
      description={t("poker.dashboard.player_results_description")}
      breakdown={[
        {
          label: "Winners",
          value: data?.resultsBreakdown?.winners ?? 0,
          color: "green" as const,
        },
        {
          label: "Losers",
          value: data?.resultsBreakdown?.losers ?? 0,
          color: "red" as const,
        },
      ]}
    >
      <h2
        className={`text-2xl font-normal mb-2 ${(data?.playerResults ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}
      >
        {formatCurrency(data?.playerResults ?? 0)}
      </h2>
    </PokerStatCard>
  );
}

const GAME_VARIANT_LABELS: Record<string, string> = {
  nlh: "NLH",
  plo4: "PLO4",
  plo5: "PLO5",
  plo6: "PLO6",
  nlh_6plus: "6+",
  nlh_aof: "AOF",
  ofc: "OFC",
  mixed: "Mixed",
};

function GameTypesWidget({ data }: { data: any }) {
  const t = useI18n();

  const gameTypes =
    data?.gameTypeBreakdown?.slice(0, 4).map((g: any) => ({
      label: GAME_VARIANT_LABELS[g.variant] || g.variant.toUpperCase(),
      value: `${g.count} (${g.percentage}%)`,
    })) ?? [];

  return (
    <PokerStatCard
      title={t("poker.dashboard.game_types")}
      icon={<Icons.Category className="size-4" />}
      description={t("poker.dashboard.game_types_description")}
      breakdown={gameTypes}
    >
      <h2 className="text-2xl font-normal mb-2">
        {data?.gameTypeBreakdown?.length ?? 0} {t("poker.dashboard.variants")}
      </h2>
    </PokerStatCard>
  );
}

function PlayersByRegionWidget({ data }: { data: any }) {
  const t = useI18n();

  const regions =
    data?.playersByRegion?.slice(0, 4).map((r: any) => ({
      label: r.region,
      value: `${r.count} (${r.percentage}%)`,
    })) ?? [];

  return (
    <PokerStatCard
      title={t("poker.dashboard.players_by_region")}
      icon={<Icons.Globle className="size-4" />}
      description={t("poker.dashboard.players_by_region_description")}
      breakdown={regions}
    >
      <h2 className="text-2xl font-normal mb-2">
        {data?.playersByRegion?.length ?? 0} {t("poker.dashboard.regions")}
      </h2>
    </PokerStatCard>
  );
}

function GeneralResultWidget({ data }: { data: any }) {
  const t = useI18n();
  const generalResult = data?.generalResult ?? 0;

  return (
    <PokerStatCard
      title={t("poker.dashboard.general_result")}
      icon={<Icons.TrendingUp className="size-4" />}
      description={t("poker.dashboard.general_result_description")}
      breakdown={[
        {
          label: t("poker.dashboard.winnings_events"),
          value: formatCurrency(data?.playerResults ?? 0),
          color:
            (data?.playerResults ?? 0) >= 0
              ? ("green" as const)
              : ("red" as const),
        },
        {
          label: t("poker.dashboard.minus_fee"),
          value: formatCurrency(-(data?.rakeTotal ?? 0)),
          color: "red" as const,
        },
      ]}
    >
      <h2
        className={`text-2xl font-normal mb-2 ${generalResult >= 0 ? "text-green-500" : "text-red-500"}`}
      >
        {formatCurrency(generalResult)}
      </h2>
    </PokerStatCard>
  );
}

// ---------------------------------------------------------------------------
// Widget mapping to components
// ---------------------------------------------------------------------------

const WIDGET_COMPONENTS: Record<
  PokerWidgetType,
  React.ComponentType<{ data: any }>
> = {
  // Live widgets
  "poker-total-members": TotalMembersWidget,
  "poker-pending-members": PendingMembersWidget,
  "poker-credit-requests": CreditRequestsWidget,
  "poker-live-tables": LiveTablesWidget,
  "poker-online-players": OnlinePlayersWidget,
  "poker-fastchips-sold": FastchipsSoldWidget,
  // Analytics widgets
  "poker-total-sessions": TotalSessionsWidget,
  "poker-total-players": TotalPlayersWidget,
  "poker-active-agents": ActiveAgentsWidget,
  "poker-rake-total": RakeTotalWidget,
  "poker-rake-breakdown": RakeBreakdownWidget,
  "poker-total-rakeback": TotalRakebackWidget,
  "poker-player-results": PlayerResultsWidget,
  "poker-general-result": GeneralResultWidget,
  "poker-game-types": GameTypesWidget,
  "poker-players-by-region": PlayersByRegionWidget,
};

// ---------------------------------------------------------------------------
// Widgets that need live data (from bridge / member stats / fastchips)
// ---------------------------------------------------------------------------

const LIVE_WIDGETS = new Set<PokerWidgetType>([
  "poker-total-members",
  "poker-pending-members",
  "poker-credit-requests",
  "poker-online-players",
]);

const LOBBY_WIDGETS = new Set<PokerWidgetType>([
  "poker-live-tables",
  "poker-online-players",
]);

const FASTCHIPS_WIDGETS = new Set<PokerWidgetType>(["poker-fastchips-sold"]);

export function PokerWidgetsGrid() {
  const trpc = useTRPC();
  const t = useI18n();
  const { from, to, viewMode } = usePokerDashboardParams();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const gridRef = useRef<HTMLDivElement>(null!);

  const isCustomizing = usePokerIsCustomizing();
  const primaryWidgets = usePokerPrimaryWidgets();
  const availableWidgets = usePokerAvailableWidgets();
  const { setIsCustomizing } = usePokerWidgetActions();

  useOnClickOutside(gridRef, (event) => {
    if (isCustomizing) {
      const target = event.target as Element;
      if (!target.closest("[data-no-close]")) {
        setIsCustomizing(false);
      }
    }
  });

  const {
    reorderPrimaryWidgets,
    moveToAvailable,
    moveToPrimary,
    swapWithLastPrimary,
    setSaving,
  } = usePokerWidgetActions();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Check which data sources are needed based on visible widgets
  const allVisibleWidgets = [
    ...primaryWidgets,
    ...(isCustomizing ? availableWidgets : []),
  ];
  const needsLiveData = allVisibleWidgets.some((w) => LIVE_WIDGETS.has(w));
  const needsLobbyData = allVisibleWidgets.some((w) => LOBBY_WIDGETS.has(w));
  const needsFastchipsData = allVisibleWidgets.some((w) =>
    FASTCHIPS_WIDGETS.has(w),
  );
  const needsAnalyticsData = allVisibleWidgets.some(
    (w) =>
      !LIVE_WIDGETS.has(w) &&
      !LOBBY_WIDGETS.has(w) &&
      !FASTCHIPS_WIDGETS.has(w),
  );

  // Fetch open periods for analytics
  const { data: openPeriods, isLoading: isLoadingPeriods } = useQuery(
    trpc.poker.weekPeriods.getOpenPeriods.queryOptions(),
  );

  const currentWeekPeriod = openPeriods?.[0] ?? null;

  const effectiveFrom =
    viewMode === "current_week" && currentWeekPeriod
      ? currentWeekPeriod.weekStart
      : (from ?? undefined);
  const effectiveTo =
    viewMode === "current_week" && currentWeekPeriod
      ? currentWeekPeriod.weekEnd
      : (to ?? undefined);

  // Analytics data (for session/rake/player analytics widgets)
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery(
    trpc.poker.analytics.getDashboardStats.queryOptions({
      from: effectiveFrom,
      to: effectiveTo,
      viewMode: undefined,
      includeDraft: viewMode === "current_week",
    }),
  );

  // Member stats (for member/pending/credit widgets)
  const { data: memberStats } = useQuery({
    ...trpc.poker.members.getStats.queryOptions(),
    refetchInterval: 30_000,
    enabled: needsLiveData || isCustomizing,
  });

  // Lobby rooms (for tables/online players widgets)
  const { data: lobbyData } = useQuery({
    ...trpc.poker.rooms.getLive.queryOptions({}),
    refetchInterval: 30_000,
    enabled: needsLobbyData || isCustomizing,
  });

  // Fastchips stats
  const { data: fastchipsStats } = useQuery({
    ...trpc.fastchips.paymentOrders.getStats.queryOptions(),
    refetchInterval: 30_000,
    enabled: needsFastchipsData || isCustomizing,
  });

  // Merge all data sources into one object for widgets
  const mergedData = {
    ...analyticsData,
    _memberStats: memberStats,
    _lobbyData: lobbyData,
    _fastchipsStats: fastchipsStats,
  };

  const updatePreferencesMutation = useMutation(
    trpc.poker.analytics.updateWidgetPreferences.mutationOptions({
      onMutate: () => {
        setSaving(true);
      },
      onSettled: () => {
        setSaving(false);
      },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeWidgetId = active.id as PokerWidgetType;
    const overWidgetId = over.id as PokerWidgetType;

    const activeInPrimary = primaryWidgets.includes(activeWidgetId);
    const activeInAvailable = availableWidgets.includes(activeWidgetId);
    const overInPrimary = primaryWidgets.includes(overWidgetId);
    const overInAvailable = availableWidgets.includes(overWidgetId);

    if (activeInPrimary && overInPrimary) {
      const activeIndex = primaryWidgets.indexOf(activeWidgetId);
      const overIndex = primaryWidgets.indexOf(overWidgetId);

      if (activeIndex !== overIndex) {
        const newOrder = arrayMove(primaryWidgets, activeIndex, overIndex);
        reorderPrimaryWidgets(newOrder);
        setTimeout(() => {
          updatePreferencesMutation.mutate({ primaryWidgets: newOrder });
        }, 100);
      }
    } else if (activeInAvailable && overInPrimary) {
      const overIndex = primaryWidgets.indexOf(overWidgetId);
      const insertIndex = overIndex >= 0 ? overIndex : primaryWidgets.length;

      if (primaryWidgets.length >= NUMBER_OF_WIDGETS) {
        swapWithLastPrimary(activeWidgetId, insertIndex);
        const newPrimary = [...primaryWidgets.slice(0, -1)];
        newPrimary.splice(insertIndex, 0, activeWidgetId);

        setTimeout(() => {
          updatePreferencesMutation.mutate({ primaryWidgets: newPrimary });
        }, 100);
      } else {
        const newPrimary = [...primaryWidgets];
        newPrimary.splice(insertIndex, 0, activeWidgetId);

        moveToPrimary(activeWidgetId, newPrimary);

        setTimeout(() => {
          updatePreferencesMutation.mutate({ primaryWidgets: newPrimary });
        }, 100);
      }
    } else if (
      activeInPrimary &&
      (overInAvailable || over.id === "__empty__")
    ) {
      moveToAvailable(activeWidgetId);
      const newPrimary = primaryWidgets.filter((w) => w !== activeWidgetId);
      setTimeout(() => {
        updatePreferencesMutation.mutate({ primaryWidgets: newPrimary });
      }, 100);
    }

    setActiveId(null);
  }

  const getWiggleClass = (index: number) => {
    if (!isCustomizing) return "";
    const wiggleIndex = (index % NUMBER_OF_WIDGETS) + 1;
    return `wiggle-${wiggleIndex}`;
  };

  const showSkeleton =
    isLoadingAnalytics || (viewMode === "current_week" && isLoadingPeriods);

  if (showSkeleton) {
    return <PokerWidgetsGrid.Skeleton />;
  }

  const ActiveWidgetComponent = WIDGET_COMPONENTS[activeId as PokerWidgetType];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div ref={gridRef}>
        {isCustomizing && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Widgets visíveis
            </h3>
            <p className="text-xs text-muted-foreground/60">
              Arraste para reordenar ou mova para baixo para ocultar
            </p>
          </div>
        )}

        {isCustomizing ? (
          <SortableContext
            items={primaryWidgets.filter((w) => WIDGET_COMPONENTS[w])}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
              {primaryWidgets.map((widgetType, index) => {
                const WidgetComponent = WIDGET_COMPONENTS[widgetType];
                if (!WidgetComponent) return null;
                const wiggleClass = getWiggleClass(index);

                return (
                  <SortableCard
                    key={widgetType}
                    id={widgetType}
                    className="relative cursor-grab active:cursor-grabbing"
                    customizeMode={isCustomizing}
                    wiggleClass={wiggleClass}
                  >
                    <ErrorBoundary fallback={<WidgetErrorFallback />}>
                      <WidgetComponent data={mergedData} />
                    </ErrorBoundary>
                  </SortableCard>
                );
              })}
            </div>
          </SortableContext>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
            {primaryWidgets.map((widgetType) => {
              const WidgetComponent = WIDGET_COMPONENTS[widgetType];
              if (!WidgetComponent) return null;
              return (
                <ErrorBoundary
                  key={widgetType}
                  fallback={<WidgetErrorFallback />}
                >
                  <WidgetComponent data={mergedData} />
                </ErrorBoundary>
              );
            })}
          </div>
        )}

        {isCustomizing && (
          <>
            <div className="my-8 relative">
              <div className="border-t border-dashed border-border" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4">
                <span className="text-xs text-muted-foreground">
                  {t("dashboard.drag_to_show")}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Widgets ocultos
              </h3>
              <p className="text-xs text-muted-foreground/60">
                {availableWidgets.length > 0
                  ? "Arraste para a área acima para exibir no painel"
                  : "Arraste widgets aqui para ocultá-los do painel"}
              </p>
            </div>

            {availableWidgets.filter((w) => WIDGET_COMPONENTS[w]).length > 0 ? (
              <SortableContext
                items={availableWidgets.filter((w) => WIDGET_COMPONENTS[w])}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
                  {availableWidgets.map((widgetType, index) => {
                    const WidgetComponent = WIDGET_COMPONENTS[widgetType];
                    if (!WidgetComponent) return null;
                    const wiggleClass = getWiggleClass(
                      primaryWidgets.length + index,
                    );

                    return (
                      <SortableCard
                        key={widgetType}
                        id={widgetType}
                        className="opacity-60 hover:opacity-70 cursor-grab active:cursor-grabbing"
                        customizeMode={isCustomizing}
                        wiggleClass={wiggleClass}
                      >
                        <ErrorBoundary fallback={<WidgetErrorFallback />}>
                          <WidgetComponent data={mergedData} />
                        </ErrorBoundary>
                      </SortableCard>
                    );
                  })}
                </div>
              </SortableContext>
            ) : (
              <EmptyDropZone />
            )}
          </>
        )}

        <DragOverlay>
          {activeId && ActiveWidgetComponent ? (
            <div className="shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-background cursor-grabbing opacity-90 transform-gpu will-change-transform">
              <ErrorBoundary fallback={<WidgetErrorFallback />}>
                <ActiveWidgetComponent data={mergedData} />
              </ErrorBoundary>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

PokerWidgetsGrid.Skeleton = function PokerWidgetsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <PokerStatCard.Skeleton key={i} />
      ))}
    </div>
  );
};
