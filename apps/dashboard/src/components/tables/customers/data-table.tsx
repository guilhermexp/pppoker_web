"use client";

import { LoadMore } from "@/components/load-more";
import { useCustomerFilterParams } from "@/hooks/use-customer-filter-params";
import { useCustomerParams } from "@/hooks/use-customer-params";
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
import React, { useDeferredValue, useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { columns } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { CustomerRow } from "./row";
import { TableHeader } from "./table-header";

export function DataTable() {
  const { ref, inView } = useInView();
  const { setParams } = useCustomerParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { filter, hasFilters } = useCustomerFilterParams();
  const { params } = useSortParams();

  const deferredSearch = useDeferredValue(filter.q);

  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 1,
  });

  const infiniteQueryOptions = trpc.customers.get.infiniteQueryOptions(
    {
      ...filter,
      sort: params.sort,
      q: deferredSearch,
    },
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    },
  );

  const { data, fetchNextPage, hasNextPage } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  const deleteCustomerMutation = useMutation(
    trpc.customers.delete.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.customers.get.infiniteQueryKey(),
        });
        const previous = queryClient.getQueryData(
          trpc.customers.get.infiniteQueryKey(),
        );
        queryClient.setQueriesData(
          { queryKey: trpc.customers.get.infiniteQueryKey() },
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
            { queryKey: trpc.customers.get.infiniteQueryKey() },
            context.previous,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.customers.get.infiniteQueryKey(),
        });
      },
    }),
  );

  const handleDeleteCustomer = (id: string) => {
    deleteCustomerMutation.mutate({ id });
  };

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView]);

  const tableData = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);

  const setOpen = (id?: string) => {
    if (id) {
      setParams({ customerId: id });
    } else {
      setParams(null);
    }
  };

  const table = useReactTable({
    data: tableData,
    getRowId: (row) => row.id,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: {
      deleteCustomer: handleDeleteCustomer,
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
              <CustomerRow key={row.id} row={row} setOpen={setOpen} />
            ))}
          </TableBody>
        </Table>
      </div>

      <LoadMore ref={ref} hasNextPage={hasNextPage} />
    </div>
  );
}
