"use client";

import { usePokerSessionParams } from "@/hooks/use-poker-session-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import {
  formatCurrency,
  formatNumberPtBR as formatNumber,
} from "@/utils/format";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

export function SessionsOverviewWidget() {
  const trpc = useTRPC();
  const t = useI18n();
  const { dateFrom, dateTo, sessionType, gameVariant } =
    usePokerSessionParams();

  const { data, isLoading } = useQuery(
    trpc.poker.sessions.getStats.queryOptions({
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
      sessionType: sessionType ?? undefined,
      gameVariant: gameVariant ?? undefined,
    }),
  );

  if (isLoading) {
    return <SessionsOverviewWidget.Skeleton />;
  }

  const stats = [
    {
      label: t("poker.sessions.widgets.total_sessions"),
      value: formatNumber(data?.totalSessions ?? 0),
      icon: Icons.PieChart,
    },
    {
      label: t("poker.sessions.widgets.unique_players"),
      value: formatNumber(data?.uniquePlayerCount ?? 0),
      icon: Icons.Customers,
    },
    {
      label: t("poker.sessions.widgets.total_buy_in"),
      value: formatCurrency(data?.totalBuyIn ?? 0),
      icon: Icons.ArrowUpward,
    },
    {
      label: t("poker.sessions.widgets.total_rake"),
      value: formatCurrency(data?.totalRake ?? 0),
      icon: Icons.Vat,
      className: "text-green-600",
    },
    {
      label: t("poker.sessions.widgets.total_gtd"),
      value: formatCurrency(data?.totalGtd ?? 0),
      icon: Icons.Star,
    },
    {
      label: t("poker.sessions.widgets.total_hands"),
      value: formatNumber(data?.totalHandsPlayed ?? 0),
      icon: Icons.TrendingUp,
    },
  ];

  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <div className="flex items-center gap-2 mb-4">
        <Icons.ShowChart className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {t("poker.sessions.widgets.overview_title")}
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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

SessionsOverviewWidget.Skeleton = function SessionsOverviewWidgetSkeleton() {
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
