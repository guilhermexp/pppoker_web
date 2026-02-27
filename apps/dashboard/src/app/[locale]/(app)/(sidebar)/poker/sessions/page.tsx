import { ErrorBoundary } from "@/components/error-boundary";
import { PokerDashboardDataPanel } from "@/components/poker/poker-dashboard-data-panel";
import { PokerSessionsHeader } from "@/components/poker/poker-sessions-header";
import {
  PokerSessionsStats,
  PokerSessionsStatsSkeleton,
} from "@/components/poker/poker-sessions-stats";
import { SessionsDataTable } from "@/components/tables/poker-sessions/data-table";
import { DataTableSkeleton } from "@/components/tables/poker-sessions/skeleton";
import { loadPokerSessionFilterParams } from "@/hooks/use-poker-session-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sessions | Poker Club | Midday",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function PokerSessionsPage(props: Props) {
  const queryClient = getQueryClient();
  const searchParams = await props.searchParams;
  const t = await getI18n();

  const filter = loadPokerSessionFilterParams(searchParams);
  const { sort } = loadSortParams(searchParams);

  // Prefetch sessions data - wrapped in try-catch to handle SSR auth errors gracefully
  try {
    await Promise.all([
      queryClient.fetchInfiniteQuery(
        trpc.poker.sessions.get.infiniteQueryOptions({
          ...filter,
          sort: sort as [string, string] | null,
        }),
      ),
      // Prefetch stats for widgets
      queryClient.fetchQuery(
        trpc.poker.sessions.getStats.queryOptions({
          dateFrom: filter.dateFrom ?? undefined,
          dateTo: filter.dateTo ?? undefined,
          sessionType: filter.sessionType ?? undefined,
          gameVariant: filter.gameVariant ?? undefined,
        }),
      ),
    ]);
  } catch {
    // SSR prefetch failed, client will fetch via Suspense
  }

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="pt-6">
          <h1 className="text-2xl font-medium">{t("poker.sessions.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("poker.sessions.description")}
          </p>
        </div>

        <ErrorBoundary>
          <Suspense fallback={<PokerSessionsStatsSkeleton />}>
            <PokerSessionsStats />
          </Suspense>
        </ErrorBoundary>

        <PokerSessionsHeader />

        <ErrorBoundary>
          <Suspense fallback={<DataTableSkeleton />}>
            <SessionsDataTable />
          </Suspense>
        </ErrorBoundary>
      </div>

      <PokerDashboardDataPanel />
    </HydrateClient>
  );
}
