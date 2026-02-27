"use client";

import { LoadMore } from "@/components/load-more";
import { usePokerSettlementParams } from "@/hooks/use-poker-settlement-params";
import { useSortParams } from "@/hooks/use-sort-params";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTRPC } from "@/trpc/client";
import { Table, TableBody, TableCell, TableRow } from "@midpoker/ui/table";
import {
  useMutation,
  useQueryClient,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useDeferredValue, useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { columns } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { TableHeader } from "./table-header";

export function SettlementsDataTable() {
  const { ref, inView } = useInView();
  const {
    setParams,
    status,
    playerId,
    agentId,
    periodStart,
    periodEnd,
    hasFilters,
  } = usePokerSettlementParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { params: sortParams } = useSortParams();

  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 1,
  });

  const sortArray = sortParams.sort as [string, string] | null;

  const infiniteQueryOptions = trpc.poker.settlements.get.infiniteQueryOptions(
    {
      status,
      playerId,
      agentId,
      periodStart,
      periodEnd,
      sort: sortArray,
    },
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    },
  );

  const { data, fetchNextPage, hasNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  const deleteSettlementMutation = useMutation(
    trpc.poker.settlements.delete.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.poker.settlements.get.infiniteQueryKey(),
        });
        const previous = queryClient.getQueryData(
          trpc.poker.settlements.get.infiniteQueryKey(),
        );
        queryClient.setQueriesData(
          { queryKey: trpc.poker.settlements.get.infiniteQueryKey() },
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
            { queryKey: trpc.poker.settlements.get.infiniteQueryKey() },
            context.previous,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.poker.settlements.get.infiniteQueryKey(),
        });
      },
    }),
  );

  const markPaidMutation = useMutation(
    trpc.poker.settlements.markPaid.mutationOptions({
      onMutate: async ({ id, paidAmount }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.poker.settlements.get.infiniteQueryKey(),
        });
        const previous = queryClient.getQueryData(
          trpc.poker.settlements.get.infiniteQueryKey(),
        );
        queryClient.setQueriesData(
          { queryKey: trpc.poker.settlements.get.infiniteQueryKey() },
          (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                data: page.data.map((item: any) =>
                  item.id === id
                    ? { ...item, status: "paid", paidAmount }
                    : item,
                ),
              })),
            };
          },
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueriesData(
            { queryKey: trpc.poker.settlements.get.infiniteQueryKey() },
            context.previous,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.poker.settlements.get.infiniteQueryKey(),
        });
      },
    }),
  );

  const handleDeleteSettlement = (id: string) => {
    deleteSettlementMutation.mutate({ id });
  };

  const handleMarkPaid = (id: string) => {
    // Get the settlement to mark as paid with full amount
    const settlement = tableData.find((s) => s.id === id);
    if (settlement) {
      markPaidMutation.mutate({
        id,
        paidAmount: settlement.netAmount,
      });
    }
  };

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage]);

  const tableData = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);

  const table = useReactTable({
    data: tableData,
    getRowId: (row) => row.id,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: {
      deleteSettlement: handleDeleteSettlement,
      markPaid: handleMarkPaid,
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
              <TableRow
                key={row.id}
                className="h-[57px] cursor-default hover:bg-accent/50"
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { className?: string }
                    | undefined;
                  return (
                    <TableCell key={cell.id} className={meta?.className}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <LoadMore ref={ref} hasNextPage={hasNextPage} />
    </div>
  );
}
