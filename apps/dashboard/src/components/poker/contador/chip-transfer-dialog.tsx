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
import { Input } from "@midpoker/ui/input";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { LiveMember } from "./types";

export interface ChipTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "send" | "withdraw";
  selectedMembers: LiveMember[];
  onSuccess: () => void;
}

export function ChipTransferDialog({
  open,
  onOpenChange,
  mode,
  selectedMembers,
  onSuccess,
}: ChipTransferDialogProps) {
  const trpc = useTRPC();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<
    { nome: string; success: boolean; error?: string }[]
  >([]);

  const sendMutation = useMutation(
    trpc.poker.pppoker.sendChips.mutationOptions(),
  );
  const withdrawMutation = useMutation(
    trpc.poker.pppoker.withdrawChips.mutationOptions(),
  );

  const parsedAmount = Number.parseInt(amount, 10);
  const isValid = !Number.isNaN(parsedAmount) && parsedAmount > 0;

  const handleSubmit = async () => {
    if (!isValid || selectedMembers.length === 0) return;
    setProcessing(true);
    setResults([]);

    const newResults: typeof results = [];

    for (const member of selectedMembers) {
      try {
        const mutation = mode === "send" ? sendMutation : withdrawMutation;
        await mutation.mutateAsync({
          targetPlayerId: member.uid,
          amount: parsedAmount,
        });
        newResults.push({ nome: member.nome, success: true });
      } catch (err) {
        newResults.push({
          nome: member.nome,
          success: false,
          error: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    setResults(newResults);
    setProcessing(false);

    const successCount = newResults.filter((r) => r.success).length;
    const failCount = newResults.filter((r) => !r.success).length;

    if (successCount > 0) {
      toast({
        title: mode === "send" ? "Fichas enviadas" : "Fichas resgatadas",
        description: `${successCount} jogador${successCount > 1 ? "es" : ""} processado${successCount > 1 ? "s" : ""}${failCount > 0 ? `, ${failCount} erro${failCount > 1 ? "s" : ""}` : ""}`,
      });
      onSuccess();
    }

    if (successCount === selectedMembers.length) {
      setTimeout(() => {
        onOpenChange(false);
        setAmount("");
        setResults([]);
      }, 1500);
    }
  };

  const handleClose = () => {
    if (!processing) {
      onOpenChange(false);
      setAmount("");
      setResults([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "send" ? "Enviar fichas" : "Resgatar fichas"}
          </DialogTitle>
          <DialogDescription>
            {selectedMembers.length === 1
              ? `${selectedMembers[0]!.nome} (ID: ${selectedMembers[0]!.uid})`
              : `${selectedMembers.length} jogadores selecionados`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantidade</label>
            <Input
              type="number"
              placeholder="Ex: 10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={processing}
              min={1}
            />
          </div>

          {selectedMembers.length <= 5 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Jogadores:</p>
              {selectedMembers.map((m) => {
                const result = results.find((r) => r.nome === m.nome);
                return (
                  <div
                    key={m.uid}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {m.nome}{" "}
                      <span className="text-muted-foreground font-mono text-xs">
                        ({m.uid})
                      </span>
                    </span>
                    {result && (
                      <span
                        className={
                          result.success ? "text-green-600" : "text-red-600"
                        }
                      >
                        {result.success ? "OK" : "Erro"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {results.some((r) => !r.success) && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-xs text-red-700 dark:text-red-400">
              {results
                .filter((r) => !r.success)
                .map((r) => (
                  <p key={r.nome}>
                    {r.nome}: {r.error}
                  </p>
                ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={processing}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || processing || results.length > 0}
          >
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "send" ? "Enviar" : "Resgatar"}{" "}
            {isValid && `${parsedAmount.toLocaleString("pt-BR")} fichas`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
