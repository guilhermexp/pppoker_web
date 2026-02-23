import { ErrorBoundary } from "@/components/error-boundary";
import { PokerAgentsHeader } from "@/components/poker/poker-agents-header";
import {
  PokerAgentsStats,
  PokerAgentsStatsSkeleton,
} from "@/components/poker/poker-agents-stats";
import { PokerAgentDetailSheet } from "@/components/sheets/poker-agent-detail-sheet";
import { AgentsDataTable } from "@/components/tables/poker-agents/data-table";
import { DataTableSkeleton } from "@/components/tables/poker-agents/skeleton";
import { loadPokerPlayerFilterParams } from "@/hooks/use-poker-player-params";
import { loadSortParams } from "@/hooks/use-sort-params";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Agents | Poker Club | Midday",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function PokerAgentsPage(props: Props) {
  const queryClient = getQueryClient();
  const searchParams = await props.searchParams;
  const t = await getI18n();

  const filter = loadPokerPlayerFilterParams(searchParams);
  const { sort } = loadSortParams(searchParams);

  // Prefetch agents data (players with type='agent') - wrapped in try-catch to handle SSR auth errors gracefully
  try {
    await queryClient.fetchInfiniteQuery(
      trpc.poker.players.get.infiniteQueryOptions({
        ...filter,
        type: "agent", // Force filter to agents only
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
          <h1 className="text-2xl font-medium">{t("poker.agents.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("poker.agents.description")}
          </p>
        </div>

        <Suspense fallback={<PokerAgentsStatsSkeleton />}>
          <PokerAgentsStats />
        </Suspense>

        <PokerAgentsHeader />

        <ErrorBoundary>
          <Suspense fallback={<DataTableSkeleton />}>
            <AgentsDataTable />
          </Suspense>
        </ErrorBoundary>

        {/* Detail Sheet */}
        <PokerAgentDetailSheet />
      </div>
    </HydrateClient>
  );
}
