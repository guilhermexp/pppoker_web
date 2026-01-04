"use client";

import { LoadMore } from "@/components/load-more";
import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useSortParams } from "@/hooks/use-sort-params";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTRPC } from "@/trpc/client";
import { Table, TableBody } from "@midday/ui/table";
import { useMutation, useSuspenseInfiniteQuery } from "@tanstack/react-query";
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

  const { data, fetchNextPage, hasNextPage, refetch } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  const deletePlayerMutation = useMutation(
    trpc.poker.players.delete.mutationOptions({
      onSuccess: () => {
        refetch();
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
