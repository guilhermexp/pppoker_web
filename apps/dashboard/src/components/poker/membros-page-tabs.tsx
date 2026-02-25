"use client";

import { ErrorBoundary } from "@/components/error-boundary";
import { usePokerMembrosParams } from "@/hooks/use-poker-membros-params";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@midpoker/ui/avatar";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@midpoker/ui/dropdown-menu";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@midpoker/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Search, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { Suspense, useEffect, useDeferredValue, useMemo, useRef, useState } from "react";
import { CreditRequestsList } from "./credit-requests-list";
import { MemberDetailView } from "./member-detail-view";
import { PendingMembersList } from "./pending-members-list";

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
  titulo?: string;
  last_active_ts?: number;
  ganhos?: number | null;
  taxa?: number | null;
  maos?: number | null;
};

type SortKey = "ganhos" | "taxa" | "maos" | "ultima_conexao" | "ultimo_jogo" | "buyin_spinup" | "chip_storm" | "indice_shark";

const SORT_OPTIONS: { key: SortKey; label: string; available: boolean }[] = [
  { key: "ganhos", label: "Ganhos", available: true },
  { key: "taxa", label: "Taxa", available: true },
  { key: "maos", label: "Mãos", available: true },
  { key: "ultima_conexao", label: "Última conexão", available: true },
  { key: "ultimo_jogo", label: "Último jogo", available: false },
  { key: "buyin_spinup", label: "Buy-in de SpinUp", available: false },
  { key: "chip_storm", label: "Chip Storm", available: false },
  { key: "indice_shark", label: "Índice Shark", available: false },
];

const PAPEL_LABEL: Record<number, string> = {
  1: "Dono",
  2: "Gestor",
  4: "Super Agente",
  5: "Agente",
  10: "Membro",
};

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatTimeAgo(ts?: number): string {
  if (!ts || ts === 0) return "—";
  const now = Date.now() / 1000;
  const diff = now - ts;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function getSortValue(member: LiveMember, sortKey: SortKey): number {
  switch (sortKey) {
    case "ganhos": return member.ganhos ?? 0;
    case "taxa": return member.taxa ?? 0;
    case "maos": return member.maos ?? 0;
    case "ultima_conexao": return member.last_active_ts ?? 0;
    default: return 0;
  }
}

function formatSortValue(member: LiveMember, sortKey: SortKey): string | null {
  switch (sortKey) {
    case "ganhos": {
      const v = member.ganhos;
      if (v == null) return null;
      return `${v >= 0 ? "+" : ""}${formatMoney(v)}`;
    }
    case "taxa": {
      const v = member.taxa;
      if (v == null || v === 0) return null;
      return formatMoney(v);
    }
    case "maos": {
      const v = member.maos;
      if (v == null || v === 0) return null;
      return v.toLocaleString("pt-BR");
    }
    case "ultima_conexao":
      return member.online ? "Online" : formatTimeAgo(member.last_active_ts);
    default:
      return "—";
  }
}

function sortValueColor(member: LiveMember, sortKey: SortKey): string {
  if (sortKey === "ganhos") {
    const v = member.ganhos ?? 0;
    if (v > 0) return "text-green-600";
    if (v < 0) return "text-red-600";
  }
  if (sortKey === "ultima_conexao" && member.online) return "text-green-600";
  return "text-muted-foreground";
}

function CompactMemberRow({
  member,
  sortKey,
  onClick,
}: {
  member: LiveMember;
  sortKey: SortKey;
  onClick?: () => void;
}) {
  const initials = (member.nome || "?").slice(0, 2).toUpperCase();
  const displayValue = formatSortValue(member, sortKey);
  const roleLabel = PAPEL_LABEL[member.papel_num] ?? "Membro";

  const badgeVariant =
    member.papel_num === 4
      ? "default"
      : member.papel_num === 5
        ? "outline"
        : "secondary";

  return (
    <div
      className="flex items-center gap-3 border-b border-border py-3 last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      role="button"
      tabIndex={0}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-8 w-8">
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
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{member.nome}</p>
        </div>
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
        {displayValue && (
          <span
            className={cn(
              "font-mono text-sm font-medium",
              sortValueColor(member, sortKey),
            )}
          >
            {displayValue}
          </span>
        )}
        {sortKey !== "ultima_conexao" && (
          <span className="text-[10px] text-muted-foreground">
            {member.online ? "Online" : formatTimeAgo(member.last_active_ts)}
          </span>
        )}
        <Badge variant={badgeVariant}>{roleLabel}</Badge>
      </div>
    </div>
  );
}

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
    ganhos: p.ganhos,
    taxa: p.taxa,
    maos: p.maos,
  };
}

function MembrosCompactTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { q, memberId, setParams } = usePokerMembrosParams();
  const deferredSearch = useDeferredValue(q);
  const [sortKey, setSortKey] = useState<SortKey>("ganhos");
  const [sortAsc, setSortAsc] = useState(false);
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
        queryClient.invalidateQueries({
          queryKey: trpc.poker.members.getStats.queryKey(),
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

  const allMembers = useMemo(
    () => (data?.data ?? []).map((p) => dbToLiveMember(p as unknown as DbMember)),
    [data],
  );

  const filtered = useMemo(() => {
    let result = allMembers;

    if (deferredSearch) {
      const searchQ = deferredSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.nome.toLowerCase().includes(searchQ) ||
          String(m.uid).includes(searchQ),
      );
    }

    return [...result].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      return sortAsc ? va - vb : vb - va;
    });
  }, [allMembers, deferredSearch, sortKey, sortAsc]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "Ganhos";
  const isSyncing = syncMutation.isPending;

  if (memberId) {
    return (
      <MemberDetailView
        memberId={memberId}
        onBack={() => setParams({ memberId: null })}
      />
    );
  }

  // Only block on initial DB load, not on sync
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Carregando membros...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setParams({ q: e.target.value || null })}
          placeholder="Pesquisar membro"
          className="h-11 rounded-lg pl-9"
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="font-medium text-foreground">
            Membro: {filtered.length}
          </span>
          {isSyncing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {syncMutation.isError && (
            <span className="text-xs text-destructive">Sync falhou</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={isSyncing}
            onClick={() => syncMutation.mutate({})}
            aria-label="Atualizar membros"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2">
                {currentSortLabel}
                <ArrowUpDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  disabled={!opt.available}
                  onClick={() => {
                    if (opt.key === sortKey) {
                      setSortAsc((prev) => !prev);
                    } else {
                      setSortKey(opt.key);
                      setSortAsc(false);
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between",
                    !opt.available && "opacity-40",
                  )}
                >
                  <span>{opt.label}</span>
                  {opt.key === sortKey && (
                    sortAsc
                      ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
                      : <ChevronDown className="h-3.5 w-3.5 text-primary" />
                  )}
                  {!opt.available && (
                    <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                      Em breve
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex max-h-[calc(100vh-330px)] flex-col overflow-y-auto border-t border-border">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Icons.Customers className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {q ? "Nenhum membro encontrado" : "Nenhum membro listado"}
            </p>
          </div>
        ) : (
          filtered.map((member) => (
            <CompactMemberRow
              key={member.uid}
              member={member}
              sortKey={sortKey}
              onClick={() => setParams({ memberId: (member as LiveMember & { dbId: string }).dbId })}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function MembrosPageTabs() {
  const { tab, setParams } = usePokerMembrosParams();
  const trpc = useTRPC();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const { data: stats } = useQuery(
    trpc.poker.members.getStats.queryOptions(undefined, {
      refetchInterval: 60_000,
    }),
  );

  return (
    <>
      {!isPanelOpen && (
        <Button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          className="fixed right-0 top-1/2 z-40 h-11 -translate-y-1/2 rounded-r-none rounded-l-lg px-4 shadow-lg"
        >
          Membros
        </Button>
      )}

      <div className="min-h-[680px]">
        <section className="hidden xl:flex min-h-[680px] items-center justify-center rounded-xl border border-dashed bg-muted/20">
          <div className="max-w-sm px-6 text-center">
            <p className="text-sm font-medium">Área central vazia (temporário)</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A gestão de membros foi movida para o painel lateral.
            </p>
          </div>
        </section>
      </div>

      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 bg-background" title="Lista de membros">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Lista de membros</h2>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Fechar painel"
                onClick={() => setIsPanelOpen(false)}
              >
                <Icons.Close className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <Tabs
            value={tab}
            onValueChange={(value) => setParams({ tab: value })}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-border bg-transparent h-auto p-0">
              <TabsTrigger
                value="members"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-3 text-sm"
              >
                Membro
                {stats && stats.totalMembers > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                    {stats.totalMembers}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-3 text-sm"
              >
                Novo membro
                {stats && stats.pendingMembers > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                    {stats.pendingMembers}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="credit"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-3 text-sm text-center whitespace-normal leading-tight"
              >
                Solicitação de crédito
                {stats && stats.pendingCredits > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                    {stats.pendingCredits}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-160px)]">
              <div className="px-6 py-4">
                <TabsContent value="members" className="mt-0">
                  <MembrosCompactTab />
                </TabsContent>

                <TabsContent value="pending" className="mt-0">
                  <ErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      }
                    >
                      <PendingMembersList />
                    </Suspense>
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="credit" className="mt-0">
                  <ErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      }
                    >
                      <CreditRequestsList />
                    </Suspense>
                  </ErrorBoundary>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
