"use client";

import { Button } from "@midpoker/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@midpoker/ui/dialog";
import { Input } from "@midpoker/ui/input";
import { Label } from "@midpoker/ui/label";
import { useCallback, useState } from "react";

interface TimeSlotFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    hourStart: number;
    hourEnd: number;
    metaPercent: number;
  }) => void;
  isPending: boolean;
  initialData?: {
    name: string;
    hourStart: number;
    hourEnd: number;
    metaPercent: number;
  };
  mode: "create" | "edit";
}

export function TimeSlotForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  initialData,
  mode,
}: TimeSlotFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [hourStart, setHourStart] = useState(initialData?.hourStart ?? 0);
  const [hourEnd, setHourEnd] = useState(initialData?.hourEnd ?? 23);
  const [metaPercent, setMetaPercent] = useState(initialData?.metaPercent ?? 0);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      hourStart,
      hourEnd,
      metaPercent,
    });
  }, [name, hourStart, hourEnd, metaPercent, onSubmit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo Time Slot" : "Editar Time Slot"}
          </DialogTitle>
          <DialogDescription>
            Percentual diferenciado por faixa horaria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="slotName">Nome</Label>
            <Input
              id="slotName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Prime Time"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="hourStart">Hora Inicio</Label>
              <Input
                id="hourStart"
                type="number"
                value={hourStart}
                onChange={(e) => setHourStart(Number(e.target.value))}
                min={0}
                max={23}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourEnd">Hora Fim</Label>
              <Input
                id="hourEnd"
                type="number"
                value={hourEnd}
                onChange={(e) => setHourEnd(Number(e.target.value))}
                min={0}
                max={23}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slotPercent">Percentual da Meta (%)</Label>
            <div className="relative">
              <Input
                id="slotPercent"
                type="number"
                value={metaPercent}
                onChange={(e) => setMetaPercent(Number(e.target.value))}
                min={0}
                max={100}
                step={0.01}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Override do percentual do grupo nessa faixa horaria
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending
              ? "Salvando..."
              : mode === "create"
                ? "Criar Slot"
                : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
