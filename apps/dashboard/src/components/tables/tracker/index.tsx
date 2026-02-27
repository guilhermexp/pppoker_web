"use client";

import { LoadMore } from "@/components/load-more";
import { useLatestProjectId } from "@/hooks/use-latest-project-id";
import { useSortParams } from "@/hooks/use-sort-params";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTrackerFilterParams } from "@/hooks/use-tracker-filter-params";
import { useTRPC } from "@/trpc/client";
import { Table, TableBody } from "@midpoker/ui/table";
import {
  useMutation,
  useQueryClient,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { useDeferredValue, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { DataTableHeader } from "./data-table-header";
import { DataTableRow } from "./data-table-row";
import { EmptyState, NoResults } from "./empty-states";

export function DataTable() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { ref, inView } = useInView();
  const { latestProjectId, setLatestProjectId } = useLatestProjectId();
  const { params } = useSortParams();
  const { hasFilters, filter } = useTrackerFilterParams();
  const deferredSearch = useDeferredValue(filter.q);

  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 1,
  });

  const infiniteQueryOptions = trpc.trackerProjects.get.infiniteQueryOptions(
    {
      ...filter,
      q: deferredSearch ?? null,
      sort: params.sort,
    },
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    },
  );

  const { data, fetchNextPage, hasNextPage, isFetching } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);

  const deleteTrackerProjectMutation = useMutation(
    trpc.trackerProjects.delete.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.trackerProjects.get.infiniteQueryKey(),
        });
        const previous = queryClient.getQueryData(
          trpc.trackerProjects.get.infiniteQueryKey(),
        );
        queryClient.setQueriesData(
          { queryKey: trpc.trackerProjects.get.infiniteQueryKey() },
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
            { queryKey: trpc.trackerProjects.get.infiniteQueryKey() },
            context.previous,
          );
        }
      },
      onSuccess: (result) => {
        if (result && result.id === latestProjectId) {
          setLatestProjectId(null);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.trackerProjects.get.infiniteQueryKey(),
        });
      },
    }),
  );

  const pageData = data?.pages.flatMap((page) => page.data);

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView]);

  if (!isFetching && !pageData?.length && !hasFilters) {
    return <EmptyState />;
  }

  if (!pageData?.length && hasFilters) {
    return <NoResults />;
  }

  return (
    <div className="w-full">
      <div
        ref={tableScroll.containerRef}
        className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
      >
        <Table>
          <DataTableHeader tableScroll={tableScroll} />

          <TableBody className="border-l-0 border-r-0">
            {pageData?.map((row) => (
              <DataTableRow
                row={row}
                key={row.id}
                onDelete={deleteTrackerProjectMutation.mutate}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <LoadMore ref={ref} hasNextPage={hasNextPage} />
    </div>
  );
}
