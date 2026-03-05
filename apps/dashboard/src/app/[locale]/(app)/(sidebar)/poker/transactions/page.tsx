import { ErrorBoundary } from "@/components/error-boundary";
import { PokerTransactionsHeader } from "@/components/poker/poker-transactions-header";
import { TransactionsDataTable } from "@/components/tables/poker-transactions/data-table";
import { DataTableSkeleton } from "@/components/tables/poker-transactions/skeleton";
import { loadPokerTransactionFilterParams } from "@/hooks/use-poker-transaction-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Transações | Poker Club | Midday",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function PokerTransactionsPage(props: Props) {
  const queryClient = getQueryClient();
  const [searchParams, t] = await Promise.all([props.searchParams, getI18n()]);

  const filter = loadPokerTransactionFilterParams(searchParams);
  const { sort } = loadSortParams(searchParams);

  // Prefetch transactions data - wrapped in try-catch to handle SSR auth errors gracefully
  try {
    await queryClient.fetchInfiniteQuery(
      trpc.poker.transactions.get.infiniteQueryOptions({
        ...filter,
        sort: sort as [string, string] | null,
      }),
    );
  } catch {
    // SSR prefetch failed, client will fetch via Suspense
  }

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="pt-6">
          <h1 className="text-2xl font-medium">Transações</h1>
          <p className="text-muted-foreground mt-1">
            Visualize todas as transações de crédito e fichas do clube
          </p>
        </div>

        <PokerTransactionsHeader />

        <ErrorBoundary>
          <Suspense fallback={<DataTableSkeleton />}>
            <TransactionsDataTable />
          </Suspense>
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
