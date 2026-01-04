"use client";

import { useTRPC } from "@/trpc/client";
import { formatNumber } from "@/utils/format";
import { Button } from "@midday/ui/button";
import { cn } from "@midday/ui/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@midday/ui/dialog";
import { Icons } from "@midday/ui/icons";
import { Skeleton } from "@midday/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midday/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midday/ui/tabs";
import { useToast } from "@midday/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CloseSUWeekPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekPeriodId?: string;
  onSuccess?: () => void;
}

function formatWeekRange(start: string, end: string) {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  return `${format(startDate, "dd/MM/yyyy", { locale: ptBR })} - ${format(endDate, "dd/MM/yyyy", { locale: ptBR })}`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  variant?: "default" | "success" | "warning" | "muted";
}) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        {Icon && <Icon className="h-4 w-4" />}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "text-2xl font-semibold",
          variant === "success" && "text-green-600",
          variant === "warning" && "text-yellow-600",
          variant === "muted" && "text-muted-foreground",
        )}
      >
        {typeof value === "number" ? formatNumber(value) : value}
      </div>
    </div>
  );
}

export function CloseSUWeekPreviewModal({
  open,
  onOpenChange,
  weekPeriodId,
  onSuccess,
}: CloseSUWeekPreviewModalProps) {
  const trpc = useTRPC();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    trpc.su.weekPeriods.getCloseWeekData.queryOptions(
      { weekPeriodId },
      { enabled: open },
    ),
  );

  const closeWeekMutation = useMutation(
    trpc.su.weekPeriods.close.mutationOptions({
      onSuccess: (result) => {
        toast({
          title: "Semana fechada com sucesso",
          description: `${result.settlementsCreated} acertos criados`,
        });

        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: trpc.su.weekPeriods.getCurrent.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.su.weekPeriods.getOpenPeriods.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.su.analytics.getDashboardStats.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.su.settlements.list.queryKey(),
        });

        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error) => {
        toast({
          title: "Erro ao fechar semana",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const handleConfirm = () => {
    closeWeekMutation.mutate({ weekPeriodId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg">Fechar Semana SU</DialogTitle>
          {data && (
            <DialogDescription>
              Período:{" "}
              {formatWeekRange(
                data.weekPeriod.weekStart,
                data.weekPeriod.weekEnd,
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 p-6 space-y-4">
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : data ? (
          <Tabs
            defaultValue="resumo"
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 pt-4 border-b border-border/40">
              <TabsList className="h-9 bg-transparent p-0 gap-4">
                <TabsTrigger
                  value="resumo"
                  className="h-9 px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  Resumo
                </TabsTrigger>
                <TabsTrigger
                  value="ligas"
                  className="h-9 px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  Ligas
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({data.summaries.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="jogos"
                  className="h-9 px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  Jogos
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({data.games.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="acertos"
                  className="h-9 px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  Acertos
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({data.settlements.length})
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              {/* Resumo Tab */}
              <TabsContent value="resumo" className="m-0 h-full p-6">
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-5 gap-4">
                    <StatCard
                      label="Ligas"
                      value={data.stats.totalLeagues}
                      icon={Icons.Link}
                    />
                    <StatCard
                      label="Jogos PPST"
                      value={data.stats.totalGamesPPST}
                      icon={Icons.Play}
                    />
                    <StatCard
                      label="Jogos PPSR"
                      value={data.stats.totalGamesPPSR}
                      icon={Icons.Time}
                    />
                    <StatCard
                      label="Taxa Liga (Total)"
                      value={data.stats.totalLeagueFee}
                      icon={Icons.Currency}
                      variant="success"
                    />
                    <StatCard
                      label="Gap Garantido"
                      value={data.stats.totalGapGuaranteed}
                      icon={Icons.TrendingDown}
                      variant="warning"
                    />
                  </div>

                  {/* Settlement Summary */}
                  <div className="bg-card border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Resumo dos Acertos
                    </h3>
                    <div className="grid grid-cols-4 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Ligas para Acerto
                        </p>
                        <p className="text-2xl font-semibold">
                          {data.settlementsSummary.count}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Valor Bruto Total
                        </p>
                        <p className="text-2xl font-semibold">
                          {formatNumber(data.settlementsSummary.totalGrossAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Valor Líquido Total
                        </p>
                        <p className="text-2xl font-semibold text-green-600">
                          {formatNumber(data.settlementsSummary.totalNetAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Já Acertados
                        </p>
                        <p className="text-2xl font-semibold text-muted-foreground">
                          {data.settlementsSummary.alreadySettled}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Ligas Tab */}
              <TabsContent value="ligas" className="m-0 h-full p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Liga</TableHead>
                      <TableHead className="text-right">
                        Taxa PPST
                      </TableHead>
                      <TableHead className="text-right">
                        Taxa PPSR
                      </TableHead>
                      <TableHead className="text-right">Gap GTD</TableHead>
                      <TableHead className="text-right">
                        Jogador Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.summaries.map((summary) => (
                      <TableRow key={summary.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{summary.liga_nome}</p>
                            <p className="text-sm text-muted-foreground">
                              ID: {summary.liga_id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(
                            Number(summary.ppst_ganhos_liga_taxa || 0),
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(
                            Number(summary.ppsr_ganhos_liga_taxa || 0),
                          )}
                        </TableCell>
                        <TableCell className="text-right text-yellow-600">
                          {formatNumber(
                            Number(summary.ppst_gap_garantido || 0),
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(
                            Number(summary.ppst_ganhos_jogador || 0) +
                              Number(summary.ppsr_ganhos_jogador || 0),
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Jogos Tab */}
              <TabsContent value="jogos" className="m-0 h-full p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Mesa</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Jogadores</TableHead>
                      <TableHead className="text-right">Buy-in</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.games.slice(0, 50).map((game) => (
                      <TableRow key={game.id}>
                        <TableCell>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              game.game_type === "ppst"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                            )}
                          >
                            {game.game_type.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell>{game.table_name || "-"}</TableCell>
                        <TableCell>
                          {format(
                            parseISO(game.started_at),
                            "dd/MM/yyyy HH:mm",
                            { locale: ptBR },
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {game.player_count || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(Number(game.total_buyin || 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(Number(game.total_taxa || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.games.length > 50 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground"
                        >
                          ... e mais {data.games.length - 50} jogos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Acertos Tab */}
              <TabsContent value="acertos" className="m-0 h-full p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Liga</TableHead>
                      <TableHead className="text-right">Taxa PPST</TableHead>
                      <TableHead className="text-right">Taxa PPSR</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.settlements.map((settlement) => (
                      <TableRow key={settlement.ligaId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{settlement.ligaNome}</p>
                            <p className="text-sm text-muted-foreground">
                              ID: {settlement.ligaId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(settlement.ppstLeagueFee)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(settlement.ppsrLeagueFee)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(settlement.grossAmount)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatNumber(settlement.netAmount)}
                        </TableCell>
                        <TableCell>
                          {settlement.existingSettlement ? (
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                settlement.existingSettlement.status ===
                                  "completed"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                  : settlement.existingSettlement.status ===
                                      "partial"
                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                              )}
                            >
                              {settlement.existingSettlement.status ===
                              "completed"
                                ? "Pago"
                                : settlement.existingSettlement.status ===
                                    "partial"
                                  ? "Parcial"
                                  : "Pendente"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              Novo
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </div>
          </Tabs>
        ) : null}

        <DialogFooter className="px-6 py-4 border-t border-border/40">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={closeWeekMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              closeWeekMutation.isPending ||
              isLoading ||
              !data ||
              data.settlements.length === 0
            }
          >
            {closeWeekMutation.isPending ? (
              <>
                <Icons.Refresh className="mr-2 h-4 w-4 animate-spin" />
                Fechando...
              </>
            ) : (
              <>
                <Icons.Check className="mr-2 h-4 w-4" />
                Confirmar e Fechar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
