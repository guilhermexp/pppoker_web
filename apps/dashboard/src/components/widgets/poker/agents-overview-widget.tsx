"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midday/ui/icons";
import { Skeleton } from "@midday/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

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

export function AgentsOverviewWidget() {
  const trpc = useTRPC();
  const t = useI18n();
  const { dateFrom, dateTo, superAgentId } = usePokerPlayerParams();

  const { data, isLoading } = useQuery(
    trpc.poker.players.getAgentStats.queryOptions({
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
      superAgentId: superAgentId ?? undefined,
    })
  );

  if (isLoading) {
    return <AgentsOverviewWidget.Skeleton />;
  }

  const stats = [
    {
      label: t("poker.agents.widgets.total_agents"),
      value: formatNumber(data?.totalAgents ?? 0),
      icon: Icons.Customers,
    },
    {
      label: t("poker.agents.widgets.managed_players"),
      value: formatNumber(data?.totalManagedPlayers ?? 0),
      icon: Icons.Face,
    },
    {
      label: t("poker.agents.widgets.total_rake"),
      value: formatCurrency(data?.totalRake ?? 0),
      icon: Icons.Currency,
      className: "text-green-600",
    },
    {
      label: t("poker.agents.widgets.rake_ppst"),
      value: formatCurrency(data?.totalRakePpst ?? 0),
      icon: Icons.Star,
      className: "text-blue-600",
    },
    {
      label: t("poker.agents.widgets.rake_ppsr"),
      value: formatCurrency(data?.totalRakePpsr ?? 0),
      icon: Icons.TrendingUp,
      className: "text-purple-600",
    },
    {
      label: t("poker.agents.widgets.total_commission"),
      value: formatCurrency(data?.totalCommission ?? 0),
      icon: Icons.Vat,
      className: "text-orange-600",
    },
  ];

  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <div className="flex items-center gap-2 mb-4">
        <Icons.ShowChart className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {t("poker.agents.widgets.overview_title")}
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-xl font-semibold ${stat.className ?? ""}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

AgentsOverviewWidget.Skeleton = function AgentsOverviewWidgetSkeleton() {
  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
};
