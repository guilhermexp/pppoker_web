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
import { formatDistanceToNow, format } from "date-fns";
import { memo } from "react";

export type PokerSession = {
  id: string;
  createdAt: string;
  externalId: string | null;
  tableName: string | null;
  sessionType: "cash_game" | "mtt" | "sit_n_go" | "spin";
  gameVariant: string;
  startedAt: string;
  endedAt: string | null;
  blinds: string | null;
  totalRake: number;
  totalBuyIn: number;
  totalCashOut: number;
  playerCount: number;
  handsPlayed: number;
  guaranteedPrize: number | null;
  createdBy: {
    id: string;
    nickname: string;
    memoName: string | null;
  } | null;
};

const SessionTypeBadge = memo(
  ({ type }: { type: PokerSession["sessionType"] }) => {
    const labels: Record<PokerSession["sessionType"], string> = {
      cash_game: "Cash",
      mtt: "MTT",
      sit_n_go: "Sit&Go",
      spin: "SPIN",
    };

    const variants: Record<
      PokerSession["sessionType"],
      "default" | "secondary" | "outline"
    > = {
      cash_game: "default",
      mtt: "secondary",
      sit_n_go: "outline",
      spin: "outline",
    };

    return <Badge variant={variants[type]}>{labels[type]}</Badge>;
  },
);
SessionTypeBadge.displayName = "SessionTypeBadge";

const GameVariantBadge = memo(({ variant }: { variant: string }) => {
  const labels: Record<string, string> = {
    nlh: "NLH",
    nlh_6plus: "6+",
    nlh_aof: "AOF",
    plo4: "PLO4",
    plo5: "PLO5",
    plo6: "PLO6",
    plo4_hilo: "PLO4 H/L",
    plo5_hilo: "PLO5 H/L",
    plo6_hilo: "PLO6 H/L",
    ofc: "OFC",
    mixed: "Mixed",
    other: "Other",
  };

  return (
    <Badge variant="outline" className="text-xs">
      {labels[variant] ?? variant.toUpperCase()}
    </Badge>
  );
});
GameVariantBadge.displayName = "GameVariantBadge";

function SessionActions({
  session,
  table,
}: {
  session: PokerSession;
  table: any;
}) {
  const t = useI18n();

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
        {session.externalId && (
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(session.externalId!);
            }}
          >
            <Icons.Copy className="mr-2 h-4 w-4" />
            Copy Game ID
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => table.options.meta?.deleteSession?.(session.id)}
          className="text-destructive"
        >
          <Icons.Delete className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns: ColumnDef<PokerSession>[] = [
  {
    id: "expand",
    meta: {
      className: "w-[40px]",
    },
    header: () => null,
    cell: ({ row }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => {
            e.stopPropagation();
            row.toggleExpanded();
          }}
        >
          <Icons.ChevronRight
            className={`h-4 w-4 transition-transform ${
              row.getIsExpanded() ? "rotate-90" : ""
            }`}
          />
        </Button>
      );
    },
  },
  {
    accessorKey: "tableName",
    header: "Session",
    meta: {
      className:
        "w-[200px] min-w-[200px] md:sticky md:left-0 z-20 bg-background",
    },
    cell: ({ row }) => {
      const session = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {session.tableName || session.externalId || "Unnamed Session"}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(session.startedAt), "MMM d, yyyy HH:mm")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "sessionType",
    header: "Type",
    meta: {
      className: "w-[80px]",
    },
    cell: ({ row }) => <SessionTypeBadge type={row.original.sessionType} />,
  },
  {
    accessorKey: "gameVariant",
    header: "Game",
    meta: {
      className: "w-[80px]",
    },
    cell: ({ row }) => <GameVariantBadge variant={row.original.gameVariant} />,
  },
  {
    accessorKey: "blinds",
    header: "Blinds",
    meta: {
      className: "w-[80px]",
    },
    cell: ({ row }) => (
      <span className="text-sm font-mono">
        {row.original.blinds || "-"}
      </span>
    ),
  },
  {
    accessorKey: "playerCount",
    header: "Players",
    meta: {
      className: "w-[80px] text-right",
    },
    cell: ({ row }) => (
      <span className="font-mono">{row.original.playerCount}</span>
    ),
  },
  {
    accessorKey: "handsPlayed",
    header: "Hands",
    meta: {
      className: "w-[80px] text-right",
    },
    cell: ({ row }) => (
      <span className="font-mono text-muted-foreground">
        {row.original.handsPlayed > 0 ? row.original.handsPlayed.toLocaleString("pt-BR") : "-"}
      </span>
    ),
  },
  {
    accessorKey: "totalBuyIn",
    header: "Buy-ins",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.totalBuyIn.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    ),
  },
  {
    accessorKey: "totalRake",
    header: "Rake",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => (
      <span className="font-mono text-sm text-green-600">
        {row.original.totalRake.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    ),
  },
  {
    id: "result",
    header: "Result",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => {
      const result = row.original.totalCashOut - row.original.totalBuyIn;
      if (result === 0) {
        return <span className="font-mono text-sm text-muted-foreground">0,00</span>;
      }
      return (
        <span className={`font-mono text-sm ${result > 0 ? "text-green-600" : "text-red-600"}`}>
          {result > 0 ? "+" : ""}
          {result.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "guaranteedPrize",
    header: "GTD",
    meta: {
      className: "w-[100px] text-right",
    },
    cell: ({ row }) => {
      const gtd = row.original.guaranteedPrize;
      const isTournament = ["mtt", "sit_n_go", "spin"].includes(row.original.sessionType);
      if (!isTournament || !gtd || gtd === 0) {
        return <span className="text-muted-foreground">-</span>;
      }
      return (
        <span className="font-mono text-sm text-blue-600">
          {gtd.toLocaleString("pt-BR", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "duration",
    header: "Duration",
    meta: {
      className: "w-[120px]",
    },
    cell: ({ row }) => {
      const session = row.original;
      if (!session.endedAt) {
        return <Badge variant="outline">Ongoing</Badge>;
      }
      const start = new Date(session.startedAt);
      const end = new Date(session.endedAt);
      const durationMs = end.getTime() - start.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      return (
        <span className="text-sm text-muted-foreground">
          {hours}h {minutes}m
        </span>
      );
    },
  },
  {
    accessorKey: "createdBy",
    header: "Host",
    meta: {
      className: "w-[150px]",
    },
    cell: ({ row }) => {
      const createdBy = row.original.createdBy;
      if (!createdBy) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="text-sm">
          {createdBy.nickname}
        </span>
      );
    },
  },
  {
    id: "actions",
    meta: {
      className: "w-[50px] md:sticky md:right-0 z-20 bg-background",
    },
    cell: ({ row, table }) => (
      <SessionActions session={row.original} table={table} />
    ),
  },
];
