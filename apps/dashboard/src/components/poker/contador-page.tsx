"use client";

import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback, AvatarImage } from "@midpoker/ui/avatar";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Checkbox } from "@midpoker/ui/checkbox";
import { cn } from "@midpoker/ui/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@midpoker/ui/dialog";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@midpoker/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, RefreshCw } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Types (matches bridge /clubs/{id}/members response)
// ---------------------------------------------------------------------------

type LiveMember = {
  uid: number;
  nome: string;
  papel_num: number;
  papel: string;
  avatar_url: string;
  join_ts: number;
  last_active_ts: number;
  titulo: string;
  online: boolean;
  saldo_caixa: number | null;
  credito_linha: number;
  agente_uid: number | null;
  agente_nome: string;
  super_agente_uid: number | null;
  super_agente_nome: string;
};

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<string, string> = {
  Dono: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Gestor: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "Super Agente": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Agente: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  Membro: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
};

function formatBalance(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---------------------------------------------------------------------------
// Member Row
// ---------------------------------------------------------------------------

function MemberRow({
  member,
  isSelected,
  onToggle,
}: {
  member: LiveMember;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const initials = member.nome.slice(0, 2).toUpperCase();
  const roleColor = ROLE_COLORS[member.papel] ?? ROLE_COLORS.Membro;
  const cashbox = member.saldo_caixa ?? 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-colors cursor-pointer",
        isSelected
          ? "border-primary/50 bg-primary/10"
          : "border-border/60 bg-muted/30 hover:bg-muted/50",
      )}
      onClick={onToggle}
    >
      {/* Avatar + online indicator */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-9 w-9">
          {member.avatar_url && <AvatarImage src={member.avatar_url} />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
            member.online ? "bg-green-500" : "bg-gray-400",
          )}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{member.nome}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">ID: {member.uid}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
          <span
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              roleColor,
            )}
          >
            {member.papel}
          </span>
          {member.agente_nome ? (
            <span className="truncate">Agente: {member.agente_nome}</span>
          ) : member.titulo && member.titulo !== member.nome ? (
            <span className="truncate">Apelido: {member.titulo}</span>
          ) : null}
        </div>
      </div>

      {/* Balance + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={cn(
            "min-w-[84px] rounded-full px-3 py-1 text-center font-mono text-sm font-medium bg-background/60",
            cashbox > 0
              ? "text-green-600"
              : cashbox < 0
                ? "text-red-600"
                : "text-muted-foreground",
          )}
        >
          {formatBalance(cashbox)}
        </span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
          <Icons.Currency className="h-3.5 w-3.5" />
        </span>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle()}
          onClick={(e) => e.stopPropagation()}
          className="flex-shrink-0 rounded-md border-primary/40"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types for club info
// ---------------------------------------------------------------------------

type ClubInfo = {
  fichasDisponiveis?: number;
  clubName?: string;
  ownerName?: string;
  totalMembers?: number;
};

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------

function ContadorStats({
  members,
  clubInfo,
  loggedInUid,
}: {
  members: LiveMember[];
  clubInfo?: ClubInfo;
  loggedInUid?: number;
}) {
  const loggedInMember = loggedInUid
    ? members.find((m) => m.uid === loggedInUid)
    : undefined;
  const meuSaldo = loggedInMember?.saldo_caixa ?? 0;

  const fichasDisponiveis = clubInfo?.fichasDisponiveis ?? 0;
  const totalFichasPP = members.reduce(
    (sum, m) => sum + (m.saldo_caixa ?? 0),
    0,
  );

  const stats = [
    {
      label: "Fichas disponíveis",
      sublabel: "Caixa do clube",
      value: formatBalance(fichasDisponiveis),
      icon: Icons.Currency,
      color: fichasDisponiveis > 0 ? "text-green-600" : "text-muted-foreground",
    },
    {
      label: "Meu saldo",
      sublabel: loggedInMember?.nome ?? "Usuário logado",
      value: formatBalance(meuSaldo),
      icon: Icons.Customers,
      color:
        meuSaldo > 0
          ? "text-green-600"
          : meuSaldo < 0
            ? "text-red-600"
            : "text-muted-foreground",
    },
    {
      label: "Saldo agentes",
      sublabel: `Caixa dos agentes/gestores`,
      value: formatBalance(totalFichasPP),
      icon: Icons.TrendingUp,
      color: totalFichasPP >= 0 ? "text-blue-600" : "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-2"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
            <s.icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 leading-none">
            <p
              className={cn(
                "font-mono text-sm font-medium truncate",
                s.color,
              )}
            >
              {s.value}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chip Transfer Dialog
// ---------------------------------------------------------------------------

function ChipTransferDialog({
  open,
  onOpenChange,
  mode,
  selectedMembers,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "send" | "withdraw";
  selectedMembers: LiveMember[];
  onSuccess: () => void;
}) {
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

// ---------------------------------------------------------------------------
// Main Tab - Trocar
// ---------------------------------------------------------------------------

function TrocarTab() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"nome" | "saldo">("nome");
  const [filter, setFilter] = useState("todos");
  const [dialogMode, setDialogMode] = useState<"send" | "withdraw">("send");
  const [dialogOpen, setDialogOpen] = useState(false);

  const deferredSearch = useDeferredValue(search);

  const { data, isLoading, isFetching } = useQuery(
    trpc.poker.members.getLive.queryOptions(
      { q: deferredSearch || undefined },
      // TODO: reativar auto-refresh quando dashboard estiver pronto
      // { refetchInterval: 15_000 },
    ),
  );

  const allMembers = (data?.members ?? []) as LiveMember[];
  const clubInfo = (data as any)?.clubInfo as ClubInfo | undefined;
  const loggedInUid = (data as any)?.loggedInUid as number | undefined;

  // Sort
  const sorted = useMemo(() => {
    const arr = [...allMembers];
    if (sortBy === "saldo") {
      arr.sort(
        (a, b) => (b.saldo_caixa ?? 0) - (a.saldo_caixa ?? 0),
      );
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
    <div className="flex flex-col gap-3">
      {/* Stats */}
      <ContadorStats members={allMembers} clubInfo={clubInfo} loggedInUid={loggedInUid} />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome, apelido ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11 rounded-lg"
        />
      </div>

      {/* Meta / controls row */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="font-medium text-foreground">Membro: {allMembers.length}</span>
          <span className="inline-flex items-center gap-2">
            <Checkbox
              checked={
                selectedIds.size === members.length && members.length > 0
              }
              onCheckedChange={toggleAll}
            />
            <span className="text-xs">
              Selecionados: {selectedIds.size}
            </span>
          </span>
          {isFetching && (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          )}
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
      <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto rounded-lg">
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
      <div className="grid grid-cols-2 gap-3 pt-3 border-t mt-1">
        <Button
          className="h-12 text-base"
          variant="outline"
          disabled={selectedIds.size === 0}
          onClick={() => openDialog("send")}
        >
          Enviar fichas
        </Button>
        <Button
          className="h-12 text-base"
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


// ---------------------------------------------------------------------------
// Placeholder tabs
// ---------------------------------------------------------------------------

function EnviarItensTab() {
  return (
    <div className="flex flex-col items-center py-16">
      <Icons.Invoice className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">Envio de itens em breve</p>
    </div>
  );
}

function TicketTab() {
  return (
    <div className="flex flex-col items-center py-16">
      <Icons.Invoice className="h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">Tickets em breve</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export function ContadorPage() {
  const [isContadorOpen, setIsContadorOpen] = useState(false);

  return (
    <>
      {!isContadorOpen && (
        <Button
          type="button"
          onClick={() => setIsContadorOpen(true)}
          className="fixed right-0 top-1/2 z-40 h-11 -translate-y-1/2 rounded-r-none rounded-l-lg px-4 shadow-lg"
        >
          Contador
        </Button>
      )}

      <div className="min-h-[680px]">
        <section className="hidden xl:flex min-h-[680px] items-center justify-center rounded-xl border border-dashed bg-muted/20">
          <div className="max-w-sm px-6 text-center">
            <p className="text-sm font-medium">Contador de fichas</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Use o painel lateral para enviar e resgatar fichas.
            </p>
          </div>
        </section>
      </div>

      <Sheet open={isContadorOpen} onOpenChange={setIsContadorOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0" title="Contador">
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Contador</h2>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Fechar painel"
                onClick={() => setIsContadorOpen(false)}
              >
                <Icons.Close className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <Tabs defaultValue="trocar" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
              <TabsTrigger
                value="trocar"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                Trocar
              </TabsTrigger>
              <TabsTrigger
                value="enviar"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                Enviar itens
              </TabsTrigger>
              <TabsTrigger
                value="ticket"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
              >
                Ticket
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-160px)]">
              <div className="p-6">
                <TabsContent value="trocar" className="mt-0">
                  <TrocarTab />
                </TabsContent>

                <TabsContent value="enviar" className="mt-0">
                  <EnviarItensTab />
                </TabsContent>

                <TabsContent value="ticket" className="mt-0">
                  <TicketTab />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
