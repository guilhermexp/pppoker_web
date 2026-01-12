"use client";

import { cn } from "@midpoker/ui/cn";
import { TableCell, TableRow } from "@midpoker/ui/table";
import { type Row, flexRender } from "@tanstack/react-table";
import type { PokerPlayer } from "./columns";

type Props = {
  row: Row<PokerPlayer>;
  setOpen: (id?: string) => void;
};

export function PokerPlayerRow({ row, setOpen }: Props) {
  const actionsColumnIndex = row.getVisibleCells().length - 1;

  return (
    <TableRow
      className="group h-[45px] cursor-pointer hover:bg-[#F2F1EF] hover:dark:bg-[#0f0f0f]"
      key={row.id}
    >
      {row.getVisibleCells().map((cell, index) => (
        <TableCell
          key={cell.id}
          onClick={() => index !== actionsColumnIndex && setOpen(row.id)}
          className={cn(cell.column.columnDef.meta?.className)}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}
