"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@midpoker/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@midpoker/ui/dialog";
import { Icons } from "@midpoker/ui/icons";
import { Progress } from "@midpoker/ui/progress";
import { Spinner } from "@midpoker/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type ImportProgressModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importId: string | null;
  onComplete?: () => void;
  onError?: (error: string) => void;
};

// Status phases for visual feedback
const STATUS_PHASES = {
  validated: { label: "Preparando importação...", progress: 10 },
  processing: { label: "Processando dados...", progress: 50 },
  completed: { label: "Concluído!", progress: 100 },
  failed: { label: "Falhou", progress: 0 },
} as const;

export function LeagueImportProgressModal({
  open,
  onOpenChange,
  importId,
  onComplete,
  onError,
}: ImportProgressModalProps) {
  const trpc = useTRPC();
  const [phase, setPhase] = useState<string>("Iniciando...");
  const [progress, setProgress] = useState(10);

  // Poll import status every 2 seconds
  const { data: importData, isLoading } = useQuery({
    ...trpc.su.imports.getById.queryOptions({ id: importId! }),
    enabled: !!importId && open,
    refetchInterval: (data) => {
      // Stop polling when completed or failed
      if (data?.status === "completed" || data?.status === "failed") {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });

  // Update phase and progress based on status
  useEffect(() => {
    if (!importData) return;

    const status = importData.status as keyof typeof STATUS_PHASES;
    const phaseInfo = STATUS_PHASES[status];

    if (phaseInfo) {
      setPhase(phaseInfo.label);
      setProgress(phaseInfo.progress);
    }

    // Handle completion
    if (status === "completed") {
      setTimeout(() => {
        onComplete?.();
        onOpenChange(false);
      }, 1500);
    }

    // Handle failure
    if (status === "failed") {
      const errorMessage =
        (importData.processing_errors as any)?.message ||
        "Erro desconhecido ao processar";
      onError?.(errorMessage);
      setTimeout(() => {
        onOpenChange(false);
      }, 3000);
    }
  }, [importData, onComplete, onError, onOpenChange]);

  // Add more granular progress updates based on stats
  useEffect(() => {
    if (!importData || importData.status !== "processing") return;

    // If we have stats, calculate more accurate progress
    const totalGames =
      (importData.total_games_ppst || 0) + (importData.total_games_ppsr || 0);
    const totalPlayers =
      (importData.total_players_ppst || 0) +
      (importData.total_players_ppsr || 0);

    if (totalGames > 0) {
      // Show progress breakdown
      if (importData.total_games_ppst && importData.total_games_ppst > 0) {
        setPhase(
          `Processando jogos PPST (${importData.total_games_ppst} torneios)...`,
        );
        setProgress(60);
      }
      if (importData.total_games_ppsr && importData.total_games_ppsr > 0) {
        setPhase(
          `Processando jogos PPSR (${importData.total_games_ppsr} cash games)...`,
        );
        setProgress(80);
      }
      if (totalPlayers > 0) {
        setPhase(`Vinculando ${totalPlayers} jogadores...`);
        setProgress(90);
      }
    }
  }, [importData]);

  const isCompleted = importData?.status === "completed";
  const isFailed = importData?.status === "failed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-6">
        <DialogHeader className="space-y-3 mb-1">
          <DialogTitle className="flex items-center gap-3 text-lg">
            {isCompleted ? (
              <>
                <Icons.Check className="h-6 w-6 text-green-500 flex-shrink-0" />
                Importação Concluída
              </>
            ) : isFailed ? (
              <>
                <Icons.AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                Importação Falhou
              </>
            ) : (
              <>
                <Spinner size={24} className="flex-shrink-0" />
                Processando Importação
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-base">
            {isCompleted
              ? "Seus dados foram importados com sucesso!"
              : isFailed
                ? "Ocorreu um erro durante o processamento"
                : phase}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Progress bar */}
          {!isFailed && (
            <div className="space-y-2.5">
              <Progress value={progress} className="h-3" />
              <p className="text-sm font-medium text-muted-foreground text-center">
                {progress}% concluído
              </p>
            </div>
          )}

          {/* Stats */}
          {importData && importData.status === "processing" && (
            <div className="grid grid-cols-2 gap-3 p-5 rounded-lg bg-muted/30">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">Ligas</p>
                <p className="text-2xl font-bold">{importData.total_leagues || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">Jogos PPST</p>
                <p className="text-2xl font-bold">
                  {importData.total_games_ppst || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">Jogos PPSR</p>
                <p className="text-2xl font-bold">
                  {importData.total_games_ppsr || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">Jogadores</p>
                <p className="text-2xl font-bold">
                  {(importData.total_players_ppst || 0) +
                    (importData.total_players_ppsr || 0)}
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {isFailed && importData.processing_errors && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
              <p className="font-semibold mb-2">Erro:</p>
              <p className="text-sm">
                {(importData.processing_errors as any)?.message ||
                  "Erro desconhecido"}
              </p>
            </div>
          )}

          {/* Completed stats */}
          {isCompleted && importData && (
            <div className="grid grid-cols-2 gap-3 p-5 rounded-lg bg-green-500/10">
              <div className="space-y-1">
                <p className="text-green-700/70 dark:text-green-300/70 text-xs font-medium">Ligas</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {importData.total_leagues || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-green-700/70 dark:text-green-300/70 text-xs font-medium">Total Jogos</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {(importData.total_games_ppst || 0) +
                    (importData.total_games_ppsr || 0)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-green-700/70 dark:text-green-300/70 text-xs font-medium">Jogadores PPST</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {importData.total_players_ppst || 0}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-green-700/70 dark:text-green-300/70 text-xs font-medium">Jogadores PPSR</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {importData.total_players_ppsr || 0}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Close button (only show when completed or failed) */}
        {(isCompleted || isFailed) && (
          <div className="flex justify-end pt-4">
            <Button
              variant={isFailed ? "destructive" : "default"}
              onClick={() => onOpenChange(false)}
              className="min-w-24"
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
