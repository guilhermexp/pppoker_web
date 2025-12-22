"use client";

import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midday/ui/icons";
import { Skeleton } from "@midday/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

export function PokerOverviewWidget() {
  const trpc = useTRPC();
  const t = useI18n();

  const { data, isLoading } = useQuery(
    trpc.poker.analytics.getOverview.queryOptions()
  );

  if (isLoading) {
    return <PokerOverviewWidget.Skeleton />;
  }

  const stats = [
    {
      label: t("poker.dashboard.totalPlayers"),
      value: data?.totalPlayers ?? 0,
      icon: Icons.Customers,
    },
    {
      label: t("poker.dashboard.activeAgents"),
      value: data?.totalAgents ?? 0,
      icon: Icons.AccountCircle,
    },
    {
      label: t("poker.dashboard.activePlayers"),
      value: data?.activePlayers ?? 0,
      icon: Icons.Face,
    },
    {
      label: t("poker.dashboard.pendingSettlements"),
      value: data?.pendingSettlements ?? 0,
      icon: Icons.Vat,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]"
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <p className="text-2xl font-medium">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

PokerOverviewWidget.Skeleton = function PokerOverviewWidgetSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
};
