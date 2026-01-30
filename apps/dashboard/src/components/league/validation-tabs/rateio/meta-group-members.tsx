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
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { useMemo, useState } from "react";
import type { AvailableLeague } from "./rateio-utils";

interface Member {
  id: string;
  super_union_id: number;
  display_name: string | null;
}

interface MetaGroupMembersProps {
  members: Member[];
  availableLeagues: AvailableLeague[];
  onRemove: (memberId: string) => void;
  onAdd: (data: { superUnionId: number; displayName?: string }) => void;
  isRemoving: boolean;
  isAdding: boolean;
}

export function MetaGroupMembers({
  members,
  availableLeagues,
  onRemove,
  onAdd,
  isRemoving,
  isAdding,
}: MetaGroupMembersProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [search, setSearch] = useState("");

  // Filter out leagues that are already members
  const memberSuIds = useMemo(
    () => new Set(members.map((m) => m.super_union_id)),
    [members],
  );

  const filteredLeagues = useMemo(() => {
    const available = availableLeagues.filter(
      (l) => !memberSuIds.has(l.ligaId),
    );
    if (!search.trim()) return available;
    const q = search.toLowerCase();
    return available.filter(
      (l) =>
        l.ligaNome.toLowerCase().includes(q) || String(l.ligaId).includes(q),
    );
  }, [availableLeagues, memberSuIds, search]);

  const handleSelect = (league: AvailableLeague) => {
    onAdd({
      superUnionId: league.ligaId,
      displayName: league.ligaNome,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Membros ({members.length})
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => {
            setSearch("");
            setShowAddDialog(true);
          }}
        >
          + Adicionar Liga
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {members.map((m) => (
          <Badge
            key={m.id}
            variant="outline"
            className="text-xs px-2 py-0.5 gap-1"
          >
            <span>{m.display_name || `Liga ${m.super_union_id}`}</span>
            <span className="text-muted-foreground text-[9px]">
              ({m.super_union_id})
            </span>
            <button
              type="button"
              className="ml-0.5 hover:text-red-500 transition-colors"
              onClick={() => onRemove(m.id)}
              disabled={isRemoving}
            >
              <Icons.Close className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        {members.length === 0 && (
          <span className="text-[10px] text-muted-foreground">
            Nenhuma liga adicionada
          </span>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Liga</DialogTitle>
            <DialogDescription>
              Selecione uma liga disponivel no import
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou ID..."
              className="h-8 text-sm"
            />

            <div className="max-h-[240px] overflow-y-auto space-y-1">
              {filteredLeagues.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  {availableLeagues.length === 0
                    ? "Nenhuma liga encontrada no import"
                    : "Todas as ligas ja foram adicionadas"}
                </p>
              )}
              {filteredLeagues.map((league) => (
                <button
                  key={league.ligaId}
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors text-left"
                  onClick={() => handleSelect(league)}
                  disabled={isAdding}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{league.ligaNome}</span>
                    <span className="text-[10px] text-muted-foreground">
                      ID: {league.ligaId}
                      {league.superUnionId != null &&
                        ` | SU: ${league.superUnionId}`}
                    </span>
                  </div>
                  <Icons.Plus className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
