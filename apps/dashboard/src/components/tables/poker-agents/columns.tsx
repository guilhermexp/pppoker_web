"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useI18n } from "@/locales/client";
import { Avatar, AvatarFallback } from "@midday/ui/avatar";
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
import Link from "next/link";
import { memo } from "react";

export type PokerAgent = {
  id: string;
  createdAt: string;
  updatedAt: string;
  ppPokerId: string;
  nickname: string;
  memoName: string | null;
  country: string | null;
  type: "player" | "agent";
  status: "active" | "inactive" | "suspended" | "blacklisted";
  email: string | null;
  phone: string | null;
  rakebackPercent: number;
  currentBalance: number;
  chipBalance: number;
  superAgent: {
    id: string;
    nickname: string;
    memoName: string | null;
  } | null;
};

const StatusBadge = memo(
  ({ status }: { status: PokerAgent["status"] }) => {
    const variants: Record<
      PokerAgent["status"],
      "default" | "secondary" | "destructive" | "outline"
    > = {
      active: "default",
      inactive: "secondary",
      suspended: "outline",
      blacklisted: "destructive",
    };

    const labels: Record<PokerAgent["status"], string> = {
      active: "Active",
      inactive: "Inactive",
      suspended: "Suspended",
      blacklisted: "Blacklisted",
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  },
);
StatusBadge.displayName = "StatusBadge";

function AgentActions({
  agent,
  table,
}: {
  agent: PokerAgent;
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
        <DropdownMenuItem onClick={() => setParams({ playerId: agent.id })}>
          <Icons.Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/poker/players?agentId=${agent.id}`}>
            <Icons.Customers className="mr-2 h-4 w-4" />
            View Players
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(agent.ppPokerId);
          }}
        >
          <Icons.Copy className="mr-2 h-4 w-4" />
          Copy PPPoker ID
        </DropdownMenuItem>
        {agent.phone && (
          <DropdownMenuItem asChild>
            <a
              href={`https://wa.me/${agent.phone.replace(/\D/g, "")}`}
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
          onClick={() => table.options.meta?.deletePlayer?.(agent.id)}
          className="text-destructive"
        >
          <Icons.Delete className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns: ColumnDef<PokerAgent>[] = [
  {
    accessorKey: "nickname",
    header: "Agent",
    meta: {
      className:
        "w-[240px] min-w-[240px] md:sticky md:left-0 z-20 bg-background",
    },
    cell: ({ row }) => {
      const agent = row.original;
      const initials = agent.nickname.slice(0, 2).toUpperCase();

      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium">{agent.nickname}</span>
              <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                Agent
              </Badge>
            </div>
            {agent.memoName && (
              <span className="text-xs text-muted-foreground">
                {agent.memoName}
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
    accessorKey: "status",
    header: "Status",
    meta: {
      className: "w-[100px]",
    },
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "rakebackPercent",
    header: "Rakeback %",
    meta: {
      className: "w-[100px] text-right",
    },
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.rakebackPercent.toFixed(1)}%
      </span>
    ),
  },
  {
    accessorKey: "superAgent",
    header: "Super Agent",
    meta: {
      className: "w-[150px]",
    },
    cell: ({ row }) => {
      const superAgent = row.original.superAgent;
      if (!superAgent) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="text-sm">
          {superAgent.nickname}
          {superAgent.memoName && (
            <span className="text-muted-foreground ml-1">
              ({superAgent.memoName})
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
          className={`font-mono text-sm ${
            balance > 0 ? "text-green-600" : balance < 0 ? "text-red-600" : ""
          }`}
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
    accessorKey: "email",
    header: "Contact",
    meta: {
      className: "w-[200px]",
    },
    cell: ({ row }) => {
      const agent = row.original;
      return (
        <div className="flex flex-col text-sm">
          {agent.email && (
            <span className="truncate">{agent.email}</span>
          )}
          {agent.phone && (
            <span className="text-muted-foreground">{agent.phone}</span>
          )}
          {!agent.email && !agent.phone && (
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
      <AgentActions agent={row.original} table={table} />
    ),
  },
];
