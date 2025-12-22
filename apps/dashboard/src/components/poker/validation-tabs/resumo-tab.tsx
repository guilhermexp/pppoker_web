"use client";

import type { ParsedSession, ParsedSummary, ValidationCheck } from "@/lib/poker/types";
import { Icons } from "@midday/ui/icons";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

// Helper to get day of week abbreviation from date string
function getDayOfWeek(dateStr: string): string | null {
  try {
    // Try yyyy-MM-dd format first
    let date = parse(dateStr, "yyyy-MM-dd", new Date());
    if (Number.isNaN(date.getTime())) {
      // Try dd/MM/yyyy format
      date = parse(dateStr, "dd/MM/yyyy", new Date(), { locale: ptBR });
    }
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    // Get abbreviated day name in Portuguese (seg, ter, qua, qui, sex, sáb, dom)
    return format(date, "EEE", { locale: ptBR }).toLowerCase();
  } catch {
    return null;
  }
}

type ResumoTabProps = {
  summaries: ParsedSummary[];
  sessions: ParsedSession[];
  checks: ValidationCheck[];
  clubId: string | null;
  period: { start: string; end: string; days: number };
  weekInfo: { currentWeek: number; importWeek: number | null; isSameWeek: boolean };
};

export function ResumoTab({ summaries, sessions, checks, clubId, period, weekInfo }: ResumoTabProps) {
  const stats = useMemo(() => {
    // Helper to check valid ID
    const isValidId = (id: string | null | undefined): boolean => {
      if (!id) return false;
      const normalized = id.trim().toLowerCase();
      return (
        normalized !== "" &&
        normalized !== "(none)" &&
        normalized !== "none" &&
        normalized !== "/" &&
        normalized !== "-" &&
        /\d/.test(id)
      );
    };

    // Helper to format session type tag (same logic as sessions-tab)
    const formatSessionTypeTag = (type: string, organizador?: string | null): "CASH" | "MTT" | "SITNG" | "SPIN" => {
      const normalized = type.toLowerCase();

      // Se o organizador é PPST, é torneio (nunca CASH)
      if (organizador === "PPST") {
        if (normalized.includes("spin")) return "SPIN";
        if (normalized.includes("sit")) return "SITNG";
        return "MTT";
      }

      // Se o organizador é PPSR, é sempre CASH
      if (organizador === "PPSR") {
        return "CASH";
      }

      // Liga ou outros - usar o tipo
      if (normalized.includes("spin")) return "SPIN";
      if (normalized.includes("mtt") || normalized.includes("tournament")) return "MTT";
      if (normalized.includes("sit") || normalized.includes("sng")) return "SITNG";
      if (normalized.includes("cash") || normalized.includes("ring")) return "CASH";
      return "CASH";
    };

    // Unique agents and super-agents
    const uniqueAgents = new Set(
      summaries.map((s) => s.agentPpPokerId).filter(isValidId)
    );
    const uniqueSuperAgents = new Set(
      summaries.map((s) => s.superAgentPpPokerId).filter(isValidId)
    );

    // Players without agent
    const playersWithoutAgent = summaries.filter(
      (s) => !isValidId(s.agentPpPokerId)
    ).length;

    // Total winnings (column J - playerWinningsTotal)
    const totalWinnings = summaries.reduce(
      (sum, s) => sum + (s.playerWinningsTotal || 0),
      0
    );

    // Total rake (column AC - fee)
    const totalRake = summaries.reduce((sum, s) => sum + (s.fee || 0), 0);

    // Winners and losers
    const winners = summaries.filter((s) => s.playerWinningsTotal > 0).length;
    const losers = summaries.filter((s) => s.playerWinningsTotal < 0).length;

    // Session stats - categorized properly
    const cashGames = sessions.filter(
      (s) => formatSessionTypeTag(s.sessionType || "", s.createdByNickname) === "CASH"
    ).length;
    const mttGames = sessions.filter(
      (s) => formatSessionTypeTag(s.sessionType || "", s.createdByNickname) === "MTT"
    ).length;
    const sitngGames = sessions.filter(
      (s) => formatSessionTypeTag(s.sessionType || "", s.createdByNickname) === "SITNG"
    ).length;
    const spinGames = sessions.filter(
      (s) => formatSessionTypeTag(s.sessionType || "", s.createdByNickname) === "SPIN"
    ).length;

    const totalTorneios = mttGames + sitngGames + spinGames;

    // Check if club is in Liga (has PPST or PPSR sessions)
    const hasPPST = sessions.some((s) => s.createdByNickname === "PPST");
    const hasPPSR = sessions.some((s) => s.createdByNickname === "PPSR");
    const isLiga = hasPPST || hasPPSR;

    // Validation stats
    const passedChecks = checks.filter((c) => c.status === "passed").length;
    const warningChecks = checks.filter((c) => c.status === "warning").length;
    const failedChecks = checks.filter((c) => c.status === "failed").length;

    return {
      totalPlayers: summaries.length,
      totalAgents: uniqueAgents.size,
      totalSuperAgents: uniqueSuperAgents.size,
      playersWithoutAgent,
      playersWithAgent: summaries.length - playersWithoutAgent,
      totalWinnings,
      totalRake,
      winners,
      losers,
      totalSessions: sessions.length,
      cashGames,
      totalTorneios,
      mttGames,
      sitngGames,
      spinGames,
      isLiga,
      passedChecks,
      warningChecks,
      failedChecks,
      totalChecks: checks.length,
    };
  }, [summaries, sessions, checks]);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      {/* Header Info - Club, Period, Week */}
      <div className="flex items-center gap-3 flex-wrap">
        {clubId && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
            <Icons.Apps className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Clube {clubId}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              stats.isLiga
                ? "bg-blue-500/20 text-blue-400"
                : "bg-purple-500/20 text-purple-400"
            }`}>
              {stats.isLiga ? "Liga" : "Privado"}
            </span>
          </div>
        )}
        {period.start && period.end && (() => {
          const startDay = getDayOfWeek(period.start);
          const endDay = getDayOfWeek(period.end);
          const dayRange = startDay && endDay ? `${startDay} a ${endDay}` : null;
          return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
              <Icons.CalendarMonth className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-mono">
                {period.start} - {period.end}
              </span>
              <span className="text-xs text-muted-foreground">
                ({period.days} dias{dayRange ? ` · ${dayRange}` : ""})
              </span>
            </div>
          );
        })()}
        {weekInfo.importWeek && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            weekInfo.isSameWeek
              ? "bg-[#00C969]/10 text-[#00C969]"
              : "bg-amber-500/10 text-amber-500"
          }`}>
            <Icons.DateFormat className="w-4 h-4" />
            <span className="text-sm font-medium">Semana {weekInfo.importWeek}</span>
            {!weekInfo.isSameWeek && (
              <span className="text-xs opacity-70">(atual: {weekInfo.currentWeek})</span>
            )}
          </div>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Jogadores */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.AccountCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Jogadores</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalPlayers}</p>
          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Com agente</span>
              <span className="font-mono">{stats.playersWithAgent}</span>
            </div>
            <div className="flex justify-between">
              <span>Sem agente</span>
              <span className="font-mono">{stats.playersWithoutAgent}</span>
            </div>
          </div>
        </div>

        {/* Agentes */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Accounts className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Hierarquia</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{stats.totalAgents}</p>
            <span className="text-xs text-muted-foreground">agentes</span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Super agentes</span>
              <span className="font-mono">{stats.totalSuperAgents}</span>
            </div>
          </div>
        </div>

        {/* Ganhos/Perdas */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Ganhos + Eventos (J)</span>
          </div>
          <p className={`text-2xl font-bold ${stats.totalWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {formatCurrency(stats.totalWinnings)}
          </p>
          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span className="text-[#00C969]">Winners</span>
              <span className="font-mono">{stats.winners}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#FF3638]">Losers</span>
              <span className="font-mono">{stats.losers}</span>
            </div>
          </div>
        </div>

        {/* Taxa/Rake */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.ReceiptLong className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Taxa/Rake (AC)</span>
          </div>
          <p className="text-2xl font-bold text-[#00C969]">
            {formatCurrency(stats.totalRake)}
          </p>
          <div className="mt-2 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Média por jogador</span>
              <span className="font-mono">
                {stats.totalPlayers > 0
                  ? formatCurrency(stats.totalRake / stats.totalPlayers)
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Sessions and Validation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Partidas */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Icons.PlayOutline className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Partidas</span>
            <span className="ml-auto text-2xl font-bold">{stats.totalSessions}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
              <span className="text-muted-foreground">Cash Games</span>
              <span className="font-mono font-medium ml-2">{stats.cashGames}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
              <span className="text-muted-foreground">Torneios</span>
              <span className="font-mono font-medium ml-2">{stats.totalTorneios}</span>
            </div>
            {stats.mttGames > 0 && (
              <div className="flex items-center justify-between p-2 rounded bg-muted/20 text-xs">
                <span className="text-muted-foreground/70 pl-2">└ MTT</span>
                <span className="font-mono font-medium ml-2 text-muted-foreground">{stats.mttGames}</span>
              </div>
            )}
            {stats.sitngGames > 0 && (
              <div className="flex items-center justify-between p-2 rounded bg-muted/20 text-xs">
                <span className="text-muted-foreground/70 pl-2">└ Sit&Go</span>
                <span className="font-mono font-medium ml-2 text-muted-foreground">{stats.sitngGames}</span>
              </div>
            )}
            {stats.spinGames > 0 && (
              <div className="flex items-center justify-between p-2 rounded bg-muted/20 text-xs">
                <span className="text-muted-foreground/70 pl-2">└ SPIN</span>
                <span className="font-mono font-medium ml-2 text-muted-foreground">{stats.spinGames}</span>
              </div>
            )}
          </div>
        </div>

        {/* Validação */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Icons.Check className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Validação</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.totalChecks}</p>
              <p className="text-xs text-muted-foreground">verificações</p>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#00C969]" />
                <span className="text-sm">{stats.passedChecks} aprovadas</span>
              </div>
              {stats.warningChecks > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm">{stats.warningChecks} avisos</span>
                </div>
              )}
              {stats.failedChecks > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF3638]" />
                  <span className="text-sm">{stats.failedChecks} falhas</span>
                </div>
              )}
            </div>
            {/* Progress Ring */}
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-muted/30"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${(stats.passedChecks / stats.totalChecks) * 97.5} 97.5`}
                  className="text-[#00C969]"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold">
                  {Math.round((stats.passedChecks / stats.totalChecks) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
