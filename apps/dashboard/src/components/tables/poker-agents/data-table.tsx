"use client";

import { LoadMore } from "@/components/load-more";
import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useSortParams } from "@/hooks/use-sort-params";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTRPC } from "@/trpc/client";
import { Table, TableBody } from "@midday/ui/table";
import {
  useMutation,
  useQuery,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import {
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useDeferredValue, useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { type PokerAgent, columns } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { PokerAgentRow } from "./row";
import { TableHeader } from "./table-header";

export function AgentsDataTable() {
  const { ref, inView } = useInView();
  const { setParams, q, status, hasFilters, dateFrom, dateTo, superAgentId } =
    usePokerPlayerParams();
  const trpc = useTRPC();
  const { params: sortParams } = useSortParams();

  const deferredSearch = useDeferredValue(q);

  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 1,
  });

  const sortArray = sortParams.sort as [string, string] | null;

  const infiniteQueryOptions = trpc.poker.players.get.infiniteQueryOptions(
    {
      q: deferredSearch,
      type: "agent", // Always filter by agent
      status,
      sort: sortArray,
    },
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  );

  const { data, fetchNextPage, hasNextPage, refetch } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  // Fetch agent stats to get metrics
  const { data: statsData } = useQuery(
    trpc.poker.players.getAgentStats.queryOptions({
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
      superAgentId: superAgentId ?? undefined,
    })
  );

  const deleteAgentMutation = useMutation(
    trpc.poker.players.delete.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    })
  );

  const handleDeleteAgent = (id: string) => {
    deleteAgentMutation.mutate({ id });
  };

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage]);

  // Merge agent data with metrics
  const tableData = useMemo(() => {
    const agents = data?.pages.flatMap((page) => page.data) ?? [];
    const metricsMap = new Map(
      (statsData?.agentMetrics ?? []).map((m) => [m.id, m])
    );

    return agents.map((agent): PokerAgent => {
      const metrics = metricsMap.get(agent.id);
      return {
        ...agent,
        playerCount: metrics?.playerCount ?? 0,
        totalRake: metrics?.totalRake ?? 0,
        rakePpst: metrics?.rakePpst ?? 0,
        rakePpsr: metrics?.rakePpsr ?? 0,
        estimatedCommission: metrics?.estimatedCommission ?? 0,
      };
    });
  }, [data, statsData]);

  const setOpen = (id?: string) => {
    if (id) {
      setParams({ viewAgentId: id });
    } else {
      setParams({ viewAgentId: null });
    }
  };

  const table = useReactTable({
    data: tableData,
    getRowId: (row) => row.id,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: {
      deletePlayer: handleDeleteAgent,
    },
  });

  if (!tableData.length && hasFilters) {
    return <NoResults />;
  }

  if (!tableData.length) {
    return <EmptyState />;
  }

  return (
    <div className="w-full">
      <div
        ref={tableScroll.containerRef}
        className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
      >
        <Table>
          <TableHeader tableScroll={tableScroll} />

          <TableBody className="border-l-0 border-r-0">
            {table.getRowModel().rows.map((row) => (
              <PokerAgentRow key={row.id} row={row} setOpen={setOpen} />
            ))}
          </TableBody>
        </Table>
      </div>

      <LoadMore ref={ref} hasNextPage={hasNextPage} />
    </div>
  );
}
