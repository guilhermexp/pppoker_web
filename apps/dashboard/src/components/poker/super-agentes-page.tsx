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
import { Loader2, Search, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
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
  titulo?: string;
};

function formatBalance(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function MiniMemberRow({ member }: { member: LiveMember }) {
  const initials = member.nome.slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.01] p-2">
      <div className="relative flex-shrink-0">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-background",
            member.online ? "bg-green-500" : "bg-gray-400",
          )}
        />
      </div>
      <span className="truncate text-xs">{member.nome}</span>
      <span className="text-[10px] text-muted-foreground font-mono ml-auto flex-shrink-0">
        {member.uid}
      </span>
    </div>
  );
}

function AgenteSubCard({
  agent,
  jogadores,
}: {
  agent: LiveMember;
  jogadores: LiveMember[];
}) {
  const [expanded, setExpanded] = useState(false);
  const initials = agent.nome.slice(0, 2).toUpperCase();

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.01] overflow-hidden ml-4">
      <button
        type="button"
        className="flex w-full items-center gap-2 p-2 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="relative flex-shrink-0">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background",
              agent.online ? "bg-green-500" : "bg-gray-400",
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{agent.nome}</p>
          <p className="text-[10px] text-muted-foreground font-mono">ID: {agent.uid}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className={cn(
              "font-mono text-xs",
              (agent.saldo_caixa ?? 0) > 0 && "text-green-600",
              (agent.saldo_caixa ?? 0) < 0 && "text-red-600",
              (agent.saldo_caixa ?? 0) === 0 && "text-muted-foreground",
            )}
          >
            {formatBalance(agent.saldo_caixa ?? 0)}
          </span>
          <Badge
            variant="secondary"
            className="h-4 px-1 text-[9px] border-white/10 bg-white/[0.06] text-muted-foreground"
          >
            {jogadores.length}
          </Badge>
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && jogadores.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-white/5 p-2 ml-2">
          {jogadores.map((j) => (
            <MiniMemberRow key={j.uid} member={j} />
          ))}
        </div>
      )}
    </div>
  );
}

function SuperAgenteCard({
  sa,
  agentesVinculados,
  jogadoresPorAgente,
}: {
  sa: LiveMember;
  agentesVinculados: LiveMember[];
  jogadoresPorAgente: Map<number, LiveMember[]>;
}) {
  const [expanded, setExpanded] = useState(false);
  const initials = sa.nome.slice(0, 2).toUpperCase();
  const saldo = sa.saldo_caixa ?? 0;
  const totalJogadores = agentesVinculados.reduce(
    (sum, a) => sum + (jogadoresPorAgente.get(a.uid)?.length ?? 0),
    0,
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
              sa.online ? "bg-green-500" : "bg-gray-400",
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{sa.nome}</p>
          <p className="text-xs text-muted-foreground font-mono">ID: {sa.uid}</p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={cn(
              "font-mono text-sm font-medium",
              saldo > 0 && "text-green-600",
              saldo < 0 && "text-red-600",
              saldo === 0 && "text-muted-foreground",
            )}
          >
            {formatBalance(saldo)}
          </span>
          <div className="flex items-center gap-1">
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px] border-blue-500/20 bg-blue-500/10 text-blue-600"
            >
              {agentesVinculados.length} ag
            </Badge>
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px] border-white/10 bg-white/[0.06] text-muted-foreground"
            >
              {totalJogadores} jog
            </Badge>
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-1 border-t border-white/5 p-2">
          {agentesVinculados.length === 0 ? (
            <div className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Nenhum agente vinculado</p>
            </div>
          ) : (
            agentesVinculados.map((agent) => (
              <AgenteSubCard
                key={agent.uid}
                agent={agent}
                jogadores={jogadoresPorAgente.get(agent.uid) ?? []}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function SuperAgentesPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const deferredSearch = useDeferredValue(search);

  const { data, isLoading, isFetching } = useQuery(
    trpc.poker.members.getLive.queryOptions({}),
  );

  const allMembers = useMemo(() => (data?.members ?? []) as LiveMember[], [data]);

  const superAgentes = useMemo(
    () => allMembers.filter((m) => m.papel_num === 4),
    [allMembers],
  );

  const agentesMap = useMemo(() => {
    const map = new Map<number, LiveMember[]>();
    const agentes = allMembers.filter((m) => m.papel_num === 5);
    for (const sa of superAgentes) {
      map.set(
        sa.uid,
        agentes.filter((a) => a.super_agente_uid === sa.uid),
      );
    }
    return map;
  }, [superAgentes, allMembers]);

  const jogadoresPorAgente = useMemo(() => {
    const map = new Map<number, LiveMember[]>();
    const jogadores = allMembers.filter((m) => m.papel_num === 10);
    const agentes = allMembers.filter((m) => m.papel_num === 5);
    for (const agent of agentes) {
      map.set(
        agent.uid,
        jogadores.filter((j) => j.agente_uid === agent.uid),
      );
    }
    return map;
  }, [allMembers]);

  const filtered = useMemo(() => {
    let result = superAgentes;

    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      result = result.filter(
        (m) => m.nome.toLowerCase().includes(q) || String(m.uid).includes(q),
      );
    }

    switch (filter) {
      case "online":
        return result.filter((m) => m.online);
      case "positivo":
        return result.filter((m) => (m.saldo_caixa ?? 0) > 0);
      case "negativo":
        return result.filter((m) => (m.saldo_caixa ?? 0) < 0);
      default:
        return result;
    }
  }, [superAgentes, deferredSearch, filter]);

  const stats = useMemo(() => {
    const online = superAgentes.filter((m) => m.online).length;
    const saldoTotal = superAgentes.reduce((sum, m) => sum + (m.saldo_caixa ?? 0), 0);
    return { total: superAgentes.length, online, saldoTotal };
  }, [superAgentes]);

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
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 flex-shrink-0">
            <Icons.Customers className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 leading-none">
            <p className="font-mono text-sm font-medium">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground truncate">Super Agentes</p>
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
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
            <Icons.Currency className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 leading-none">
            <p className={cn(
              "font-mono text-sm font-medium",
              stats.saldoTotal > 0 && "text-green-600",
              stats.saldoTotal < 0 && "text-red-600",
              stats.saldoTotal === 0 && "text-muted-foreground",
            )}>
              {formatBalance(stats.saldoTotal)}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">Saldo total</p>
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
            placeholder="Pesquisar super agente por nome ou ID..."
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
          { key: "todos", label: "Todos", count: superAgentes.length },
          { key: "online", label: "Online", count: superAgentes.filter((m) => m.online).length },
          { key: "positivo", label: "Saldo +", count: superAgentes.filter((m) => (m.saldo_caixa ?? 0) > 0).length },
          { key: "negativo", label: "Saldo -", count: superAgentes.filter((m) => (m.saldo_caixa ?? 0) < 0).length },
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
                {search ? "Nenhum super agente encontrado" : "Nenhum super agente neste filtro"}
              </p>
            </div>
          ) : (
            filtered.map((sa) => (
              <SuperAgenteCard
                key={sa.uid}
                sa={sa}
                agentesVinculados={agentesMap.get(sa.uid) ?? []}
                jogadoresPorAgente={jogadoresPorAgente}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
