"use client";

import { LoadMore } from "@/components/load-more";
import { usePokerSessionParams } from "@/hooks/use-poker-session-params";
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
import { PokerSessionRow } from "./row";
import { TableHeader } from "./table-header";

export function SessionsDataTable() {
  const { ref, inView } = useInView();
  const { setParams, q, sessionType, gameVariant, dateFrom, dateTo, hasFilters } =
    usePokerSessionParams();
  const trpc = useTRPC();
  const { params: sortParams } = useSortParams();

  const deferredSearch = useDeferredValue(q);

  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 1,
  });

  const sortArray = sortParams.sort as [string, string] | null;

  const infiniteQueryOptions = trpc.poker.sessions.get.infiniteQueryOptions(
    {
      q: deferredSearch,
      sessionType,
      gameVariant,
      dateFrom,
      dateTo,
      sort: sortArray,
    },
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  );

  const { data, fetchNextPage, hasNextPage, refetch } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  const deleteSessionMutation = useMutation(
    trpc.poker.sessions.delete.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    })
  );

  const handleDeleteSession = (id: string) => {
    deleteSessionMutation.mutate({ id });
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
      setParams({ sessionId: id });
    } else {
      setParams({ sessionId: null });
    }
  };

  const table = useReactTable({
    data: tableData,
    getRowId: (row) => row.id,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: {
      deleteSession: handleDeleteSession,
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
              <PokerSessionRow key={row.id} row={row} setOpen={setOpen} />
            ))}
          </TableBody>
        </Table>
      </div>

      <LoadMore ref={ref} hasNextPage={hasNextPage} />
    </div>
  );
}
