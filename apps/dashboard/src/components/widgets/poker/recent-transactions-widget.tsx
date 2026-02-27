"use client";

import { useTRPC } from "@/trpc/client";
import { formatDecimal as formatCurrency } from "@/utils/format";
import { Badge } from "@midpoker/ui/badge";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";

const transactionTypeLabels: Record<string, string> = {
  buy_in: "Buy-in",
  cash_out: "Cash-out",
  credit_given: "Credito Dado",
  credit_received: "Credito Recebido",
  credit_paid: "Credito Pago",
  rake: "Rake",
  agent_commission: "Comissao",
  rakeback: "Rakeback",
  jackpot: "Jackpot",
  adjustment: "Ajuste",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
};

const transactionTypeColors: Record<string, string> = {
  buy_in: "bg-green-500/10 text-green-600 border-green-500/20",
  cash_out: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  credit_given: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  credit_received: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  credit_paid: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  rake: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  agent_commission: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  rakeback: "bg-teal-500/10 text-teal-600 border-teal-500/20",
};

export function RecentTransactionsWidget() {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.poker.transactions.get.queryOptions({ pageSize: 5 }),
  );

  if (isLoading) {
    return <RecentTransactionsWidget.Skeleton />;
  }

  const transactions = data?.data ?? [];

  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icons.Transactions className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs text-muted-foreground font-medium">
            Transacoes Recentes
          </h3>
        </div>
        <Link
          href="/poker/transactions"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Ver todas
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma transacao ainda
        </p>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx: any) => (
            <div
              key={tx.id}
              className="flex items-center justify-between py-2 border-b last:border-0 dark:border-[#1d1d1d]"
            >
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${transactionTypeColors[tx.type] ?? ""}`}
                >
                  {transactionTypeLabels[tx.type] ?? tx.type}
                </Badge>
                <div>
                  <p className="text-sm font-medium">
                    {tx.sender?.nickname ?? tx.recipient?.nickname ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.occurredAt), "dd/MM HH:mm")}
                  </p>
                </div>
              </div>
              <p
                className={`text-sm font-mono font-medium ${
                  tx.amount >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {tx.amount >= 0 ? "+" : ""}
                {formatCurrency(tx.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

RecentTransactionsWidget.Skeleton =
  function RecentTransactionsWidgetSkeleton() {
    return (
      <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  };
