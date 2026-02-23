"use client";

import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@midpoker/ui/avatar";
import { Badge } from "@midpoker/ui/badge";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import { Button } from "@midpoker/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, RefreshCw } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

type LiveMember = {
  uid: number;
  nome: string;
  papel_num: number;
  papel: string;
  avatar_url?: string;
  online: boolean;
  saldo_caixa?: number | null;
  credito_linha?: number;
  agente_uid?: number | null;
  agente_nome?: string;
  super_agente_uid?: number | null;
  super_agente_nome?: string;
  last_active_ts?: number;
  titulo?: string;
};

function formatTimeAgo(ts?: number): string {
  if (!ts || ts === 0) return "—";
  const now = Date.now() / 1000;
  const diff = now - ts;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function JogadorRow({ member }: { member: LiveMember }) {
  const initials = member.nome.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
            member.online ? "bg-green-500" : "bg-gray-400",
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.nome}</p>
        <p className="text-xs text-muted-foreground font-mono">
          ID: {member.uid}
        </p>
        {member.agente_nome && (
          <p className="truncate text-xs text-muted-foreground">
            Agente: {member.agente_nome}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground">
          {member.online ? "Online" : formatTimeAgo(member.last_active_ts)}
        </span>
        {!member.agente_uid && (
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[10px] border-orange-500/20 bg-orange-500/10 text-orange-600"
          >
            Sem agente
          </Badge>
        )}
      </div>
    </div>
  );
}

export function JogadoresPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const deferredSearch = useDeferredValue(search);

  const { data, isLoading, isFetching } = useQuery(
    trpc.poker.members.getLive.queryOptions({}),
  );

  const allMembers = useMemo(() => {
    const members = (data?.members ?? []) as LiveMember[];
    return members.filter((m) => m.papel_num === 10);
  }, [data]);

  const filtered = useMemo(() => {
    let result = allMembers;

    // Search
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.nome.toLowerCase().includes(q) ||
          String(m.uid).includes(q),
      );
    }

    // Filter
    switch (filter) {
      case "online":
        return result.filter((m) => m.online);
      case "sem_agente":
        return result.filter((m) => !m.agente_uid);
      default:
        return result;
    }
  }, [allMembers, deferredSearch, filter]);

  const stats = useMemo(() => {
    const online = allMembers.filter((m) => m.online).length;
    const comAgente = allMembers.filter((m) => m.agente_uid).length;
    return { total: allMembers.length, online, comAgente };
  }, [allMembers]);

  const handleRefresh = () => {
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
    <div className="flex flex-col gap-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
            <Icons.Customers className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 leading-none">
            <p className="font-mono text-sm font-medium">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground truncate">Total</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500/10 text-green-600 flex-shrink-0">
            <Icons.Customers className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 leading-none">
            <p className="font-mono text-sm font-medium text-green-600">{stats.online}</p>
            <p className="text-[10px] text-muted-foreground truncate">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 flex-shrink-0">
            <Icons.Customers className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 leading-none">
            <p className="font-mono text-sm font-medium text-blue-600">{stats.comAgente}</p>
            <p className="text-[10px] text-muted-foreground truncate">Com agente</p>
          </div>
        </div>
      </div>

      {/* Search + Refresh */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome ou ID..."
            className="h-11 rounded-lg pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 flex-shrink-0"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: "todos", label: "Todos", count: allMembers.length },
          { key: "online", label: "Online", count: allMembers.filter((m) => m.online).length },
          { key: "sem_agente", label: "Sem agente", count: allMembers.filter((m) => !m.agente_uid).length },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
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

      {/* List */}
      <ScrollArea className="h-[calc(100vh-340px)]">
        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Icons.Customers className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search ? "Nenhum jogador encontrado" : "Nenhum jogador neste filtro"}
              </p>
            </div>
          ) : (
            filtered.map((member) => (
              <JogadorRow key={member.uid} member={member} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
