"use client";

import { useI18n } from "@/locales/client";
import { Avatar, AvatarFallback } from "@midpoker/ui/avatar";
import { Badge } from "@midpoker/ui/badge";
import { cn } from "@midpoker/ui/cn";
import type { ColumnDef } from "@tanstack/react-table";
import { memo } from "react";

export type ClubMember = {
  id: string;
  ppPokerId: string;
  nickname: string;
  memoName: string | null;
  type: "player" | "agent" | "super_agent";
  status: "active" | "inactive" | "suspended" | "blacklisted";
  isOnline: boolean;
  cashboxBalance: number;
  pppokerRole: number | null;
  roleLabel: string;
  creditLimit: number;
  currentBalance: number;
  agentId: string | null;
  createdAt: string;
  lastSyncedAt: string | null;
  agent: {
    id: string;
    nickname: string;
    memoName: string | null;
  } | null;
};

const RoleBadge = memo(
  ({ roleLabel, type }: { roleLabel: string; type: string }) => {
    const variant =
      type === "super_agent"
        ? "default"
        : type === "agent"
          ? "outline"
          : "secondary";

    return <Badge variant={variant}>{roleLabel}</Badge>;
  },
);
RoleBadge.displayName = "RoleBadge";

export const columns: ColumnDef<ClubMember>[] = [
  {
    accessorKey: "nickname",
    header: "Membro",
    meta: {
      className:
        "w-[240px] min-w-[240px] md:sticky md:left-0 z-20 bg-background",
    },
    cell: ({ row }) => {
      const member = row.original;
      const initials = member.nickname.slice(0, 2).toUpperCase();

      return (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                member.isOnline ? "bg-green-500" : "bg-gray-400",
              )}
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium">{member.nickname}</span>
            </div>
            {member.memoName && (
              <span className="text-xs text-muted-foreground">
                {member.memoName}
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
    accessorKey: "roleLabel",
    header: "Papel",
    meta: {
      className: "w-[120px]",
    },
    cell: ({ row }) => (
      <RoleBadge roleLabel={row.original.roleLabel} type={row.original.type} />
    ),
  },
  {
    accessorKey: "agent",
    header: "Agente",
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
    accessorKey: "createdAt",
    header: "Entrada",
    meta: {
      className: "w-[120px]",
    },
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return (
        <span className="text-sm text-muted-foreground">
          {date.toLocaleDateString("pt-BR")}
        </span>
      );
    },
  },
  {
    accessorKey: "creditLimit",
    header: "Credito",
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
    accessorKey: "cashboxBalance",
    header: "Saldo",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => {
      const balance = row.original.cashboxBalance;
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
    accessorKey: "status",
    header: "Status",
    meta: {
      className: "w-[100px]",
    },
    cell: ({ row }) => {
      const status = row.original.status;
      const variants: Record<
        string,
        "default" | "secondary" | "destructive" | "outline"
      > = {
        active: "default",
        inactive: "secondary",
        suspended: "outline",
        blacklisted: "destructive",
      };
      const labels: Record<string, string> = {
        active: "Ativo",
        inactive: "Inativo",
        suspended: "Suspenso",
        blacklisted: "Bloqueado",
      };
      return (
        <Badge variant={variants[status] ?? "secondary"}>
          {labels[status] ?? status}
        </Badge>
      );
    },
  },
];
