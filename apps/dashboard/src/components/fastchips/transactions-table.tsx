"use client";

import { useFastchipsTransactionParams } from "@/hooks/use-fastchips-transaction-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Card, CardContent } from "@midpoker/ui/card";
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
import { useState } from "react";

function formatCurrency(value: number): string {
  return `R$ ${(value / 100).toFixed(2).replace(".", ",")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PURPOSE_LABELS: Record<string, string> = {
  Recebimento: "Recebimento",
  Pagamento: "Pagamento",
  Saque: "Saque",
  "Serviço": "Serviço",
};

export function FastChipsTransactionsTable() {
  const t = useI18n();
  const trpc = useTRPC();
  const { setParams } = useFastchipsTransactionParams();
  const [viewMode, setViewMode] = useState<"entries" | "exits">("entries");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, error } = useQuery({
    ...trpc.fastchips.operations.list.queryOptions({
      pageSize: 50,
      operationType: viewMode === "entries" ? "Entrada" : "Saída",
      search: searchQuery || undefined,
    }),
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    ...trpc.fastchips.operations.getStats.queryOptions({}),
  });

  const operations = data?.data ?? [];

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Icons.ArrowUpward className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entradas</p>
                <div className="text-2xl font-semibold">
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    stats?.totalEntries ?? 0
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Icons.Currency className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Entradas</p>
                <div className="text-2xl font-semibold">
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    formatCurrency(stats?.grossEntryTotal ?? 0)
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Icons.ArrowDownward className="w-4 h-4 text-red-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saídas</p>
                <div className="text-2xl font-semibold">
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    stats?.totalExits ?? 0
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Icons.CurrencyOutline className="w-4 h-4 text-purple-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <div className="text-2xl font-semibold">
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    formatCurrency(stats?.balance ?? 0)
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
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
              Entradas
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
              Saídas
            </button>
          </div>
        </div>

        <div className="relative w-full md:max-w-[280px]">
          <Icons.Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar jogador ou ID..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Tipo
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Jogador
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Player ID
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Finalidade
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Fichas
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Valor Bruto
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Taxa
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Valor Líquido
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                Data
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-8 text-muted-foreground"
                >
                  Erro ao carregar transações
                </TableCell>
              </TableRow>
            ) : operations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            ) : (
              operations.map((op) => {
                const isEntry = op.operationType === "Entrada";
                return (
                  <TableRow
                    key={op.id}
                    className="cursor-pointer hover:bg-accent/50 even:bg-muted/20"
                    onClick={() =>
                      setParams({ fastchipsTransactionId: op.id })
                    }
                  >
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          isEntry
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }
                      >
                        {isEntry ? "Entrada" : "Saída"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {op.memberName || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {op.ppPokerId || "-"}
                    </TableCell>
                    <TableCell>
                      {op.purpose || "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {Math.round(op.grossAmount / 100).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(op.grossAmount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {op.feeAmount
                        ? formatCurrency(op.feeAmount)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {op.netAmount
                        ? formatCurrency(op.netAmount)
                        : formatCurrency(op.grossAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {formatDate(op.occurredAt)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(op.occurredAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 border border-border text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setParams({ fastchipsTransactionId: op.id });
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

      {/* Pagination info */}
      {data?.meta && (
        <div className="text-sm text-muted-foreground">
          {data.meta.totalCount} transações
        </div>
      )}
    </div>
  );
}
