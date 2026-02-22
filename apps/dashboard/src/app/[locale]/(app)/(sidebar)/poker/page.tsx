import { ClientOnly } from "@/components/client-only";
import { ErrorBoundary } from "@/components/error-boundary";
import { PokerDashboardHeader } from "@/components/poker/poker-dashboard-header";
import { SyncStatusBanner } from "@/components/poker/sync-status-banner";
import { UnavailableDataBanner } from "@/components/poker/unavailable-data-banner";
import { PokerStatCard } from "@/components/widgets/poker/poker-stat-card";
import { PokerWidgetProvider } from "@/components/widgets/poker/poker-widget-provider";
import { PokerWidgetsGrid } from "@/components/widgets/poker/poker-widgets-grid";
import { getI18n } from "@/locales/server";
import { HydrateClient } from "@/trpc/server";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Poker Club | Midday",
};

function PokerWidgetsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-6">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <PokerStatCard.Skeleton key={i} />
      ))}
    </div>
  );
}

const defaultWidgetPreferences = {
  primaryWidgets: [
    "poker-total-sessions",
    "poker-total-players",
    "poker-active-agents",
    "poker-rake-total",
    "poker-rake-breakdown",
    "poker-total-rakeback",
    "poker-player-results",
    "poker-general-result",
  ] as const,
  availableWidgets: ["poker-game-types", "poker-players-by-region"] as const,
};

export default async function PokerPage() {
  const t = await getI18n();

  // Widget preferences will be fetched on the client side
  const widgetPreferences = defaultWidgetPreferences;

  return (
    <HydrateClient>
      <PokerWidgetProvider initialPreferences={widgetPreferences as any}>
        <div className="flex flex-col gap-6 mt-6">
          {/* Header - Style matching WidgetsHeader */}
          <PokerDashboardHeader />

          {/* Sync status indicator */}
          <ErrorBoundary>
            <Suspense fallback={<div className="h-16 animate-pulse bg-muted rounded" />}>
              <ClientOnly fallback={<div className="h-16 animate-pulse bg-muted rounded" />}>
                <SyncStatusBanner />
              </ClientOnly>
            </Suspense>
          </ErrorBoundary>

          {/* Stats Grid - 2 rows x 4 columns */}
          <ErrorBoundary>
            <Suspense fallback={<PokerWidgetsGridSkeleton />}>
              <PokerWidgetsGrid />
            </Suspense>
          </ErrorBoundary>

          {/* Unavailable data notice */}
          <UnavailableDataBanner />
        </div>
      </PokerWidgetProvider>
    </HydrateClient>
  );
}
