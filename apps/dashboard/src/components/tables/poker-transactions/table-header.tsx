"use client";

import { HorizontalPagination } from "@/components/horizontal-pagination";
import type { useTableScroll } from "@/hooks/use-table-scroll";
import { TableHead, TableHeader as TableHeaderUI, TableRow } from "@midday/ui/table";
import { columns } from "./columns";

type Props = {
  tableScroll: ReturnType<typeof useTableScroll>;
};

export function TableHeader({ tableScroll }: Props) {
  return (
    <TableHeaderUI className="md:sticky top-0 z-10 bg-background">
      <TableRow className="h-[45px]">
        {columns.map((column, index) => (
          <TableHead
            key={column.id ?? column.accessorKey ?? index}
            className={(column.meta as any)?.className}
          >
            {index === 0 && tableScroll?.isScrollable ? (
              <div className="flex items-center justify-between">
                <span>{typeof column.header === "string" ? column.header : column.id}</span>
                <HorizontalPagination
                  canScrollLeft={tableScroll.canScrollLeft}
                  canScrollRight={tableScroll.canScrollRight}
                  onScrollLeft={tableScroll.scrollLeft}
                  onScrollRight={tableScroll.scrollRight}
                  className="ml-auto hidden md:flex"
                />
              </div>
            ) : (
              typeof column.header === "string" ? column.header : column.id
            )}
          </TableHead>
        ))}
      </TableRow>
    </TableHeaderUI>
  );
}
