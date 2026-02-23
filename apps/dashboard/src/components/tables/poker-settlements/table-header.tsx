"use client";

import type { useTableScroll } from "@/hooks/use-table-scroll";
import {
  TableHead,
  TableRow,
  TableHeader as UITableHeader,
} from "@midpoker/ui/table";
import { columns } from "./columns";

type Props = {
  tableScroll: ReturnType<typeof useTableScroll>;
};

export function TableHeader({ tableScroll }: Props) {
  return (
    <UITableHeader className="border-l-0 border-r-0">
      <TableRow>
        {columns.map((column, index) => {
          const meta = column.meta as { className?: string } | undefined;
          const header = typeof column.header === "string" ? column.header : "";

          return (
            <TableHead
              key={column.id || `col-${index}`}
              className={meta?.className}
            >
              {header}
            </TableHead>
          );
        })}
      </TableRow>
    </UITableHeader>
  );
}
