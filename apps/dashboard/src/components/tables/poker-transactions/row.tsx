"use client";

import { TableCell, TableRow } from "@midpoker/ui/table";
import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { PokerTransaction } from "./columns";

type Props = {
  row: Row<PokerTransaction>;
  setOpen?: (id?: string) => void;
};

export function PokerTransactionRow({ row, setOpen }: Props) {
  return (
    <TableRow
      className="h-[45px] cursor-default"
      onClick={() => setOpen?.(row.original.id)}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={(cell.column.columnDef.meta as any)?.className}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}
