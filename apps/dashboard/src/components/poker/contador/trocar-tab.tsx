"use client";

import { useLastUpdate } from "@/hooks/use-last-update";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Checkbox } from "@midpoker/ui/checkbox";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, RefreshCw, Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { ChipTransferDialog } from "./chip-transfer-dialog";
import { ContadorStats } from "./contador-stats";
import { MemberRow } from "./member-row";
import type { ClubInfo, LiveMember } from "./types";

export function TrocarTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"nome" | "saldo">("nome");
  const [filter, setFilter] = useState("todos");
  const [dialogMode, setDialogMode] = useState<"send" | "withdraw">("send");
  const [dialogOpen, setDialogOpen] = useState(false);

  const deferredSearch = useDeferredValue(search);

  const { data, isLoading, isFetching, isError, dataUpdatedAt } = useQuery(
    trpc.poker.members.getLive.queryOptions(
      { q: deferredSearch || undefined },
      { refetchInterval: 15_000 },
    ),
  );
  const lastUpdate = useLastUpdate(dataUpdatedAt);

  const allMembers = (data?.members ?? []) as LiveMember[];
  const clubInfo = (data as any)?.clubInfo as ClubInfo | undefined;
  const loggedInUid = (data as any)?.loggedInUid as number | undefined;

  // Sort
  const sorted = useMemo(() => {
    const arr = [...allMembers];
    if (sortBy === "saldo") {
      arr.sort((a, b) => (b.saldo_caixa ?? 0) - (a.saldo_caixa ?? 0));
    } else {
      arr.sort((a, b) => a.nome.localeCompare(b.nome));
    }
    return arr;
  }, [allMembers, sortBy]);

  // Filter
  const members = useMemo(() => {
    switch (filter) {
      case "online":
        return sorted.filter((m) => m.online);
      case "agentes":
        return sorted.filter(
          (m) =>
            m.papel === "Agente" ||
            m.papel === "Super Agente" ||
            m.papel === "Gestor",
        );
      case "positivo":
        return sorted.filter((m) => (m.saldo_caixa ?? 0) > 0);
      case "negativo":
        return sorted.filter((m) => (m.saldo_caixa ?? 0) < 0);
      default:
        return sorted;
    }
  }, [sorted, filter]);

  const selectedMembers = useMemo(
    () => members.filter((m) => selectedIds.has(m.uid)),
    [members, selectedIds],
  );

  const toggleMember = (uid: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === members.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map((m) => m.uid)));
    }
  };

  const openDialog = (mode: "send" | "withdraw") => {
    setDialogMode(mode);
    setDialogOpen(true);
  };

  const handleTransferSuccess = () => {
    setSelectedIds(new Set());
    queryClient.invalidateQueries({
      queryKey: trpc.poker.members.getLive.queryKey(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Error banner */}
      {isError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              Não foi possível conectar ao PPPoker
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Verifique se o bridge está online e tente novamente.
          </p>
        </div>
      )}

      {/* Stats */}
      <ContadorStats
        members={allMembers}
        clubInfo={clubInfo}
        loggedInUid={loggedInUid}
      />
      {lastUpdate && (
        <p className="text-[10px] text-muted-foreground text-right -mt-1">
          Atualizado {lastUpdate}
        </p>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome, apelido ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 rounded-lg text-sm"
        />
      </div>

      {/* Meta / controls row */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-medium text-foreground text-sm">
            Membro: {allMembers.length}
          </span>
          <span className="inline-flex items-center gap-2">
            <Checkbox
              checked={
                selectedIds.size === members.length && members.length > 0
              }
              onCheckedChange={toggleAll}
            />
            <span className="text-xs">Selecionados: {selectedIds.size}</span>
          </span>
          {isFetching && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setSortBy(sortBy === "nome" ? "saldo" : "nome")}
          >
            {sortBy === "nome" ? "Nome" : "Saldo"}
            <Icons.ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: "todos", label: "Todos", count: sorted.length },
          {
            key: "online",
            label: "Online",
            count: sorted.filter((m) => m.online).length,
          },
          {
            key: "agentes",
            label: "Agentes",
            count: sorted.filter(
              (m) =>
                m.papel === "Agente" ||
                m.papel === "Super Agente" ||
                m.papel === "Gestor",
            ).length,
          },
          {
            key: "positivo",
            label: "Positivo",
            count: sorted.filter((m) => (m.saldo_caixa ?? 0) > 0).length,
          },
          {
            key: "negativo",
            label: "Negativo",
            count: sorted.filter((m) => (m.saldo_caixa ?? 0) < 0).length,
          },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              setFilter(f.key);
              setSelectedIds(new Set());
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted/80",
            )}
          >
            {f.label}
            <span className="opacity-70">({f.count})</span>
          </button>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <Badge variant="secondary" className="w-fit text-xs">
          {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
        </Badge>
      )}

      {/* Member list */}
      <div className="flex flex-col flex-1 overflow-y-auto border-t border-border">
        {members.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Icons.Customers className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {search
                ? "Nenhum membro encontrado"
                : "Nenhum membro neste filtro"}
            </p>
          </div>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member.uid}
              member={member}
              isSelected={selectedIds.has(member.uid)}
              onToggle={() => toggleMember(member.uid)}
            />
          ))
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
        <Button
          className="h-10 text-sm"
          variant="outline"
          disabled={selectedIds.size === 0}
          onClick={() => openDialog("send")}
        >
          Enviar fichas
        </Button>
        <Button
          className="h-10 text-sm"
          disabled={selectedIds.size === 0}
          onClick={() => openDialog("withdraw")}
        >
          Resgatar fichas
        </Button>
      </div>

      {/* Transfer dialog */}
      <ChipTransferDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        selectedMembers={selectedMembers}
        onSuccess={handleTransferSuccess}
      />
    </div>
  );
}
