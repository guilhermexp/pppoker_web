"use client";

import { useTRPC } from "@/trpc/client";
import { formatPercentPrecise as formatPercent } from "@/utils/format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@midpoker/ui/alert-dialog";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { Label } from "@midpoker/ui/label";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type AgentFromApp = {
  id: string;
  ppPokerId: string;
  nickname: string;
  memoName: string | null;
  type: string;
  rakebackPercent: number;
  spreadsheetPercent: number | null;
};

type RakebackEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AgentFromApp | null;
  currentPercent: number;
  onConfirmTemporary: (agentId: string, percent: number) => void;
};

export function RakebackEditDialog({
  open,
  onOpenChange,
  agent,
  currentPercent,
  onConfirmTemporary,
}: RakebackEditDialogProps) {
  const trpc = useTRPC();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPercent, setNewPercent] = useState(currentPercent);

  // Reset newPercent when dialog opens with new agent
  useEffect(() => {
    if (open && agent) {
      setNewPercent(currentPercent);
    }
  }, [open, agent, currentPercent]);

  const updateRakebackMutation = useMutation(
    trpc.poker.players.updateRakeback.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Rakeback atualizado",
          description: `O rakeback de ${agent?.nickname} foi atualizado permanentemente para ${formatPercent(newPercent)}`,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.weekPeriods.getCloseWeekData.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.getAll.queryKey(),
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast({
          title: "Erro ao atualizar rakeback",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const handlePermanent = () => {
    if (!agent) return;
    updateRakebackMutation.mutate({
      id: agent.id,
      rakebackPercent: newPercent,
    });
  };

  const handleTemporary = () => {
    if (!agent) return;
    onConfirmTemporary(agent.id, newPercent);
    toast({
      title: "Rakeback temporário aplicado",
      description: `${formatPercent(newPercent)} será usado apenas no fechamento desta semana`,
    });
    onOpenChange(false);
  };

  if (!agent) return null;

  const hasChanges = newPercent !== currentPercent;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icons.Edit className="w-4 h-4" />
            Editar Rakeback
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-1">
            <span className="block">
              Agente: <strong>{agent.nickname}</strong>
            </span>
            <span className="block text-xs">ID: {agent.ppPokerId}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          {/* Current values */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Valor atual (sistema):
            </span>
            <span className="font-mono font-medium">
              {formatPercent(agent.rakebackPercent)}
            </span>
          </div>

          {agent.spreadsheetPercent !== null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor na planilha:</span>
              <span className="font-mono text-orange-500">
                {formatPercent(agent.spreadsheetPercent)}
              </span>
            </div>
          )}

          {/* Input for new value */}
          <div className="space-y-2">
            <Label htmlFor="newPercent">Novo valor (%)</Label>
            <div className="relative">
              <Input
                id="newPercent"
                type="number"
                value={newPercent}
                onChange={(e) => setNewPercent(Number(e.target.value))}
                min={0}
                max={100}
                step={0.1}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">Apenas esta semana:</strong>{" "}
              Aplica o % somente neste fechamento. O cadastro do agente não será
              alterado.
            </p>
            <p>
              <strong className="text-foreground">
                Salvar permanentemente:
              </strong>{" "}
              Atualiza o cadastro do agente. Todos os fechamentos futuros usarão
              este valor.
            </p>
          </div>
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel disabled={updateRakebackMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleTemporary}
            disabled={!hasChanges || updateRakebackMutation.isPending}
          >
            Apenas esta semana
          </Button>
          <AlertDialogAction
            onClick={handlePermanent}
            disabled={!hasChanges || updateRakebackMutation.isPending}
          >
            {updateRakebackMutation.isPending ? (
              <>
                <Icons.Refresh className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar permanentemente"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
