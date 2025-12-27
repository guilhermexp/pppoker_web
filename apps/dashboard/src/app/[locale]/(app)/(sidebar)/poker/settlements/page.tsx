import { ErrorFallback } from "@/components/error-fallback";
import { PokerSettlementsHeader } from "@/components/poker/poker-settlements-header";
import { SettlementsDataTable } from "@/components/tables/poker-settlements/data-table";
import { DataTableSkeleton } from "@/components/tables/poker-settlements/skeleton";
import { loadPokerSettlementFilterParams } from "@/hooks/use-poker-settlement-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Settlements | Poker Club | Midday",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function PokerSettlementsPage(props: Props) {
  const queryClient = getQueryClient();
  const searchParams = await props.searchParams;
  const t = await getI18n();

  const filter = loadPokerSettlementFilterParams(searchParams);
  const { sort } = loadSortParams(searchParams);

  // Prefetch settlements data - wrapped in try-catch to handle SSR auth errors gracefully
  try {
    await queryClient.fetchInfiniteQuery(
      trpc.poker.settlements.get.infiniteQueryOptions({
        ...filter,
        sort: sort as [string, string] | null,
      })
    );
  } catch {
    // SSR prefetch failed, client will fetch via Suspense
  }

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="pt-6">
          <h1 className="text-2xl font-medium">{t("poker.settlements.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("poker.settlements.description")}
          </p>
        </div>

        <PokerSettlementsHeader />

        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<DataTableSkeleton />}>
            <SettlementsDataTable />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
