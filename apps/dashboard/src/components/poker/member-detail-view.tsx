"use client";

import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@midpoker/ui/avatar";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Shield,
  ShieldCheck,
} from "lucide-react";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Nunca";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d atrás`;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

const ROLE_LABELS: Record<string, string> = {
  player: "Membro",
  agent: "Agente",
  super_agent: "Super Agente",
};

function getRoleLabel(type: string) {
  return ROLE_LABELS[type] ?? "Membro";
}

function StatCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5 py-3 px-2", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium font-mono">{value}</span>
    </div>
  );
}

function ActionRow({ label, detail }: { label: string; detail?: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between border-b border-border px-1 py-3.5 text-sm hover:bg-muted/50 transition-colors"
    >
      <span>{label}</span>
      <span className="flex items-center gap-1 text-muted-foreground">
        {detail && <span className="text-xs">{detail}</span>}
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

export function MemberDetailView({
  memberId,
  onBack,
}: {
  memberId: string;
  onBack: () => void;
}) {
  const trpc = useTRPC();

  const { data: player, isLoading } = useQuery(
    trpc.poker.players.getById.queryOptions(
      { id: memberId },
      { enabled: Boolean(memberId) },
    ),
  );

  if (isLoading || !player) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Carregando detalhes...</p>
      </div>
    );
  }

  const initials = player.nickname.slice(0, 2).toUpperCase();
  const roleLabel = getRoleLabel(player.type);
  const isAgent = player.type === "agent" || player.type === "super_agent";
  const isPlayer = player.type === "player";

  const badgeVariant =
    player.type === "super_agent"
      ? "default"
      : player.type === "agent"
        ? "outline"
        : "secondary";

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 -ml-1"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="relative shrink-0">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
              player.lastActiveAt &&
                Date.now() - new Date(player.lastActiveAt).getTime() < 300000
                ? "bg-green-500"
                : "bg-gray-400",
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{player.nickname}</p>
          <p className="text-xs text-muted-foreground font-mono">
            ID: {player.ppPokerId}
          </p>
          {player.memoName ? (
            <p className="text-xs text-muted-foreground truncate">
              {player.memoName}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Sem observações
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            Última conexão: {formatDate(player.lastActiveAt)}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 border-b border-border">
        <StatCell
          label="Ganhos >>"
          value={formatMoney(player.rakeStats.totalWinnings)}
          className="border-r border-border"
        />
        <StatCell
          label="Mãos >>"
          value={player.rakeStats.sessionsPlayed}
          className="border-r border-border"
        />
        <StatCell label="BB/100" value="0" />
      </div>
      <div className="grid grid-cols-3 border-b border-border">
        <StatCell
          label="Ganhos de MTT"
          value="0"
          className="border-r border-border"
        />
        <StatCell
          label="Buy-in SpinUp"
          value="0"
          className="border-r border-border"
        />
        <StatCell label="Taxa" value={formatMoney(player.rakeStats.totalRake)} />
      </div>

      {/* Role Badge + Info */}
      <div className="flex items-center gap-2 py-3 border-b border-border">
        <Badge variant={badgeVariant}>{roleLabel}</Badge>
        {isAgent && <ShieldCheck className="h-4 w-4 text-muted-foreground" />}
        {isPlayer && player.agent && (
          <span className="text-xs text-muted-foreground truncate">
            Upline de agente: {player.agent.nickname} (ID:{" "}
            {player.agent.ppPokerId})
          </span>
        )}
      </div>

      {/* Action Menu */}
      <div className="flex flex-col mt-1">
        {/* Permissões - Agente / Gestor */}
        {isAgent && <ActionRow label="Permissões" />}

        {/* Agent-only actions */}
        {isAgent && (
          <>
            <ActionRow label="Conceder crédito" />
            <ActionRow label="Dados do agente" />
            <ActionRow
              label="Downlines"
              detail={String(player.agentStats?.playerCount ?? 0)}
            />
            <ActionRow label="Retorno de taxa" />
            <ActionRow label="Suspender agente" />
            <ActionRow label="Ocultar mesas" />
          </>
        )}

        {/* Common actions */}
        <ActionRow label="Mesas jogando" />
        <ActionRow label="Excluir membro" />
      </div>
    </div>
  );
}
