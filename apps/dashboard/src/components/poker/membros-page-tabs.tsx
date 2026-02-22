"use client";

import { usePokerMembrosParams } from "@/hooks/use-poker-membros-params";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@midpoker/ui/avatar";
import { Badge } from "@midpoker/ui/badge";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useDeferredValue, useMemo } from "react";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

const ROLE_LABELS: Record<number, string> = {
  1: "Dono",
  2: "Gestor",
  4: "Super Agente",
  5: "Agente",
  10: "Membro",
};

type LiveMember = {
  uid: number;
  nome: string;
  papel_num: number;
  papel: string;
  avatar_url?: string;
  online: boolean;
  saldo_caixa?: number | null;
  credito_linha?: number;
  agente_nome?: string;
  titulo?: string;
};

function CompactMemberRow({ member }: { member: LiveMember }) {
  const initials = member.nome.slice(0, 2).toUpperCase();
  const roleLabel = ROLE_LABELS[member.papel_num] ?? member.papel;
  const subtitle = member.agente_nome
    ? `Agente: ${member.agente_nome}`
    : `Papel: ${roleLabel}`;
  const saldo = member.saldo_caixa ?? 0;

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
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span
          className={cn(
            "font-mono text-sm font-medium",
            saldo > 0 && "text-green-600",
            saldo < 0 && "text-red-600",
            saldo === 0 && "text-muted-foreground",
          )}
        >
          {formatMoney(saldo)}
        </span>
        <Badge
          variant="secondary"
          className="h-5 px-1.5 text-[10px] border-white/10 bg-white/[0.06] text-muted-foreground"
        >
          {roleLabel}
        </Badge>
      </div>
    </div>
  );
}

export function MembrosPageTabs() {
  const trpc = useTRPC();
  const { q, setParams } = usePokerMembrosParams();
  const deferredSearch = useDeferredValue(q);

  const { data, isLoading, isFetching } = useQuery(
    trpc.poker.members.getLive.queryOptions({
      q: deferredSearch || undefined,
    }),
  );

  const members = useMemo(() => data?.members ?? [], [data]);

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

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          Membros: {data?.total ?? members.length}
        </span>
        {data?.clubInfo && (
          <span>Fichas: {formatMoney(data.clubInfo.fichasDisponiveis)}</span>
        )}
        {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="flex flex-col gap-2">
            {members.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Icons.Customers className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {q ? "Nenhum membro encontrado" : "Nenhum membro listado"}
                </p>
              </div>
            ) : (
              members.map((member) => (
                <CompactMemberRow key={member.uid} member={member} />
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
