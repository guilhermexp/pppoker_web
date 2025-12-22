import { ErrorFallback } from "@/components/error-fallback";
import { PokerPlayersHeader } from "@/components/poker/poker-players-header";
import { DataTable } from "@/components/tables/poker-players/data-table";
import { DataTableSkeleton } from "@/components/tables/poker-players/skeleton";
import { loadPokerPlayerFilterParams } from "@/hooks/use-poker-player-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Players | Poker Club | Midday",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function PokerPlayersPage(props: Props) {
  const queryClient = getQueryClient();
  const searchParams = await props.searchParams;
  const t = await getI18n();

  const filter = loadPokerPlayerFilterParams(searchParams);
  const { sort } = loadSortParams(searchParams);

  // Prefetch players data
  await queryClient.fetchInfiniteQuery(
    trpc.poker.players.get.infiniteQueryOptions({
      ...filter,
      sort: sort as [string, string] | null,
    })
  );

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="pt-6">
          <h1 className="text-2xl font-medium">{t("poker.players.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("poker.players.description")}
          </p>
        </div>

        <PokerPlayersHeader />

        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<DataTableSkeleton />}>
            <DataTable />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
