"use client";

import { LoadMore } from "@/components/load-more";
import { usePokerSessionParams } from "@/hooks/use-poker-session-params";
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
  getExpandedRowModel,
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
  const {
    setParams,
    q,
    sessionType,
    gameVariant,
    dateFrom,
    dateTo,
    hasFilters,
  } = usePokerSessionParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
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
    },
  );

  const { data, fetchNextPage, hasNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  const deleteSessionMutation = useMutation(
    trpc.poker.sessions.delete.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.poker.sessions.get.infiniteQueryKey(),
        });
        const previous = queryClient.getQueryData(
          trpc.poker.sessions.get.infiniteQueryKey(),
        );
        queryClient.setQueriesData(
          { queryKey: trpc.poker.sessions.get.infiniteQueryKey() },
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
            { queryKey: trpc.poker.sessions.get.infiniteQueryKey() },
            context.previous,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.poker.sessions.get.infiniteQueryKey(),
        });
      },
    }),
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
    getExpandedRowModel: getExpandedRowModel(),
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
