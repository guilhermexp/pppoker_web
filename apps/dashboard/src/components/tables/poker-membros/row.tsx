"use client";

import { cn } from "@midpoker/ui/cn";
import { TableCell, TableRow } from "@midpoker/ui/table";
import { type Row, flexRender } from "@tanstack/react-table";
import type { ClubMember } from "./columns";

type Props = {
  row: Row<ClubMember>;
};

export function MemberRow({ row }: Props) {
  return (
    <TableRow
      className="group h-[45px] hover:bg-[#F2F1EF] hover:dark:bg-[#0f0f0f]"
      key={row.id}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn(cell.column.columnDef.meta?.className)}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}
