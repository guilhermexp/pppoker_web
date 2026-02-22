"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useI18n } from "@/locales/client";
import { Avatar, AvatarFallback } from "@midpoker/ui/avatar";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@midpoker/ui/dropdown-menu";
import { Icons } from "@midpoker/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import { memo } from "react";

export type PokerPlayer = {
  id: string;
  createdAt: string;
  updatedAt: string;
  ppPokerId: string;
  nickname: string;
  memoName: string | null;
  country: string | null;
  type: "player" | "agent";
  status: "active" | "inactive" | "suspended" | "blacklisted";
  activityStatus: "active" | "at_risk" | "inactive" | "new";
  agentId: string | null;
  email: string | null;
  phone: string | null;
  creditLimit: number;
  currentBalance: number;
  chipBalance: number;
  isVip: boolean;
  isShark: boolean;
  lastActiveAt: string | null;
  totalRake?: number;
  totalWinnings?: number;
  // Real-time fields from PPPoker sync
  isOnline?: boolean;
  cashboxBalance?: number;
  pppokerRole?: number | null;
  lastSyncedAt?: string | null;
  agent: {
    id: string;
    nickname: string;
    memoName: string | null;
  } | null;
};

const StatusBadge = memo(
  ({
    activityStatus,
  }: { activityStatus: PokerPlayer["activityStatus"] | undefined }) => {
    const variants: Record<
      PokerPlayer["activityStatus"],
      "default" | "secondary" | "destructive" | "outline"
    > = {
      active: "default",
      at_risk: "outline",
      inactive: "destructive",
      new: "secondary",
    };

    const labels: Record<PokerPlayer["activityStatus"], string> = {
      active: "Ativo",
      at_risk: "Em risco",
      inactive: "Inativo",
      new: "Novo",
    };

    const status = activityStatus ?? "new";
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  },
);
StatusBadge.displayName = "StatusBadge";

const TypeBadge = memo(({ type }: { type: PokerPlayer["type"] }) => {
  if (type === "agent") {
    return (
      <Badge variant="outline" className="bg-primary/10 text-primary">
        Agent
      </Badge>
    );
  }
  return null;
});
TypeBadge.displayName = "TypeBadge";

function PlayerActions({
  player,
  table,
}: {
  player: PokerPlayer;
  table: any;
}) {
  const t = useI18n();
  const { setParams } = usePokerPlayerParams();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <Icons.MoreHoriz className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setParams({ playerId: player.id })}>
          <Icons.Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(player.ppPokerId);
          }}
        >
          <Icons.Copy className="mr-2 h-4 w-4" />
          Copy PPPoker ID
        </DropdownMenuItem>
        {player.phone && (
          <DropdownMenuItem asChild>
            <a
              href={`https://wa.me/${player.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icons.Email className="mr-2 h-4 w-4" />
              WhatsApp
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => table.options.meta?.deletePlayer?.(player.id)}
          className="text-destructive"
        >
          <Icons.Delete className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns: ColumnDef<PokerPlayer>[] = [
  {
    accessorKey: "nickname",
    header: "Player",
    meta: {
      className:
        "w-[240px] min-w-[240px] md:sticky md:left-0 z-20 bg-background",
    },
    cell: ({ row }) => {
      const player = row.original;
      const initials = player.nickname.slice(0, 2).toUpperCase();

      return (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            {/* Online indicator dot */}
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                player.isOnline ? "bg-green-500" : "bg-gray-400",
              )}
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium">{player.nickname}</span>
              {player.isVip && (
                <Icons.Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              )}
              {player.isShark && <span className="text-xs">🦈</span>}
              <TypeBadge type={player.type} />
            </div>
            {player.memoName && (
              <span className="text-xs text-muted-foreground">
                {player.memoName}
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "ppPokerId",
    header: "PPPoker ID",
    meta: {
      className: "w-[120px]",
    },
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.ppPokerId}</span>
    ),
  },
  {
    accessorKey: "activityStatus",
    header: "Status",
    meta: {
      className: "w-[100px]",
    },
    cell: ({ row }) => (
      <StatusBadge activityStatus={row.original.activityStatus} />
    ),
  },
  {
    accessorKey: "agent",
    header: "Agent",
    meta: {
      className: "w-[150px]",
    },
    cell: ({ row }) => {
      const agent = row.original.agent;
      if (!agent) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="text-sm">
          {agent.nickname}
          {agent.memoName && (
            <span className="text-muted-foreground ml-1">
              ({agent.memoName})
            </span>
          )}
        </span>
      );
    },
  },
  {
    accessorKey: "currentBalance",
    header: "Balance",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => {
      const balance = row.original.currentBalance;
      return (
        <span
          className={cn(
            "font-mono text-sm",
            balance > 0 && "text-green-600",
            balance < 0 && "text-red-600",
          )}
        >
          {balance >= 0 ? "+" : ""}
          {balance.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "chipBalance",
    header: "Chips",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.chipBalance.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    ),
  },
  {
    accessorKey: "cashboxBalance",
    header: "Caixa",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => {
      const balance = (row.original as PokerPlayer).cashboxBalance ?? 0;
      return (
        <span
          className={cn(
            "font-mono text-sm",
            balance > 0 && "text-blue-600",
            balance < 0 && "text-red-600",
            balance === 0 && "text-muted-foreground",
          )}
        >
          {balance.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "creditLimit",
    header: "Credit Limit",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">
        {row.original.creditLimit.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    ),
  },
  {
    accessorKey: "totalRake",
    header: "Taxa",
    meta: {
      className: "w-[100px] text-right",
    },
    cell: ({ row }) => {
      const rake = row.original.totalRake ?? 0;
      return (
        <span
          className={cn(
            "font-mono text-sm",
            rake > 0 ? "text-green-600" : "text-muted-foreground",
          )}
        >
          {rake.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "totalWinnings",
    header: "Ganhos",
    meta: {
      className: "w-[100px] text-right",
    },
    cell: ({ row }) => {
      const winnings = row.original.totalWinnings ?? 0;
      return (
        <span
          className={cn(
            "font-mono text-sm",
            winnings > 0 && "text-green-600",
            winnings < 0 && "text-red-600",
            winnings === 0 && "text-muted-foreground",
          )}
        >
          {winnings >= 0 ? "+" : ""}
          {winnings.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Contact",
    meta: {
      className: "w-[200px]",
    },
    cell: ({ row }) => {
      const player = row.original;
      return (
        <div className="flex flex-col text-sm">
          {player.email && <span className="truncate">{player.email}</span>}
          {player.phone && (
            <span className="text-muted-foreground">{player.phone}</span>
          )}
          {!player.email && !player.phone && (
            <span className="text-muted-foreground">-</span>
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
      <PlayerActions player={row.original} table={table} />
    ),
  },
];
