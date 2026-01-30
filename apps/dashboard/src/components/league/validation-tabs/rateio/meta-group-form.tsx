"use client";

import { Badge } from "@midpoker/ui/badge";
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
import type { AvailableLeague } from "./rateio-utils";

interface MetaGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    metaPercent: number;
    description?: string;
    memberIds?: { superUnionId: number; displayName?: string }[];
  }) => void;
  isPending: boolean;
  initialData?: {
    name: string;
    metaPercent: number;
    description?: string | null;
  };
  mode: "create" | "edit";
  availableLeagues?: AvailableLeague[];
}

export function MetaGroupForm({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  initialData,
  mode,
  availableLeagues,
}: MetaGroupFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [metaPercent, setMetaPercent] = useState(initialData?.metaPercent ?? 0);
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<Set<number>>(
    new Set(),
  );
  const [leagueSearch, setLeagueSearch] = useState("");

  const filteredLeagues = useMemo(() => {
    if (!availableLeagues) return [];
    if (!leagueSearch.trim()) return availableLeagues;
    const q = leagueSearch.toLowerCase();
    return availableLeagues.filter(
      (l) =>
        l.ligaNome.toLowerCase().includes(q) || String(l.ligaId).includes(q),
    );
  }, [availableLeagues, leagueSearch]);

  const toggleLeague = (ligaId: number) => {
    setSelectedLeagueIds((prev) => {
      const next = new Set(prev);
      if (next.has(ligaId)) {
        next.delete(ligaId);
      } else {
        next.add(ligaId);
      }
      return next;
    });
  };

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return;
    const memberIds =
      mode === "create" && selectedLeagueIds.size > 0
        ? Array.from(selectedLeagueIds).map((ligaId) => {
            const league = availableLeagues?.find((l) => l.ligaId === ligaId);
            return {
              superUnionId: ligaId,
              displayName: league?.ligaNome,
            };
          })
        : undefined;
    onSubmit({
      name: name.trim(),
      metaPercent,
      description: description.trim() || undefined,
      memberIds,
    });
  }, [name, metaPercent, description, selectedLeagueIds, availableLeagues, mode, onSubmit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="p-6 space-y-6">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo Grupo Meta" : "Editar Grupo Meta"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Defina o nome e percentual de meta para o grupo"
              : "Altere os dados do grupo"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Nome</Label>
            <Input
              id="groupName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Grupo Brasil"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupPercent">Percentual da Meta (%)</Label>
            <div className="relative">
              <Input
                id="groupPercent"
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
              Percentual do GTD total que este grupo deve atingir
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="groupDescription">
              Descricao{" "}
              <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="groupDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Ligas brasileiras"
            />
          </div>

          {/* League selection (create mode only) */}
          {mode === "create" && availableLeagues && availableLeagues.length > 0 && (
            <div className="space-y-2">
              <Label>
                Ligas{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              {selectedLeagueIds.size > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {Array.from(selectedLeagueIds).map((ligaId) => {
                    const league = availableLeagues.find(
                      (l) => l.ligaId === ligaId,
                    );
                    return (
                      <Badge
                        key={ligaId}
                        variant="secondary"
                        className="text-[10px] font-normal cursor-pointer hover:bg-destructive/20"
                        onClick={() => toggleLeague(ligaId)}
                      >
                        {league?.ligaNome ?? `Liga ${ligaId}`}
                        <span className="ml-1 text-muted-foreground">x</span>
                      </Badge>
                    );
                  })}
                </div>
              )}
              {availableLeagues.length > 5 && (
                <Input
                  value={leagueSearch}
                  onChange={(e) => setLeagueSearch(e.target.value)}
                  placeholder="Buscar liga..."
                  className="h-7 text-xs"
                />
              )}
              <div className="max-h-[140px] overflow-y-auto border rounded-md divide-y divide-border/50">
                {filteredLeagues.map((league) => {
                  const isSelected = selectedLeagueIds.has(league.ligaId);
                  return (
                    <button
                      key={league.ligaId}
                      type="button"
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-muted/50 transition-colors ${isSelected ? "bg-muted/30" : ""}`}
                      onClick={() => toggleLeague(league.ligaId)}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"}`}
                      >
                        {isSelected && (
                          <span className="text-primary-foreground text-[8px]">
                            ✓
                          </span>
                        )}
                      </div>
                      <span className="font-medium">{league.ligaNome}</span>
                      <span className="text-muted-foreground text-[10px]">
                        ({league.ligaId})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
                ? "Criar Grupo"
                : "Salvar"}
          </Button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
