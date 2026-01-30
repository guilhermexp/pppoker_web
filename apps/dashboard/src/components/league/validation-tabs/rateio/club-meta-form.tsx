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
import { useCallback, useMemo, useState } from "react";
import type { AvailableClub } from "./rateio-utils";

interface ClubMetaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    superUnionId: number;
    clubId: number;
    weekYear: number;
    weekNumber: number;
    dayOfWeek?: number | null;
    hourStart?: number | null;
    hourEnd?: number | null;
    targetType: "players" | "buyins";
    targetValue: number;
    referenceBuyin?: number | null;
    note?: string;
  }) => void;
  isPending: boolean;
  weekYear: number;
  weekNumber: number;
  availableClubs: AvailableClub[];
  initialData?: {
    superUnionId: number;
    clubId: number;
    dayOfWeek?: number | null;
    hourStart?: number | null;
    hourEnd?: number | null;
    targetType: "players" | "buyins";
    targetValue: number;
    referenceBuyin?: number | null;
    note?: string;
  };
  mode: "create" | "edit";
}

const DAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
];

export function ClubMetaForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  weekYear,
  weekNumber,
  availableClubs,
  initialData,
  mode,
}: ClubMetaFormProps) {
  const [selectedClubKey, setSelectedClubKey] = useState(() => {
    if (initialData) {
      return `${initialData.superUnionId}-${initialData.clubId}`;
    }
    return "";
  });
  const [dayOfWeek, setDayOfWeek] = useState<string>(
    initialData?.dayOfWeek != null ? String(initialData.dayOfWeek) : "",
  );
  const [hourStart, setHourStart] = useState<string>(
    initialData?.hourStart != null ? String(initialData.hourStart) : "",
  );
  const [hourEnd, setHourEnd] = useState<string>(
    initialData?.hourEnd != null ? String(initialData.hourEnd) : "",
  );
  const [targetType, setTargetType] = useState<"players" | "buyins">(
    initialData?.targetType ?? "players",
  );
  const [targetValue, setTargetValue] = useState(initialData?.targetValue ?? 0);
  const [referenceBuyin, setReferenceBuyin] = useState<string>(
    initialData?.referenceBuyin != null
      ? String(initialData.referenceBuyin)
      : "",
  );
  const [note, setNote] = useState(initialData?.note ?? "");

  // Group clubs by liga for organized display
  const clubsByLiga = useMemo(() => {
    const grouped = new Map<string, AvailableClub[]>();
    for (const club of availableClubs) {
      const key = club.ligaNome;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(club);
    }
    return grouped;
  }, [availableClubs]);

  const selectedClub = useMemo(() => {
    if (!selectedClubKey) return null;
    return (
      availableClubs.find(
        (c) => `${c.ligaId}-${c.clubeId}` === selectedClubKey,
      ) ?? null
    );
  }, [selectedClubKey, availableClubs]);

  const handleSubmit = useCallback(() => {
    if (!selectedClub || targetValue <= 0) return;
    onSubmit({
      superUnionId: selectedClub.ligaId,
      clubId: selectedClub.clubeId,
      weekYear,
      weekNumber,
      dayOfWeek: dayOfWeek !== "" ? Number(dayOfWeek) : null,
      hourStart: hourStart !== "" ? Number(hourStart) : null,
      hourEnd: hourEnd !== "" ? Number(hourEnd) : null,
      targetType,
      targetValue,
      referenceBuyin: referenceBuyin !== "" ? Number(referenceBuyin) : null,
      note: note.trim() || undefined,
    });
  }, [
    selectedClub,
    weekYear,
    weekNumber,
    dayOfWeek,
    hourStart,
    hourEnd,
    targetType,
    targetValue,
    referenceBuyin,
    note,
    onSubmit,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova Meta de Clube" : "Editar Meta de Clube"}
          </DialogTitle>
          <DialogDescription>
            Semana {weekNumber}/{weekYear}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="clubSelect">Clube</Label>
            <select
              id="clubSelect"
              value={selectedClubKey}
              onChange={(e) => setSelectedClubKey(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={mode === "edit"}
            >
              <option value="">Selecione um clube...</option>
              {Array.from(clubsByLiga.entries()).map(([ligaNome, clubs]) => (
                <optgroup key={ligaNome} label={ligaNome}>
                  {clubs.map((club) => (
                    <option
                      key={`${club.ligaId}-${club.clubeId}`}
                      value={`${club.ligaId}-${club.clubeId}`}
                    >
                      {club.clubeNome} (ID: {club.clubeId})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedClub && (
              <p className="text-[10px] text-muted-foreground">
                Liga: {selectedClub.ligaNome} ({selectedClub.ligaId}) | Clube:{" "}
                {selectedClub.clubeNome} ({selectedClub.clubeId})
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dayOfWeek">
              Dia da semana{" "}
              <span className="text-muted-foreground">(vazio = todos)</span>
            </Label>
            <select
              id="dayOfWeek"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos os dias</option>
              {DAY_LABELS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="metaHourStart">
                Hora inicio{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="metaHourStart"
                type="number"
                value={hourStart}
                onChange={(e) => setHourStart(e.target.value)}
                min={0}
                max={23}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaHourEnd">
                Hora fim{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="metaHourEnd"
                type="number"
                value={hourEnd}
                onChange={(e) => setHourEnd(e.target.value)}
                min={0}
                max={23}
                placeholder="23"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Meta</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={targetType === "players" ? "default" : "outline"}
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => setTargetType("players")}
              >
                Jogadores
              </Button>
              <Button
                type="button"
                variant={targetType === "buyins" ? "default" : "outline"}
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => setTargetType("buyins")}
              >
                Buyins (R$)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetValue">
              {targetType === "players"
                ? "Quantidade de jogadores"
                : "Valor em buyins (R$)"}
            </Label>
            <Input
              id="targetValue"
              type="number"
              value={targetValue || ""}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              min={0}
              step={targetType === "players" ? 1 : 0.01}
            />
          </div>

          {targetType === "buyins" && (
            <div className="space-y-2">
              <Label htmlFor="referenceBuyin">
                Buyin referencia{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="referenceBuyin"
                type="number"
                value={referenceBuyin}
                onChange={(e) => setReferenceBuyin(e.target.value)}
                min={0}
                step={0.01}
                placeholder="Ex: 50.00"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="metaNote">
              Nota <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="metaNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Meta minima prime time"
            />
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
          <Button
            onClick={handleSubmit}
            disabled={isPending || !selectedClub || targetValue <= 0}
          >
            {isPending
              ? "Salvando..."
              : mode === "create"
                ? "Criar Meta"
                : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
