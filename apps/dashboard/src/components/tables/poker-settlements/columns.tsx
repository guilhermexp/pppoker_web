"use client";

import { useI18n } from "@/locales/client";
import { Badge } from "@midday/ui/badge";
import { Button } from "@midday/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@midday/ui/dropdown-menu";
import { Icons } from "@midday/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { memo } from "react";

export type PokerSettlement = {
  id: string;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
  status: "pending" | "partial" | "completed" | "disputed" | "cancelled";
  grossAmount: number;
  rakebackAmount: number;
  rakebackPercentUsed: number | null;
  commissionAmount: number;
  adjustmentAmount: number;
  netAmount: number;
  paidAmount: number;
  paidAt: string | null;
  player: {
    id: string;
    nickname: string;
    memoName: string | null;
    rakebackPercent: number;
  } | null;
  agent: {
    id: string;
    nickname: string;
    memoName: string | null;
    rakebackPercent: number;
  } | null;
};

const StatusBadge = memo(
  ({ status }: { status: PokerSettlement["status"] }) => {
    const variants: Record<
      PokerSettlement["status"],
      "default" | "secondary" | "destructive" | "outline"
    > = {
      pending: "outline",
      partial: "secondary",
      completed: "default",
      disputed: "destructive",
      cancelled: "secondary",
    };

    const labels: Record<PokerSettlement["status"], string> = {
      pending: "Pending",
      partial: "Partial",
      completed: "Completed",
      disputed: "Disputed",
      cancelled: "Cancelled",
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  },
);
StatusBadge.displayName = "StatusBadge";

function SettlementActions({
  settlement,
  table,
}: {
  settlement: PokerSettlement;
  table: any;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <Icons.MoreHoriz className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Icons.Visibility className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        {settlement.status === "pending" && (
          <DropdownMenuItem
            onClick={() => table.options.meta?.markPaid?.(settlement.id)}
          >
            <Icons.Check className="mr-2 h-4 w-4" />
            Mark as Paid
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => table.options.meta?.deleteSettlement?.(settlement.id)}
          className="text-destructive"
        >
          <Icons.Delete className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns: ColumnDef<PokerSettlement>[] = [
  {
    accessorKey: "period",
    header: "Period",
    meta: {
      className:
        "w-[180px] min-w-[180px] md:sticky md:left-0 z-20 bg-background",
    },
    cell: ({ row }) => {
      const settlement = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {format(new Date(settlement.periodStart), "MMM d")} -{" "}
            {format(new Date(settlement.periodEnd), "MMM d, yyyy")}
          </span>
          <span className="text-xs text-muted-foreground">
            Created {format(new Date(settlement.createdAt), "MMM d")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "player",
    header: "Player/Agent",
    meta: {
      className: "w-[180px]",
    },
    cell: ({ row }) => {
      const settlement = row.original;
      const entity = settlement.player || settlement.agent;
      const type = settlement.player ? "Player" : "Agent";

      if (!entity) return <span className="text-muted-foreground">-</span>;

      return (
        <div className="flex flex-col">
          <span className="font-medium">{entity.nickname}</span>
          <span className="text-xs text-muted-foreground">{type}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: {
      className: "w-[100px]",
    },
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "grossAmount",
    header: "Gross",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.grossAmount.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    ),
  },
  {
    accessorKey: "rakebackPercentUsed",
    header: "% Usado",
    meta: {
      className: "w-[90px] text-right",
    },
    cell: ({ row }) => {
      const settlement = row.original;
      const percentUsed = settlement.rakebackPercentUsed;
      const entity = settlement.player || settlement.agent;
      const currentPercent = entity?.rakebackPercent ?? null;

      if (percentUsed === null) {
        return <span className="text-muted-foreground text-sm">-</span>;
      }

      const isDifferent =
        currentPercent !== null && percentUsed !== currentPercent;

      return (
        <div className="flex flex-col items-end">
          <span
            className={`font-mono text-sm ${isDifferent ? "text-orange-500" : ""}`}
          >
            {percentUsed.toFixed(2)}%
          </span>
          {isDifferent && (
            <span className="text-[10px] text-muted-foreground">
              atual: {currentPercent?.toFixed(2)}%
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "netAmount",
    header: "Net",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => {
      const net = row.original.netAmount;
      return (
        <span
          className={`font-mono text-sm font-medium ${
            net >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {net >= 0 ? "+" : ""}
          {net.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "paidAmount",
    header: "Paid",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => {
      const settlement = row.original;
      const remaining = settlement.netAmount - settlement.paidAmount;

      return (
        <div className="flex flex-col items-end">
          <span className="font-mono text-sm">
            {settlement.paidAmount.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          {remaining > 0 && settlement.status !== "completed" && (
            <span className="text-xs text-muted-foreground">
              -{remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}{" "}
              remaining
            </span>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    meta: {
      className: "w-[50px] md:sticky md:right-0 z-20 bg-background",
    },
    cell: ({ row, table }) => (
      <SettlementActions settlement={row.original} table={table} />
    ),
  },
];
