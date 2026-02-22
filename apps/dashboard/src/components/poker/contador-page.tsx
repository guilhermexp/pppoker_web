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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, ArrowUpRight, ArrowDownLeft } from "lucide-react";
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
        "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
        isSelected
          ? "border-primary/50 bg-primary/5"
          : "border-border hover:bg-muted/50",
      )}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle()}
        onClick={(e) => e.stopPropagation()}
        className="flex-shrink-0"
      />

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
          <span
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
              roleColor,
            )}
          >
            {member.papel}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">ID: {member.uid}</span>
          {member.titulo && member.titulo !== member.nome && (
            <>
              <span className="text-border">|</span>
              <span>{member.titulo}</span>
            </>
          )}
          {member.agente_nome && (
            <>
              <span className="text-border">|</span>
              <span>Ag: {member.agente_nome}</span>
            </>
          )}
        </div>
      </div>

      {/* Balance */}
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span
          className={cn(
            "font-mono text-sm font-medium",
            cashbox > 0
              ? "text-green-600"
              : cashbox < 0
                ? "text-red-600"
                : "text-muted-foreground",
          )}
        >
          {formatBalance(cashbox)}
        </span>
        {member.credito_linha > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground">
            Cred: {formatBalance(member.credito_linha)}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------

function ContadorStats({ members }: { members: LiveMember[] }) {
  const totalCashbox = members.reduce(
    (sum, m) => sum + (m.saldo_caixa ?? 0),
    0,
  );
  const onlineCount = members.filter((m) => m.online).length;
  const positiveCount = members.filter(
    (m) => (m.saldo_caixa ?? 0) > 0,
  ).length;
  const negativeCount = members.filter(
    (m) => (m.saldo_caixa ?? 0) < 0,
  ).length;

  const stats = [
    {
      label: "Total",
      value: members.length.toString(),
      icon: Icons.Customers,
    },
    {
      label: "Online",
      value: onlineCount.toString(),
      icon: Icons.Visibility,
      color: "text-green-600",
    },
    {
      label: "Caixa total",
      value: formatBalance(totalCashbox),
      icon: Icons.Currency,
      color: totalCashbox >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      label: "Positivo / Negativo",
      value: `${positiveCount} / ${negativeCount}`,
      icon: Icons.TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border"
        >
          <s.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p
              className={cn(
                "font-mono text-sm font-medium truncate",
                s.color,
              )}
            >
              {s.value}
            </p>
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

  const { data, isLoading } = useQuery(
    trpc.poker.members.getLive.queryOptions(
      { q: deferredSearch || undefined },
      { refetchInterval: 15_000 },
    ),
  );

  const allMembers = (data?.members ?? []) as LiveMember[];

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
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <ContadorStats members={allMembers} />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome, apelido ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto">
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
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {f.label}
            <span className="opacity-70">({f.count})</span>
          </button>
        ))}
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          {members.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedIds.size === members.length && members.length > 0
                }
                onCheckedChange={toggleAll}
              />
              <span className="text-xs">Selecionar todos</span>
            </div>
          )}
          {selectedIds.size > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
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

      {/* Member list */}
      <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
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
      <div className="flex gap-3 pt-2 border-t">
        <Button
          className="flex-1"
          variant="outline"
          disabled={selectedIds.size === 0}
          onClick={() => openDialog("send")}
        >
          Enviar fichas
        </Button>
        <Button
          className="flex-1"
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
// Transações Tab
// ---------------------------------------------------------------------------

type Transaction = {
  id: string;
  occurredAt: string;
  type: string;
  sender: { id: string; nickname: string; memoName: string | null; ppPokerId: string | null } | null;
  recipient: { id: string; nickname: string; memoName: string | null; ppPokerId: string | null } | null;
  amount: number;
  creditSent: number;
  creditRedeemed: number;
  chipsSent: number;
  chipsRedeemed: number;
  note: string | null;
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  credit_given: { label: "Crédito dado", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  credit_received: { label: "Crédito recebido", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400" },
  credit_paid: { label: "Crédito pago", color: "bg-green-500/15 text-green-700 dark:text-green-400" },
  buy_in: { label: "Buy-in", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  cash_out: { label: "Cash-out", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400" },
  transfer_in: { label: "Recebimento", color: "bg-green-500/15 text-green-700 dark:text-green-400" },
  transfer_out: { label: "Envio", color: "bg-red-500/15 text-red-700 dark:text-red-400" },
  rake: { label: "Rake", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  agent_commission: { label: "Comissão", color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400" },
  rakeback: { label: "Rakeback", color: "bg-teal-500/15 text-teal-700 dark:text-teal-400" },
  jackpot: { label: "Jackpot", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  adjustment: { label: "Ajuste", color: "bg-gray-500/15 text-gray-600 dark:text-gray-400" },
};

function TransacoesTab() {
  const trpc = useTRPC();
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { data, isLoading } = useQuery(
    trpc.poker.transactions.get.queryOptions(
      {
        pageSize: 100,
        sort: ["occurred_at", "desc"],
        q: deferredSearch || undefined,
        type: typeFilter !== "todos" ? (typeFilter as any) : undefined,
        includeDraft: true,
      },
    ),
  );

  const transactions = (data?.data ?? []) as Transaction[];
  const totalCount = data?.meta?.totalCount ?? 0;

  // Stats
  const stats = useMemo(() => {
    let totalEnvio = 0;
    let totalResgate = 0;
    for (const tx of transactions) {
      if (tx.amount > 0) totalEnvio += tx.amount;
      else totalResgate += Math.abs(tx.amount);
    }
    return { totalEnvio, totalResgate, count: transactions.length };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <Icons.ReceiptLong className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-mono text-sm font-medium">{totalCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <ArrowUpRight className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Enviado</p>
            <p className="font-mono text-sm font-medium text-green-600">
              {formatBalance(stats.totalEnvio)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <ArrowDownLeft className="h-4 w-4 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Resgatado</p>
            <p className="font-mono text-sm font-medium text-red-600">
              {formatBalance(stats.totalResgate)}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por jogador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Type filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {[
          { key: "todos", label: "Todos" },
          { key: "credit_given", label: "Crédito dado" },
          { key: "credit_received", label: "Crédito recebido" },
          { key: "credit_paid", label: "Crédito pago" },
          { key: "buy_in", label: "Buy-in" },
          { key: "cash_out", label: "Cash-out" },
          { key: "transfer_in", label: "Recebimento" },
          { key: "transfer_out", label: "Envio" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setTypeFilter(f.key)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
              typeFilter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Icons.Invoice className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? "Nenhuma transação encontrada" : "Nenhuma transação registrada"}
            </p>
          </div>
        ) : (
          transactions.map((tx) => {
            const typeInfo = TYPE_LABELS[tx.type] ?? { label: tx.type, color: "bg-gray-500/15 text-gray-600" };
            const isPositive = tx.amount > 0;
            const date = new Date(tx.occurredAt);
            const senderName = tx.sender?.memoName || tx.sender?.nickname || "—";
            const recipientName = tx.recipient?.memoName || tx.recipient?.nickname || "—";

            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                {/* Icon */}
                <div
                  className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-full flex-shrink-0",
                    isPositive ? "bg-green-500/10" : "bg-red-500/10",
                  )}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4 text-red-600" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {senderName}
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-sm truncate">{recipientName}</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                        typeInfo.color,
                      )}
                    >
                      {typeInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {date.toLocaleDateString("pt-BR")} {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {tx.note && (
                      <>
                        <span className="text-border">|</span>
                        <span className="truncate">{tx.note}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <span
                  className={cn(
                    "font-mono text-sm font-medium flex-shrink-0",
                    isPositive ? "text-green-600" : "text-red-600",
                  )}
                >
                  {isPositive ? "+" : ""}
                  {formatBalance(tx.amount)}
                </span>
              </div>
            );
          })
        )}
      </div>
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
  return (
    <Tabs defaultValue="trocar" className="w-full">
      <TabsList>
        <TabsTrigger value="trocar">Trocar</TabsTrigger>
        <TabsTrigger value="transacoes">Transações</TabsTrigger>
        <TabsTrigger value="enviar">Enviar itens</TabsTrigger>
        <TabsTrigger value="ticket">Ticket</TabsTrigger>
      </TabsList>

      <TabsContent value="trocar" className="mt-4">
        <TrocarTab />
      </TabsContent>

      <TabsContent value="transacoes" className="mt-4">
        <TransacoesTab />
      </TabsContent>

      <TabsContent value="enviar" className="mt-4">
        <EnviarItensTab />
      </TabsContent>

      <TabsContent value="ticket" className="mt-4">
        <TicketTab />
      </TabsContent>
    </Tabs>
  );
}
