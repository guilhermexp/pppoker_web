"use client";

import { LoadMore } from "@/components/load-more";
import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { usePokerPlayersRealtime } from "@/hooks/use-poker-realtime";
import { useSortParams } from "@/hooks/use-sort-params";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTRPC } from "@/trpc/client";
import { Table, TableBody } from "@midpoker/ui/table";
import {
  useMutation,
  useQueryClient,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import {
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useDeferredValue, useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { columns } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { PokerPlayerRow } from "./row";
import { TableHeader } from "./table-header";

export function DataTable() {
  // Subscribe to real-time updates from PPPoker sync
  usePokerPlayersRealtime();

  const { ref, inView } = useInView();
  const {
    setParams,
    q,
    type,
    status,
    agentId,
    hasCreditLimit,
    hasRake,
    hasBalance,
    hasAgent,
    hasFilters,
  } = usePokerPlayerParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
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
      type,
      status,
      agentId,
      hasCreditLimit: hasCreditLimit || null,
      hasRake: hasRake || null,
      hasBalance: hasBalance || null,
      hasAgent: hasAgent || null,
      sort: sortArray,
    },
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    },
  );

  const { data, fetchNextPage, hasNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  const deletePlayerMutation = useMutation(
    trpc.poker.players.delete.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.poker.players.get.infiniteQueryKey(),
        });
        const previous = queryClient.getQueryData(
          trpc.poker.players.get.infiniteQueryKey(),
        );
        queryClient.setQueriesData(
          { queryKey: trpc.poker.players.get.infiniteQueryKey() },
          (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                data: page.data.filter((item: any) => item.id !== id),
              })),
            };
          },
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueriesData(
            { queryKey: trpc.poker.players.get.infiniteQueryKey() },
            context.previous,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.get.infiniteQueryKey(),
        });
      },
    }),
  );

  const handleDeletePlayer = (id: string) => {
    deletePlayerMutation.mutate({ id });
  };

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage]);

  const tableData = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);

  const setOpen = (id?: string) => {
    if (id) {
      setParams({ playerId: id });
    } else {
      setParams({ playerId: null });
    }
  };

  const table = useReactTable({
    data: tableData,
    getRowId: (row) => row.id,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: {
      deletePlayer: handleDeletePlayer,
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
              <PokerPlayerRow key={row.id} row={row} setOpen={setOpen} />
            ))}
          </TableBody>
        </Table>
      </div>

      <LoadMore ref={ref} hasNextPage={hasNextPage} />
    </div>
  );
}
