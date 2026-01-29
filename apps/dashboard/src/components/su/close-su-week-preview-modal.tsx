"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@midpoker/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@midpoker/ui/dialog";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";
import { AcertosTab } from "./close-week-tabs/acertos-tab";
import { JogosPPSRTab } from "./close-week-tabs/jogos-ppsr-tab";
import { JogosPPSTTab } from "./close-week-tabs/jogos-ppst-tab";
import { LigasTab } from "./close-week-tabs/ligas-tab";
import { ResumoTab } from "./close-week-tabs/resumo-tab";

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

const tabTriggerClassName =
  "h-9 px-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none";

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

  const ppstGames = useMemo(
    () => data?.games.filter((g) => g.game_type === "ppst") ?? [],
    [data?.games],
  );

  const ppsrGames = useMemo(
    () => data?.games.filter((g) => g.game_type === "ppsr") ?? [],
    [data?.games],
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
              Periodo:{" "}
              {formatWeekRange(
                data.weekPeriod.weekStart,
                data.weekPeriod.weekEnd,
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-32" />
          </div>
        ) : data ? (
          <Tabs
            defaultValue="resumo"
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 pt-4 border-b border-border/40">
              <TabsList className="h-9 bg-transparent p-0 gap-4">
                <TabsTrigger value="resumo" className={tabTriggerClassName}>
                  Resumo
                </TabsTrigger>
                <TabsTrigger value="ligas" className={tabTriggerClassName}>
                  Ligas
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({data.summaries.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="jogos-ppst" className={tabTriggerClassName}>
                  Jogos PPST
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({ppstGames.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="jogos-ppsr" className={tabTriggerClassName}>
                  Jogos PPSR
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({ppsrGames.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="acertos" className={tabTriggerClassName}>
                  Acertos
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({data.settlements.length})
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <TabsContent value="resumo" className="m-0 h-full">
                <ResumoTab
                  stats={data.stats}
                  settlementsSummary={data.settlementsSummary}
                />
              </TabsContent>

              <TabsContent value="ligas" className="m-0 h-full">
                <LigasTab summaries={data.summaries} />
              </TabsContent>

              <TabsContent value="jogos-ppst" className="m-0 h-full">
                <JogosPPSTTab games={ppstGames} />
              </TabsContent>

              <TabsContent value="jogos-ppsr" className="m-0 h-full">
                <JogosPPSRTab games={ppsrGames} />
              </TabsContent>

              <TabsContent value="acertos" className="m-0 h-full">
                <AcertosTab settlements={data.settlements} />
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
