"use client";

import { useCategoryParams } from "@/hooks/use-category-params";
import { useTRPC } from "@/trpc/client";
import { cn } from "@midpoker/ui/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import React from "react";
import { columns, flattenCategories } from "./columns";
import { Header } from "./header";

export function DataTable() {
  const [expandedCategories, setExpandedCategories] = React.useState<
    Set<string>
  >(new Set());

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setParams } = useCategoryParams();

  const { data } = useSuspenseQuery(
    trpc.transactionCategories.get.queryOptions(),
  );

  const deleteCategoryMutation = useMutation(
    trpc.transactionCategories.delete.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.transactionCategories.get.queryKey(),
        });
        const previous = queryClient.getQueryData(
          trpc.transactionCategories.get.queryKey(),
        );
        queryClient.setQueryData(
          trpc.transactionCategories.get.queryKey(),
          (old: any) => {
            if (!old) return old;
            // Data is a tree: [{ id, children: [...] }, ...]. Filter parent or child.
            return old
              .filter((item: any) => item.id !== id)
              .map((item: any) => ({
                ...item,
                children: item.children
                  ? item.children.filter((child: any) => child.id !== id)
                  : item.children,
              }));
          },
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(
            trpc.transactionCategories.get.queryKey(),
            context.previous,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.transactionCategories.get.queryKey(),
        });
      },
    }),
  );

  // Flatten categories and filter based on expanded state
  const flattenedData = React.useMemo(() => {
    const flattened = flattenCategories(data ?? []);

    // Filter to only show parent categories and children of expanded parents
    return flattened.filter((category) => {
      // Always show parent categories
      if (!category.isChild) {
        return true;
      }
      // Only show children if their parent is expanded
      return category.parentId && expandedCategories.has(category.parentId);
    });
  }, [data, expandedCategories]);

  const table = useReactTable({
    data: flattenedData,
    getRowId: ({ id }) => id,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: {
      deleteCategory: (id: string) => {
        deleteCategoryMutation.mutate({ id });
      },
      onEdit: (id: string) => {
        setParams({ categoryId: id });
      },
      expandedCategories,
      setExpandedCategories,
    },
  });

  return (
    <div className="w-full">
      <Header table={table} />

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              className="hover:bg-muted/50 cursor-pointer"
              key={row.id}
              onClick={() => setParams({ categoryId: row.original.id })}
            >
              {row.getVisibleCells().map((cell, index) => (
                <TableCell
                  key={cell.id}
                  className={cn(index === 3 && "w-[50px]")}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
