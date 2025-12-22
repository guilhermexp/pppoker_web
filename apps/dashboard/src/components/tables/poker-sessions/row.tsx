"use client";

import { TableCell, TableRow } from "@midday/ui/table";
import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { PokerSession } from "./columns";

type Props = {
  row: Row<PokerSession>;
  setOpen: (id: string) => void;
};

export function PokerSessionRow({ row, setOpen }: Props) {
  return (
    <TableRow
      key={row.id}
      className="h-[57px] cursor-default hover:bg-accent/50"
    >
      {row.getVisibleCells().map((cell) => {
        const meta = cell.column.columnDef.meta as { className?: string } | undefined;
        return (
          <TableCell key={cell.id} className={meta?.className}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
