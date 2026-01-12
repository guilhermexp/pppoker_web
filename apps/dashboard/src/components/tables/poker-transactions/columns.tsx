"use client";

import { useI18n } from "@/locales/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@midpoker/ui/dropdown-menu";
import { Icons } from "@midpoker/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { memo } from "react";

export type PokerTransaction = {
  id: string;
  createdAt: string;
  occurredAt: string;
  type: string;
  senderClubId: string | null;
  sender: {
    id: string;
    nickname: string;
    memoName: string | null;
    ppPokerId: string;
  } | null;
  recipient: {
    id: string;
    nickname: string;
    memoName: string | null;
    ppPokerId: string;
  } | null;
  session: {
    id: string;
    tableName: string | null;
    sessionType: string;
  } | null;
  creditSent: number;
  creditRedeemed: number;
  creditLeftClub: number;
  chipsSent: number;
  chipsPpsr: number;
  chipsRing: number;
  chipsCustomRing: number;
  chipsMtt: number;
  chipsRedeemed: number;
  amount: number;
  note: string | null;
};

const TransactionTypeBadge = memo(({ type }: { type: string }) => {
  const labels: Record<string, string> = {
    buy_in: "Buy-in",
    cash_out: "Cash-out",
    credit_given: "Crédito Dado",
    credit_received: "Crédito Recebido",
    credit_paid: "Crédito Pago",
    rake: "Rake",
    agent_commission: "Comissão",
    rakeback: "Rakeback",
    jackpot: "Jackpot",
    adjustment: "Ajuste",
    transfer_in: "Transferência In",
    transfer_out: "Transferência Out",
  };

  const variants: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    buy_in: "default",
    cash_out: "secondary",
    credit_given: "default",
    credit_received: "outline",
    credit_paid: "secondary",
    rake: "outline",
    agent_commission: "secondary",
    rakeback: "outline",
    jackpot: "default",
    adjustment: "destructive",
    transfer_in: "default",
    transfer_out: "secondary",
  };

  return (
    <Badge
      variant={variants[type] ?? "outline"}
      className="text-xs whitespace-nowrap"
    >
      {labels[type] ?? type}
    </Badge>
  );
});
TransactionTypeBadge.displayName = "TransactionTypeBadge";

function TransactionActions({
  transaction,
  table,
}: {
  transaction: PokerTransaction;
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
          Ver Detalhes
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(transaction.id);
          }}
        >
          <Icons.Copy className="mr-2 h-4 w-4" />
          Copiar ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            table.options.meta?.deleteTransaction?.(transaction.id)
          }
          className="text-destructive"
        >
          <Icons.Delete className="mr-2 h-4 w-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns: ColumnDef<PokerTransaction>[] = [
  {
    accessorKey: "occurredAt",
    header: "Data",
    meta: {
      className:
        "w-[160px] min-w-[160px] md:sticky md:left-0 z-20 bg-background",
    },
    cell: ({ row }) => {
      const tx = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {format(new Date(tx.occurredAt), "dd/MM/yyyy")}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(tx.occurredAt), "HH:mm")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Tipo",
    meta: {
      className: "w-[140px]",
    },
    cell: ({ row }) => <TransactionTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: "sender",
    header: "De",
    meta: {
      className: "w-[180px]",
    },
    cell: ({ row }) => {
      const tx = row.original;
      if (tx.senderClubId) {
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">Clube</span>
            <span className="text-xs text-muted-foreground">
              {tx.senderClubId}
            </span>
          </div>
        );
      }
      if (tx.sender) {
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{tx.sender.nickname}</span>
            {tx.sender.memoName && (
              <span className="text-xs text-muted-foreground">
                {tx.sender.memoName}
              </span>
            )}
          </div>
        );
      }
      return <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: "recipient",
    header: "Para",
    meta: {
      className: "w-[180px]",
    },
    cell: ({ row }) => {
      const tx = row.original;
      if (tx.recipient) {
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{tx.recipient.nickname}</span>
            {tx.recipient.memoName && (
              <span className="text-xs text-muted-foreground">
                {tx.recipient.memoName}
              </span>
            )}
          </div>
        );
      }
      return <span className="text-muted-foreground">-</span>;
    },
  },
  {
    accessorKey: "creditSent",
    header: "Crédito",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => {
      const tx = row.original;
      const net = tx.creditSent - tx.creditRedeemed;
      if (net === 0) return <span className="text-muted-foreground">-</span>;
      return (
        <span
          className={`font-mono text-sm ${net > 0 ? "text-green-600" : "text-red-600"}`}
        >
          {net > 0 ? "+" : ""}
          {net.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "chipsSent",
    header: "Fichas",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => {
      const tx = row.original;
      const net = tx.chipsSent - tx.chipsRedeemed;
      if (net === 0) return <span className="text-muted-foreground">-</span>;
      return (
        <span
          className={`font-mono text-sm ${net > 0 ? "text-green-600" : "text-red-600"}`}
        >
          {net > 0 ? "+" : ""}
          {net.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Total",
    meta: {
      className: "w-[120px] text-right",
    },
    cell: ({ row }) => {
      const amount = row.original.amount;
      if (amount === 0) return <span className="text-muted-foreground">-</span>;
      return (
        <span
          className={`font-mono text-sm font-medium ${amount > 0 ? "text-green-600" : "text-red-600"}`}
        >
          {amount > 0 ? "+" : ""}
          {amount.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      );
    },
  },
  {
    accessorKey: "session",
    header: "Sessão",
    meta: {
      className: "w-[150px]",
    },
    cell: ({ row }) => {
      const session = row.original.session;
      if (!session) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="text-sm text-muted-foreground">
          {session.tableName || "Session"}
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
      <TransactionActions transaction={row.original} table={table} />
    ),
  },
];
