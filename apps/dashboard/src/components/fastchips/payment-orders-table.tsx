"use client";

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@midpoker/ui/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type StatusFilter = "all" | "link_gerado" | "pago" | "fichas_enviadas" | "cancelado" | "erro";

const STATUS_BADGE: Record<string, { variant: string; className: string }> = {
  link_gerado: { variant: "outline", className: "bg-amber-100 text-amber-700 border-amber-200" },
  pago: { variant: "outline", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  fichas_enviadas: { variant: "outline", className: "bg-blue-100 text-blue-700 border-blue-200" },
  cancelado: { variant: "outline", className: "bg-gray-100 text-gray-500 border-gray-200" },
  erro: { variant: "outline", className: "bg-red-100 text-red-700 border-red-200" },
};

const STATUS_LABELS: Record<string, string> = {
  link_gerado: "Link Gerado",
  pago: "Pago",
  fichas_enviadas: "Fichas Enviadas",
  cancelado: "Cancelado",
  erro: "Erro",
};

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PaymentOrdersTable() {
  const t = useI18n();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    ...trpc.fastchips.paymentOrders.getStats.queryOptions(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { data, isLoading } = useQuery({
    ...trpc.fastchips.paymentOrders.list.queryOptions({
      pageSize: 50,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchQuery || undefined,
    }),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const updateStatusMutation = useMutation(
    trpc.fastchips.paymentOrders.updateStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.fastchips.paymentOrders.list.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.fastchips.paymentOrders.getStats.queryKey(),
        });
      },
    }),
  );

  const orders = data?.data ?? [];

  const handleCopyLink = (url: string | null) => {
    if (url) {
      navigator.clipboard.writeText(url);
    }
  };

  const handleMarkFichasEnviadas = (id: string) => {
    updateStatusMutation.mutate({ id, status: "fichas_enviadas" });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Icons.Link className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("fastchips.payment_orders.stats.links_gerados")}
                </p>
                <div className="text-2xl font-semibold">
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    stats?.linkGerado ?? 0
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
                <Icons.Check className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("fastchips.payment_orders.stats.pagos")}
                </p>
                <div className="text-2xl font-semibold">
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    stats?.pago ?? 0
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icons.Currency className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("fastchips.payment_orders.stats.fichas_enviadas_hoje")}
                </p>
                <div className="text-2xl font-semibold">
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    stats?.fichasEnviadasHoje ?? 0
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
                <p className="text-sm text-muted-foreground">
                  {t("fastchips.payment_orders.stats.total_vendido_hoje")}
                </p>
                <div className="text-2xl font-semibold">
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    formatCurrency(stats?.totalVendidoHoje ?? 0)
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          placeholder={t("fastchips.payment_orders.search_placeholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("fastchips.payment_orders.filter_all")}
            </SelectItem>
            <SelectItem value="link_gerado">
              {t("fastchips.payment_orders.status.link_gerado")}
            </SelectItem>
            <SelectItem value="pago">
              {t("fastchips.payment_orders.status.pago")}
            </SelectItem>
            <SelectItem value="fichas_enviadas">
              {t("fastchips.payment_orders.status.fichas_enviadas")}
            </SelectItem>
            <SelectItem value="cancelado">
              {t("fastchips.payment_orders.status.cancelado")}
            </SelectItem>
            <SelectItem value="erro">
              {t("fastchips.payment_orders.status.erro")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fastchips.payment_orders.table.status")}</TableHead>
                <TableHead>{t("fastchips.payment_orders.table.jogador")}</TableHead>
                <TableHead>{t("fastchips.payment_orders.table.fichas")}</TableHead>
                <TableHead>{t("fastchips.payment_orders.table.valor")}</TableHead>
                <TableHead>{t("fastchips.payment_orders.table.metodo")}</TableHead>
                <TableHead>{t("fastchips.payment_orders.table.data")}</TableHead>
                <TableHead className="text-right">
                  {t("fastchips.payment_orders.table.acoes")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t("fastchips.payment_orders.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="even:bg-muted/20">
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_BADGE[order.status]?.className ?? ""}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {order.playerNome || "-"}
                        </span>
                        {order.playerUid && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (UID: {order.playerUid})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.fichas?.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(order.valorReais)}
                    </TableCell>
                    <TableCell>
                      {order.captureMethod || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{formatDate(order.createdAt)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(order.createdAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <div className="flex items-center justify-end gap-1">
                          {order.checkoutUrl && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleCopyLink(order.checkoutUrl)}
                                >
                                  <Icons.Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t("fastchips.payment_orders.actions.copiar_link")}
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {order.status === "pago" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleMarkFichasEnviadas(order.id)}
                                  disabled={updateStatusMutation.isPending}
                                >
                                  <Icons.Check className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t("fastchips.payment_orders.actions.marcar_enviadas")}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination info */}
      {data?.meta && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>
            {t("fastchips.payment_orders.total_pedidos", {
              count: data.meta.totalCount,
            })}
          </span>
        </div>
      )}
    </div>
  );
}
