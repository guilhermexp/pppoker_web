"use client";

import { useFastchipsMovementParams } from "@/hooks/use-fastchips-movement-params";
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
import { format, subDays, subMonths, startOfMonth } from "date-fns";
import { useEffect, useMemo, useState } from "react";

export function FastChipsMovementsTable() {
  const t = useI18n();
  const trpc = useTRPC();
  const { fastchipsMovementId, setParams } = useFastchipsMovementParams();
  const [viewMode, setViewMode] = useState<"operations" | "withdraw_data">(
    "operations",
  );
  const [dateRange, setDateRange] = useState("last_month");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate date range filters
  const dateFilters = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case "last_7_days":
        return { startDate: subDays(now, 7).toISOString() };
      case "this_month":
        return { startDate: startOfMonth(now).toISOString() };
      case "last_month":
      default:
        return { startDate: subMonths(now, 1).toISOString() };
    }
  }, [dateRange]);

  // Fetch operations from tRPC
  const { data, isLoading, error } = useQuery(
    trpc.fastchips.operations.list.queryOptions({
      pageSize: 50,
      ...dateFilters,
    })
  );

  // Fetch stats
  const { data: statsData } = useQuery(
    trpc.fastchips.operations.getStats.queryOptions(dateFilters)
  );

  // Map tRPC data to table format
  const rows = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((op) => {
      const occurredAt = new Date(op.occurredAt);
      return {
        id: op.id,
        playerId: op.ppPokerId || "-",
        date: format(occurredAt, "d/M/yy"),
        time: format(occurredAt, "HH:mm"),
        amount: `R$ ${(op.grossAmount / 100).toFixed(2).replace(".", ",")}`,
        type: op.operationType === "entrada" ? "entry" : "exit",
        status: "completed",
        paymentId: op.paymentId || "-",
        purpose: op.purpose,
        grossAmount: `R$ ${(op.grossAmount / 100).toFixed(2).replace(".", ",")}`,
        netAmount: `R$ ${(op.netAmount / 100).toFixed(2).replace(".", ",")}`,
        fee: `R$ ${(op.feeAmount / 100).toFixed(2).replace(".", ",")}`,
        payer: op.memberName,
      };
    });
  }, [data]);

  // Format currency
  const formatCurrency = (value: number) =>
    `R$ ${(value / 100).toFixed(2).replace(".", ",")}`;

  // Calculate totals from stats
  const totalEntries = statsData?.totalGrossEntry ?? 0;
  const totalExits = statsData?.totalGrossExit ?? 0;
  const balance = totalEntries - totalExits;

  return (
    <div className="space-y-5">
      <Card className="border-l-4 border-l-emerald-500">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            {t("fastchips.movimentacao.available")}
          </p>
          <p className="text-2xl font-semibold">{formatCurrency(balance)}</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Input className="max-w-[140px]" defaultValue="0,00" />
          <Button variant="outline" className="px-6">
            {t("fastchips.movimentacao.add")}
          </Button>
        </div>
        <Button className="px-6">{t("fastchips.movimentacao.withdraw")}</Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{t("fastchips.movimentacao.view_by")}</span>
          <div className="flex items-center rounded-md border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode("operations")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-sm ${
                viewMode === "operations"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground"
              }`}
            >
              {t("fastchips.movimentacao.operations")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("withdraw_data")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-sm ${
                viewMode === "withdraw_data"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground"
              }`}
            >
              {t("fastchips.movimentacao.withdraw_data")}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Button variant="outline" className="gap-2">
            <Icons.Share className="h-4 w-4" />
            {t("fastchips.movimentacao.export")}
          </Button>
          {mounted ? (
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_month">
                  {t("fastchips.movimentacao.range_last_month")}
                </SelectItem>
                <SelectItem value="this_month">
                  {t("fastchips.movimentacao.range_this_month")}
                </SelectItem>
                <SelectItem value="last_7_days">
                  {t("fastchips.movimentacao.range_last_7")}
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="h-9 w-full md:w-[220px] rounded-md border border-border bg-muted/30" />
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center">
              <Icons.ArrowDownward className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("fastchips.movimentacao.total_entries")}
              </p>
              <p className="text-lg font-semibold">{formatCurrency(totalEntries)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center">
              <Icons.ArrowUpward className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("fastchips.movimentacao.total_exits")}
              </p>
              <p className="text-lg font-semibold">{formatCurrency(totalExits)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.movimentacao.table.player_id")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.movimentacao.table.date")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.movimentacao.table.time")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.movimentacao.table.amount")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">
                {t("fastchips.movimentacao.table.type")}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                {t("fastchips.movimentacao.table.action")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Erro ao carregar operações
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma operação encontrada. Importe uma planilha Fastchips para começar.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((movement) => {
                const isSelected = fastchipsMovementId === movement.id;
                return (
                  <TableRow
                    key={movement.id}
                    className={`cursor-pointer hover:bg-accent/50 ${
                      isSelected
                        ? "bg-primary/5 outline outline-1 outline-primary/40"
                        : "even:bg-muted/20"
                    }`}
                    onClick={() => setParams({ fastchipsMovementId: movement.id })}
                  >
                    <TableCell>{movement.playerId}</TableCell>
                    <TableCell>{movement.date}</TableCell>
                    <TableCell>{movement.time}</TableCell>
                    <TableCell>{movement.amount}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`border ${
                          movement.type === "entry"
                            ? "bg-sky-100 text-sky-700 border-sky-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        }`}
                      >
                        {movement.type === "entry"
                          ? t("fastchips.movimentacao.type_entry")
                          : t("fastchips.movimentacao.type_exit")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 border border-border text-muted-foreground"
                        onClick={(event) => {
                          event.stopPropagation();
                          setParams({ fastchipsMovementId: movement.id });
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
