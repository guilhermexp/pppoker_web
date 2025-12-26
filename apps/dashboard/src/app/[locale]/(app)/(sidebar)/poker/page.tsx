import { ErrorFallback } from "@/components/error-fallback";
import { PokerDashboardHeader } from "@/components/poker/poker-dashboard-header";
import { PokerWidgetsGrid, PokerStatCard } from "@/components/widgets/poker";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Poker Club | Midday",
};

function PokerWidgetsGridSkeleton() {
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
}

export default async function PokerPage() {
  const queryClient = getQueryClient();
  const t = await getI18n();

  // Prefetch analytics data
  try {
    await queryClient.prefetchQuery(
      trpc.poker.analytics.getDashboardStats.queryOptions()
    );
  } catch (error) {
    console.error("[PokerPage] Prefetch error:", error);
  }

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6 mt-6">
        {/* Header - Style matching WidgetsHeader */}
        <PokerDashboardHeader />

        {/* Stats Grid - 2 rows x 4 columns */}
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<PokerWidgetsGridSkeleton />}>
            <PokerWidgetsGrid />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
