"use client";

import { usePokerDashboardParams } from "@/hooks/use-poker-dashboard-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
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

export function PokerOverviewWidget() {
  const trpc = useTRPC();
  const t = useI18n();
  const { from, to } = usePokerDashboardParams();

  const { data, isLoading } = useQuery(
    trpc.poker.analytics.getDashboardStats.queryOptions({
      from: from ?? undefined,
      to: to ?? undefined,
    }),
  );

  if (isLoading) {
    return <PokerOverviewWidget.Skeleton />;
  }

  const stats = [
    {
      label: t("poker.dashboard.total_sessions"),
      value: formatNumber(data?.totalSessions ?? 0),
      icon: Icons.Inbox,
    },
    {
      label: t("poker.dashboard.total_players"),
      value: formatNumber(data?.totalPlayers ?? 0),
      icon: Icons.Face,
    },
    {
      label: t("poker.dashboard.active_agents"),
      value: formatNumber(data?.activeAgents ?? 0),
      icon: Icons.Customers,
    },
    {
      label: t("poker.dashboard.rake_total"),
      value: formatCurrency(data?.rakeTotal ?? 0),
      icon: Icons.Currency,
      className: "text-green-600",
    },
    {
      label: t("poker.dashboard.rake_ppst"),
      value: formatCurrency(data?.rakePpst ?? 0),
      icon: Icons.Star,
      className: "text-blue-600",
    },
    {
      label: t("poker.dashboard.rake_ppsr"),
      value: formatCurrency(data?.rakePpsr ?? 0),
      icon: Icons.TrendingUp,
      className: "text-purple-600",
    },
    {
      label: t("poker.dashboard.estimated_commission"),
      value: formatCurrency(data?.estimatedCommission ?? 0),
      icon: Icons.Vat,
      className: "text-orange-600",
    },
  ];

  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <div className="flex items-center gap-2 mb-4">
        <Icons.ShowChart className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {t("poker.dashboard.overview_title")}
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {stat.label}
              </span>
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

PokerOverviewWidget.Skeleton = function PokerOverviewWidgetSkeleton() {
  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
};
