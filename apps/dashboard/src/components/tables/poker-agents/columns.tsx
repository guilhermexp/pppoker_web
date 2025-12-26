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
  // Metrics (from agentStats)
  playerCount?: number;
  totalRake?: number;
  rakePpst?: number;
  rakePpsr?: number;
  estimatedCommission?: number;
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

function formatCurrency(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

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
        <DropdownMenuItem onClick={() => setParams({ viewAgentId: agent.id })}>
          <Icons.Visibility className="mr-2 h-4 w-4" />
          Ver Detalhes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setParams({ playerId: agent.id })}>
          <Icons.Edit className="mr-2 h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/poker/players?agentId=${agent.id}`}>
            <Icons.Customers className="mr-2 h-4 w-4" />
            Ver Jogadores
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(agent.ppPokerId);
          }}
        >
          <Icons.Copy className="mr-2 h-4 w-4" />
          Copiar PPPoker ID
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
          Excluir
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
    accessorKey: "playerCount",
    header: "Jogadores",
    meta: {
      className: "w-[90px] text-center",
    },
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium">
        {row.original.playerCount ?? 0}
      </span>
    ),
  },
  {
    accessorKey: "rakebackPercent",
    header: "Rakeback",
    meta: {
      className: "w-[80px] text-right",
    },
    cell: ({ row }) => (
      <span className="font-mono text-sm">
        {row.original.rakebackPercent.toFixed(0)}%
      </span>
    ),
  },
  {
    accessorKey: "rakePpst",
    header: "PPST",
    meta: {
      className: "w-[100px] text-right",
    },
    cell: ({ row }) => (
      <span className="font-mono text-sm text-blue-600">
        {formatCurrency(row.original.rakePpst ?? 0)}
      </span>
    ),
  },
  {
    accessorKey: "rakePpsr",
    header: "PPSR",
    meta: {
      className: "w-[100px] text-right",
    },
    cell: ({ row }) => (
      <span className="font-mono text-sm text-purple-600">
        {formatCurrency(row.original.rakePpsr ?? 0)}
      </span>
    ),
  },
  {
    accessorKey: "estimatedCommission",
    header: "Comissao",
    meta: {
      className: "w-[100px] text-right",
    },
    cell: ({ row }) => (
      <span className="font-mono text-sm text-orange-600 font-medium">
        {formatCurrency(row.original.estimatedCommission ?? 0)}
      </span>
    ),
  },
  {
    accessorKey: "superAgent",
    header: "Super Agente",
    meta: {
      className: "w-[140px]",
    },
    cell: ({ row }) => {
      const superAgent = row.original.superAgent;
      if (!superAgent) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="text-sm truncate">
          {superAgent.nickname}
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
      <AgentActions agent={row.original} table={table} />
    ),
  },
];
