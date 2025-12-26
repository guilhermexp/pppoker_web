"use client";

import { usePokerDashboardParams } from "@/hooks/use-poker-dashboard-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midday/ui/icons";
import { useQuery } from "@tanstack/react-query";
import { PokerStatCard } from "./poker-stat-card";

function formatCurrency(value: number) {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatNumber(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString("pt-BR");
}

export function PokerWidgetsGrid() {
  const trpc = useTRPC();
  const t = useI18n();
  const { from, to } = usePokerDashboardParams();

  const { data, isLoading } = useQuery(
    trpc.poker.analytics.getDashboardStats.queryOptions({
      from: from ?? undefined,
      to: to ?? undefined,
    })
  );

  if (isLoading) {
    return <PokerWidgetsGrid.Skeleton />;
  }

  return (
    <>
      {/* First row - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
        {/* Total Sessions */}
        <PokerStatCard
          title={t("poker.dashboard.total_sessions")}
          icon={<Icons.Inbox className="size-4" />}
          description={t("poker.dashboard.sessions_description")}
          action={t("poker.dashboard.view_sessions")}
          actionHref="/poker/sessions"
        >
          <h2 className="text-2xl font-normal mb-2">
            {formatNumber(data?.totalSessions ?? 0)}
          </h2>
        </PokerStatCard>

        {/* Total Players */}
        <PokerStatCard
          title={t("poker.dashboard.total_players")}
          icon={<Icons.Face className="size-4" />}
          description={t("poker.dashboard.players_description")}
          action={t("poker.dashboard.view_players")}
          actionHref="/poker/players"
        >
          <h2 className="text-2xl font-normal mb-2">
            {formatNumber(data?.totalPlayers ?? 0)}
          </h2>
        </PokerStatCard>

        {/* Active Agents */}
        <PokerStatCard
          title={t("poker.dashboard.active_agents")}
          icon={<Icons.Customers className="size-4" />}
          description={t("poker.dashboard.agents_description")}
          action={t("poker.dashboard.view_agents")}
          actionHref="/poker/agents"
        >
          <h2 className="text-2xl font-normal mb-2">
            {formatNumber(data?.activeAgents ?? 0)}
          </h2>
        </PokerStatCard>

        {/* Rake Total */}
        <PokerStatCard
          title={t("poker.dashboard.rake_total")}
          icon={<Icons.Currency className="size-4" />}
          description={t("poker.dashboard.rake_total_description")}
        >
          <h2 className="text-2xl font-normal mb-2">
            {formatCurrency(data?.rakeTotal ?? 0)}
          </h2>
        </PokerStatCard>
      </div>

      {/* Second row - 4 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
        {/* Rake PPST */}
        <PokerStatCard
          title={t("poker.dashboard.rake_ppst")}
          icon={<Icons.Star className="size-4" />}
          description={t("poker.dashboard.rake_ppst_description")}
        >
          <h2 className="text-2xl font-normal mb-2">
            {formatCurrency(data?.rakePpst ?? 0)}
          </h2>
        </PokerStatCard>

        {/* Rake PPSR */}
        <PokerStatCard
          title={t("poker.dashboard.rake_ppsr")}
          icon={<Icons.TrendingUp className="size-4" />}
          description={t("poker.dashboard.rake_ppsr_description")}
        >
          <h2 className="text-2xl font-normal mb-2">
            {formatCurrency(data?.rakePpsr ?? 0)}
          </h2>
        </PokerStatCard>

        {/* Estimated Commission */}
        <PokerStatCard
          title={t("poker.dashboard.estimated_commission")}
          icon={<Icons.Vat className="size-4" />}
          description={t("poker.dashboard.commission_description")}
        >
          <h2 className="text-2xl font-normal mb-2">
            {formatCurrency(data?.estimatedCommission ?? 0)}
          </h2>
        </PokerStatCard>

        {/* Player Results (Winnings/Losses) */}
        <PokerStatCard
          title={t("poker.dashboard.player_results")}
          icon={<Icons.ShowChart className="size-4" />}
          description={t("poker.dashboard.player_results_description")}
        >
          <h2 className="text-2xl font-normal mb-2">
            {formatCurrency(data?.playerResults ?? 0)}
          </h2>
        </PokerStatCard>
      </div>
    </>
  );
}

PokerWidgetsGrid.Skeleton = function PokerWidgetsGridSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
        {[1, 2, 3, 4].map((i) => (
          <PokerStatCard.Skeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
        {[5, 6, 7, 8].map((i) => (
          <PokerStatCard.Skeleton key={i} />
        ))}
      </div>
    </>
  );
};
