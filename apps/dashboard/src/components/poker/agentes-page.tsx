"use client";

import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@midpoker/ui/avatar";
import { Badge } from "@midpoker/ui/badge";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import { Button } from "@midpoker/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, RefreshCw, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { useEffect, useDeferredValue, useMemo, useRef, useState } from "react";

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
  ganhos?: number | null;
  taxa?: number | null;
  maos?: number | null;
};

const PAPEL_LABEL: Record<number, string> = {
  1: "Dono",
  2: "Gestor",
  4: "Super Agente",
  5: "Agente",
  10: "Membro",
};

type DbMember = {
  id: string;
  ppPokerId: string;
  nickname: string;
  isOnline: boolean;
  cashboxBalance: number;
  pppokerRole: number | null;
  ganhos: number;
  taxa: number;
  maos: number;
  avatarUrl: string;
  agenteUid: number | null;
  agenteNome: string;
  superAgenteUid: number | null;
  superAgenteNome: string;
};

function dbToLiveMember(p: DbMember): LiveMember & { dbId: string } {
  return {
    dbId: p.id,
    uid: Number(p.ppPokerId),
    nome: p.nickname,
    papel_num: p.pppokerRole ?? 10,
    papel: PAPEL_LABEL[p.pppokerRole ?? 10] ?? "Membro",
    avatar_url: p.avatarUrl,
    online: p.isOnline,
    saldo_caixa: p.cashboxBalance,
    agente_uid: p.agenteUid,
    agente_nome: p.agenteNome,
    super_agente_uid: p.superAgenteUid,
    super_agente_nome: p.superAgenteNome,
    ganhos: p.ganhos,
    taxa: p.taxa,
    maos: p.maos,
  };
}

function formatBalance(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function DownlineRow({ member }: { member: LiveMember }) {
  const initials = member.nome.slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.01] p-2 ml-4">
      <div className="relative flex-shrink-0">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background",
            member.online ? "bg-green-500" : "bg-gray-400",
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{member.nome}</p>
        <p className="text-[10px] text-muted-foreground font-mono">ID: {member.uid}</p>
      </div>
      <span
        className={cn(
          "font-mono text-xs",
          (member.saldo_caixa ?? 0) > 0 && "text-green-600",
          (member.saldo_caixa ?? 0) < 0 && "text-red-600",
          (member.saldo_caixa ?? 0) === 0 && "text-muted-foreground",
        )}
      >
        {formatBalance(member.saldo_caixa ?? 0)}
      </span>
    </div>
  );
}

function AgenteCard({
  agent,
  downlines,
}: {
  agent: LiveMember;
  downlines: LiveMember[];
}) {
  const [expanded, setExpanded] = useState(false);
  const initials = agent.nome.slice(0, 2).toUpperCase();
  const saldo = agent.saldo_caixa ?? 0;

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
              agent.online ? "bg-green-500" : "bg-gray-400",
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{agent.nome}</p>
          <p className="text-xs text-muted-foreground font-mono">ID: {agent.uid}</p>
          {agent.super_agente_nome && (
            <p className="truncate text-xs text-muted-foreground">
              SA: {agent.super_agente_nome}
            </p>
          )}
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
              className="h-5 px-1.5 text-[10px] border-cyan-500/20 bg-cyan-500/10 text-cyan-600"
            >
              {downlines.length} jogador{downlines.length !== 1 ? "es" : ""}
            </Badge>
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {expanded && downlines.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-white/5 p-2">
          {downlines.map((d) => (
            <DownlineRow key={d.uid} member={d} />
          ))}
        </div>
      )}
      {expanded && downlines.length === 0 && (
        <div className="border-t border-white/5 p-3 text-center">
          <p className="text-xs text-muted-foreground">Nenhum jogador vinculado</p>
        </div>
      )}
    </div>
  );
}

export function AgentesPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const deferredSearch = useDeferredValue(search);
  const didSync = useRef(false);

  // Cache-first: read from DB (instant)
  const { data, isLoading } = useQuery(
    trpc.poker.members.list.queryOptions({ pageSize: 500 }),
  );

  // Background sync mutation (no retries — bridge TCP can drop)
  const syncMutation = useMutation({
    ...trpc.poker.members.syncMembers.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.poker.members.list.queryKey(),
        });
      },
    }),
    retry: false,
  });

  // Auto-sync on mount
  useEffect(() => {
    if (!didSync.current) {
      didSync.current = true;
      syncMutation.mutate({});
    }
  }, []);

  const isSyncing = syncMutation.isPending;
  const syncFailed = syncMutation.isError;

  const allMembers = useMemo(
    () => (data?.data ?? []).map((p) => dbToLiveMember(p as unknown as DbMember)),
    [data],
  );

  const agents = useMemo(
    () => allMembers.filter((m) => m.papel_num === 5),
    [allMembers],
  );

  const downlinesMap = useMemo(() => {
    const map = new Map<number, LiveMember[]>();
    for (const agent of agents) {
      map.set(
        agent.uid,
        allMembers.filter((m) => m.agente_uid === agent.uid && m.papel_num === 10),
      );
    }
    return map;
  }, [agents, allMembers]);

  const filtered = useMemo(() => {
    let result = agents;

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
  }, [agents, deferredSearch, filter]);

  const stats = useMemo(() => {
    const online = agents.filter((m) => m.online).length;
    const saldoTotal = agents.reduce((sum, m) => sum + (m.saldo_caixa ?? 0), 0);
    return { total: agents.length, online, saldoTotal };
  }, [agents]);

  const handleRefresh = () => {
    syncMutation.mutate({});
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
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 flex-shrink-0">
            <Icons.Customers className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 leading-none">
            <p className="font-mono text-sm font-medium">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground truncate">Agentes</p>
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
            placeholder="Pesquisar agente por nome ou ID..."
            className="h-11 rounded-lg pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 flex-shrink-0"
          onClick={handleRefresh}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
        </Button>
        {syncFailed && (
          <span className="flex items-center gap-1 text-xs text-amber-500">
            <AlertCircle className="h-3 w-3" />
            Sync falhou
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: "todos", label: "Todos", count: agents.length },
          { key: "online", label: "Online", count: agents.filter((m) => m.online).length },
          { key: "positivo", label: "Saldo +", count: agents.filter((m) => (m.saldo_caixa ?? 0) > 0).length },
          { key: "negativo", label: "Saldo -", count: agents.filter((m) => (m.saldo_caixa ?? 0) < 0).length },
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
                {search ? "Nenhum agente encontrado" : "Nenhum agente neste filtro"}
              </p>
            </div>
          ) : (
            filtered.map((agent) => (
              <AgenteCard
                key={agent.uid}
                agent={agent}
                downlines={downlinesMap.get(agent.uid) ?? []}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
