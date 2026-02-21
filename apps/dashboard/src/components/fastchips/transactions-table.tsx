"use client";

import { useFastchipsTransactionParams } from "@/hooks/use-fastchips-transaction-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@midpoker/ui/select";
import { Skeleton } from "@midpoker/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo, useState } from "react";

type FastChipsTransactionStatus = "completed" | "unpaid";

const statusClasses: Record<FastChipsTransactionStatus, string> = {
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  unpaid: "bg-amber-100 text-amber-700 border-amber-200",
};

export function FastChipsTransactionsTable() {
  const t = useI18n();
  const trpc = useTRPC();
  const { fastchipsTransactionId, setParams } = useFastchipsTransactionParams();
  const [viewMode, setViewMode] = useState<"entries" | "exits">("entries");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch operations from tRPC - filter by type
  const { data, isLoading, error } = useQuery(
    trpc.fastchips.operations.list.queryOptions({
      pageSize: 50,
      operationType: viewMode === "entries" ? "entrada" : "saida",
      search: searchQuery || undefined,
    }),
  );

  // Map tRPC data to table format
  const rows = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((op) => {
      const occurredAt = new Date(op.occurredAt);
      return {
        id: op.id,
        name: op.memberName,
        playerId: op.ppPokerId || "-",
        date: format(occurredAt, "d/M/yy"),
        time: format(occurredAt, "HH:mm"),
        chips: Math.round(op.grossAmount / 100), // Assuming 1 chip = R$ 1
        amount: `R$ ${(op.grossAmount / 100).toFixed(2).replace(".", ",")}`,
        status: "completed" as FastChipsTransactionStatus, // All imported operations are completed
      };
    });
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{t("fastchips.transacoes.view_by")}</span>
          <div className="flex items-center rounded-md border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode("entries")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-sm ${
                viewMode === "entries"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground"
              }`}
            >
              {t("fastchips.transacoes.entries")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("exits")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-sm ${
                viewMode === "exits"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground"
              }`}
            >
              {t("fastchips.transacoes.exits")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-[280px]">
          <Icons.Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("fastchips.transacoes.search_placeholder")}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[160px]">
            <SelectValue placeholder={t("fastchips.transacoes.filter_all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("fastchips.transacoes.filter_all")}
            </SelectItem>
            <SelectItem value="completed">
              {t("fastchips.transacoes.filter_completed")}
            </SelectItem>
            <SelectItem value="unpaid">
              {t("fastchips.transacoes.filter_unpaid")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.transacoes.table.name")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.transacoes.table.player_id")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.transacoes.table.date")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.transacoes.table.time")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.transacoes.table.chips")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.transacoes.table.amount")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.transacoes.table.status")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                {t("fastchips.transacoes.table.action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  Erro ao carregar transações
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhuma transação encontrada. Importe uma planilha Fastchips
                  para começar.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((transaction) => {
                const isSelected = fastchipsTransactionId === transaction.id;
                return (
                  <TableRow
                    key={transaction.id}
                    className={`cursor-pointer hover:bg-accent/50 ${
                      isSelected
                        ? "bg-primary/5 outline outline-1 outline-primary/40"
                        : "even:bg-muted/20"
                    }`}
                    onClick={() =>
                      setParams({ fastchipsTransactionId: transaction.id })
                    }
                  >
                    <TableCell className="font-medium">
                      {transaction.name}
                    </TableCell>
                    <TableCell>{transaction.playerId}</TableCell>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell>{transaction.time}</TableCell>
                    <TableCell>{transaction.chips}</TableCell>
                    <TableCell>{transaction.amount}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`border ${statusClasses[transaction.status]}`}
                      >
                        {transaction.status === "completed"
                          ? t("fastchips.transacoes.status_completed")
                          : t("fastchips.transacoes.status_unpaid")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 border border-border text-muted-foreground"
                        onClick={(event) => {
                          event.stopPropagation();
                          setParams({ fastchipsTransactionId: transaction.id });
                        }}
                      >
                        <Icons.ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
