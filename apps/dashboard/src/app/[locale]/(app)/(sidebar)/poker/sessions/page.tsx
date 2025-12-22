import { ErrorFallback } from "@/components/error-fallback";
import { PokerSessionsHeader } from "@/components/poker/poker-sessions-header";
import { SessionsDataTable } from "@/components/tables/poker-sessions/data-table";
import { DataTableSkeleton } from "@/components/tables/poker-sessions/skeleton";
import { loadPokerSessionFilterParams } from "@/hooks/use-poker-session-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
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

  // Prefetch sessions data
  await queryClient.fetchInfiniteQuery(
    trpc.poker.sessions.get.infiniteQueryOptions({
      ...filter,
      sort: sort as [string, string] | null,
    })
  );

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="pt-6">
          <h1 className="text-2xl font-medium">{t("poker.sessions.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("poker.sessions.description")}
          </p>
        </div>

        <PokerSessionsHeader />

        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<DataTableSkeleton />}>
            <SessionsDataTable />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
