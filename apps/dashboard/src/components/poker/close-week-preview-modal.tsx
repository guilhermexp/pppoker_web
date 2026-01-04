"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@midday/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midday/ui/tabs";
import { useToast } from "@midday/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import {
  DespesasTab,
  type Expense,
  GeralTab,
  LigaTab,
  RakebackTab,
  ResumoTab,
  SessionsTab,
  SettlementsTab,
} from "./close-week-tabs";

type RakebackOverride = {
  agentId: string;
  rakebackPercent: number;
};

type FeeOverride = {
  leagueFeePercent: number | null;
  appFeePercent: number | null;
};

interface CloseWeekPreviewModalProps {
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

export function CloseWeekPreviewModal({
  open,
  onOpenChange,
  weekPeriodId,
  onSuccess,
}: CloseWeekPreviewModalProps) {
  const trpc = useTRPC();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for temporary rakeback overrides
  const [rakebackOverrides, setRakebackOverrides] = useState<
    RakebackOverride[]
  >([]);

  // State for fee overrides (league fee, app fee)
  const [feeOverrides, setFeeOverrides] = useState<FeeOverride>({
    leagueFeePercent: null,
    appFeePercent: null,
  });

  // State for expenses
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const { data, isLoading } = useQuery(
    trpc.poker.weekPeriods.getCloseWeekData.queryOptions(
      { weekPeriodId },
      { enabled: open },
    ),
  );

  const closeWeekMutation = useMutation(
    trpc.poker.weekPeriods.close.mutationOptions({
      onSuccess: (result) => {
        toast({
          title: "Semana fechada com sucesso",
          description: `${result.settlementsCreated} acertos criados`,
        });

        // Invalidate queries
        queryClient.invalidateQueries({
          queryKey: trpc.poker.weekPeriods.getCurrent.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.weekPeriods.getOpenPeriods.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.analytics.getDashboardStats.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.settlements.get.queryKey(),
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
    closeWeekMutation.mutate({
      weekPeriodId,
      rakebackOverrides:
        rakebackOverrides.length > 0 ? rakebackOverrides : undefined,
    });
  };

  // Reset overrides and expenses when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setRakebackOverrides([]);
      setFeeOverrides({ leagueFeePercent: null, appFeePercent: null });
      setExpenses([]);
    }
    onOpenChange(newOpen);
  };

  // Calculate financials for ResumoTab
  const calculateFinancials = () => {
    if (!data) return undefined;

    const totalRake = data.stats.totalRake;

    // Use override if set, otherwise use default (0 for now, will come from team settings)
    const leagueFeePercent = feeOverrides.leagueFeePercent ?? 0;
    const leagueFee = (totalRake * leagueFeePercent) / 100;

    // Use override if set, otherwise use default
    const appFeePercent = feeOverrides.appFeePercent ?? 0;
    const appFee = (totalRake * appFeePercent) / 100;

    // Calculate total of variable expenses
    const totalExpenses =
      expenses
        .filter((e) => e.type === "variable")
        .reduce((sum, e) => sum + e.amount, 0) +
      expenses
        .filter(
          (e) =>
            e.type === "fixed" &&
            (e.category === "team" || e.category === "tax"),
        )
        .reduce((sum, e) => sum + e.amount, 0);

    return {
      leagueFee,
      leagueFeePercent,
      appFee,
      appFeePercent,
      totalExpenses,
    };
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[1600px] h-[92vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg">Fechar Semana</DialogTitle>
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
            <div className="px-6 pt-4 border-b border-[#1d1d1d]/50">
              <TabsList className="h-9 bg-transparent p-0 gap-4">
                <TabsTrigger
                  value="resumo"
                  className="h-9 px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  Resumo
                </TabsTrigger>
                <TabsTrigger
                  value="geral"
                  className="h-9 px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  Geral
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({data.summaries.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="partidas"
                  className="h-9 px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  Partidas
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({data.sessions.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="rakeback"
                  className="h-9 px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  Retorno de Taxa
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({data.rakebacks.length})
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
                <TabsTrigger
                  value="despesas"
                  className="h-9 px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  Despesas
                </TabsTrigger>
                <TabsTrigger
                  value="liga"
                  className="h-9 px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  Liga
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <TabsContent value="resumo" className="m-0 h-full">
                <ResumoTab
                  stats={data.stats}
                  weekPeriod={data.weekPeriod}
                  settlementsSummary={data.settlementsSummary}
                  financials={calculateFinancials()}
                  summaries={data.summaries}
                  sessions={data.sessions}
                />
              </TabsContent>

              <TabsContent value="geral" className="m-0 h-full">
                <GeralTab summaries={data.summaries} />
              </TabsContent>

              <TabsContent value="partidas" className="m-0 h-full">
                <SessionsTab sessions={data.sessions} />
              </TabsContent>

              <TabsContent value="rakeback" className="m-0 h-full">
                <RakebackTab
                  rakebacks={data.rakebacks}
                  agentsFromApp={data.agentsFromApp}
                  summaries={data.summaries}
                  rakebackOverrides={rakebackOverrides}
                  onOverridesChange={setRakebackOverrides}
                />
              </TabsContent>

              <TabsContent value="acertos" className="m-0 h-full">
                <SettlementsTab
                  settlements={data.settlements}
                  summary={data.settlementsSummary}
                />
              </TabsContent>

              <TabsContent value="despesas" className="m-0 h-full">
                <DespesasTab
                  totalRake={data.stats.totalRake}
                  totalRakeback={data.settlementsSummary.totalRakeback}
                  leagueFee={calculateFinancials()?.leagueFee ?? 0}
                  leagueFeePercent={feeOverrides.leagueFeePercent ?? undefined}
                  appFee={calculateFinancials()?.appFee ?? 0}
                  appFeePercent={feeOverrides.appFeePercent ?? undefined}
                  expenses={expenses}
                  onExpensesChange={setExpenses}
                  onLeagueFeeChange={(percent) =>
                    setFeeOverrides((prev) => ({
                      ...prev,
                      leagueFeePercent: percent,
                    }))
                  }
                  onAppFeeChange={(percent) =>
                    setFeeOverrides((prev) => ({
                      ...prev,
                      appFeePercent: percent,
                    }))
                  }
                />
              </TabsContent>

              <TabsContent value="liga" className="m-0 h-full">
                <LigaTab
                  stats={{
                    totalRake: data.stats.totalRake,
                    totalPlayers: data.stats.totalPlayers,
                    totalSessions: data.stats.totalSessions,
                    totalWinnings: data.stats.totalWinnings,
                  }}
                  leagueSettings={
                    feeOverrides.leagueFeePercent !== null
                      ? {
                          leagueName: "Liga",
                          leagueFeePercent: feeOverrides.leagueFeePercent,
                        }
                      : undefined
                  }
                  onLeagueFeeChange={(percent) =>
                    setFeeOverrides((prev) => ({
                      ...prev,
                      leagueFeePercent: percent,
                    }))
                  }
                />
              </TabsContent>
            </div>
          </Tabs>
        ) : null}

        <DialogFooter className="px-6 py-4 border-t border-[#1d1d1d]/50">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
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
