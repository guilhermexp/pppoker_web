"use client";

import { useTRPC } from "@/trpc/client";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Loader2, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import type { Transaction } from "./types";
import { TYPE_LABELS, formatBalance } from "./types";

export function TransacoesTab() {
  const trpc = useTRPC();
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { data, isLoading } = useQuery(
    trpc.poker.transactions.get.queryOptions({
      pageSize: 100,
      sort: ["occurred_at", "desc"],
      q: deferredSearch || undefined,
      type: typeFilter !== "todos" ? (typeFilter as any) : undefined,
      includeDraft: true,
    }),
  );

  const transactions = (data?.data ?? []) as Transaction[];
  const totalCount = data?.meta?.totalCount ?? 0;

  // Stats
  const stats = useMemo(() => {
    let totalEnvio = 0;
    let totalResgate = 0;
    for (const tx of transactions) {
      if (tx.amount > 0) totalEnvio += tx.amount;
      else totalResgate += Math.abs(tx.amount);
    }
    return { totalEnvio, totalResgate, count: transactions.length };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
            <Icons.ReceiptLong className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 leading-none">
            <p className="font-mono text-sm font-medium">{totalCount}</p>
            <p className="text-[10px] text-muted-foreground truncate">Total</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10 text-green-600 flex-shrink-0">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 leading-none">
            <p className="font-mono text-sm font-medium text-green-600">
              {formatBalance(stats.totalEnvio)}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Enviado
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10 text-red-600 flex-shrink-0">
            <ArrowDownLeft className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 leading-none">
            <p className="font-mono text-sm font-medium text-red-600">
              {formatBalance(stats.totalResgate)}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Resgatado
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por jogador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Type filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {[
          { key: "todos", label: "Todos" },
          { key: "credit_given", label: "Crédito dado" },
          { key: "credit_received", label: "Crédito recebido" },
          { key: "credit_paid", label: "Crédito pago" },
          { key: "buy_in", label: "Buy-in" },
          { key: "cash_out", label: "Cash-out" },
          { key: "transfer_in", label: "Recebimento" },
          { key: "transfer_out", label: "Envio" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setTypeFilter(f.key)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
              typeFilter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="flex flex-col max-h-[500px] overflow-y-auto border-t border-border">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Icons.Invoice className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {search
                ? "Nenhuma transação encontrada"
                : "Nenhuma transação registrada"}
            </p>
          </div>
        ) : (
          transactions.map((tx) => {
            const typeInfo = TYPE_LABELS[tx.type] ?? {
              label: tx.type,
              color: "bg-gray-500/15 text-gray-600",
            };
            const isPositive = tx.amount > 0;
            const date = new Date(tx.occurredAt);
            const senderName =
              tx.sender?.memoName || tx.sender?.nickname || "—";
            const recipientName =
              tx.recipient?.memoName || tx.recipient?.nickname || "—";

            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 border-b border-border py-3 last:border-b-0 hover:bg-muted/50 transition-colors"
              >
                {/* Icon */}
                <div
                  className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-full flex-shrink-0",
                    isPositive ? "bg-green-500/10" : "bg-red-500/10",
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4 text-red-600" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {senderName}
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-sm truncate">{recipientName}</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                        typeInfo.color,
                      )}
                    >
                      {typeInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {date.toLocaleDateString("pt-BR")}{" "}
                      {date.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {tx.note && (
                      <>
                        <span className="text-border">|</span>
                        <span className="truncate">{tx.note}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <span
                  className={cn(
                    "font-mono text-sm font-medium flex-shrink-0",
                    isPositive ? "text-green-600" : "text-red-600",
                  )}
                >
                  {isPositive ? "+" : ""}
                  {formatBalance(tx.amount)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
