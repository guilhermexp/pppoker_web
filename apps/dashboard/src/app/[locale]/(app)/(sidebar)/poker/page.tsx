import { ErrorFallback } from "@/components/error-fallback";
import { CloseWeekButton } from "@/components/poker/close-week-button";
import {
  PokerOverviewWidget,
  TopPlayersWidget,
  DebtorsWidget,
  GrossRakeWidget,
  BankResultWidget,
  RevenueByGameWidget,
} from "@/components/widgets/poker";
import { getI18n } from "@/locales/server";
import { getQueryClient, trpc } from "@/trpc/server";
import { Icons } from "@midday/ui/icons";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Poker Club | Midday",
};

export default async function PokerPage() {
  const queryClient = getQueryClient();
  const t = await getI18n();

  // Prefetch analytics data
  await Promise.all([
    queryClient.prefetchQuery(trpc.poker.analytics.getOverview.queryOptions()),
    queryClient.prefetchQuery(trpc.poker.analytics.getGrossRake.queryOptions()),
    queryClient.prefetchQuery(trpc.poker.analytics.getBankResult.queryOptions()),
    queryClient.prefetchQuery(
      trpc.poker.analytics.getTopPlayers.queryOptions({ limit: 5 })
    ),
    queryClient.prefetchQuery(
      trpc.poker.analytics.getDebtors.queryOptions({ limit: 5 })
    ),
    queryClient.prefetchQuery(
      trpc.poker.analytics.getRevenueByGameType.queryOptions()
    ),
  ]);

  const sections = [
    {
      title: t("sidebar.poker_players"),
      description: t("poker.players.description"),
      href: "/poker/players",
      icon: Icons.Customers,
    },
    {
      title: t("sidebar.poker_agents"),
      description: t("poker.agents.description"),
      href: "/poker/agents",
      icon: Icons.AccountCircle,
    },
    {
      title: t("sidebar.poker_sessions"),
      description: t("poker.sessions.description"),
      href: "/poker/sessions",
      icon: Icons.History,
    },
    {
      title: t("sidebar.poker_settlements"),
      description: t("poker.settlements.description"),
      href: "/poker/settlements",
      icon: Icons.Vat,
    },
    {
      title: t("sidebar.poker_import"),
      description: t("poker.import.description"),
      href: "/poker/import",
      icon: Icons.Import,
    },
  ];

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium">{t("poker.dashboard.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("poker.dashboard.description")}
          </p>
        </div>
        <Suspense fallback={null}>
          <CloseWeekButton />
        </Suspense>
      </div>

      {/* Overview Stats */}
      <ErrorBoundary errorComponent={ErrorFallback}>
        <Suspense fallback={<PokerOverviewWidget.Skeleton />}>
          <PokerOverviewWidget />
        </Suspense>
      </ErrorBoundary>

      {/* Financial Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<GrossRakeWidget.Skeleton />}>
            <GrossRakeWidget />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<BankResultWidget.Skeleton />}>
            <BankResultWidget />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<RevenueByGameWidget.Skeleton />}>
            <RevenueByGameWidget />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<TopPlayersWidget.Skeleton />}>
            <TopPlayersWidget />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<DebtorsWidget.Skeleton />}>
            <DebtorsWidget />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium mb-4">
          {t("poker.dashboard.quickActions")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group p-4 border rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-colors dark:bg-[#0c0c0c] dark:border-[#1d1d1d]"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-md group-hover:bg-primary/10 transition-colors">
                  <section.icon className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {section.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
