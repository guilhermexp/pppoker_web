"use client";

import type {
  ParsedLeagueSummary,
  LeagueValidationResult,
} from "@/lib/poker/league-types";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

// Helper to get day of week abbreviation from date string
function getDayOfWeek(dateStr: string): string | null {
  try {
    let date = parse(dateStr, "yyyy-MM-dd", new Date());
    if (Number.isNaN(date.getTime())) {
      date = parse(dateStr, "dd/MM/yyyy", new Date(), { locale: ptBR });
    }
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return format(date, "EEE", { locale: ptBR }).toLowerCase();
  } catch {
    return null;
  }
}

type LeagueGeralDaLigaTabProps = {
  leagueId?: string | null;
  leagueSummary?: ParsedLeagueSummary;
  stats: LeagueValidationResult["stats"];
  period: LeagueValidationResult["period"];
  weekInfo: {
    currentWeek: number;
    importWeek: number | null;
    isSameWeek: boolean;
  };
  checks: LeagueValidationResult["checks"];
};

// Summary columns for compact view (main metrics)
const SUMMARY_COLUMNS = [
  { key: "clubName", label: "Clube", type: "text" },
  { key: "clubId", label: "ID", type: "id" },
  { key: "playerEarningsGeneral", label: "Geral (Jogador)", type: "currency" },
  { key: "clubEarningsGeneral", label: "Geral (Clube)", type: "currency" },
  { key: "playerEarningsRingGames", label: "Ring Games", type: "currency" },
  { key: "clubEarningsJackpotFee", label: "Taxa Jackpot", type: "currency" },
] as const;

// All columns for expanded view (42 columns from A-AP)
const ALL_COLUMNS = [
  // Section 1: Club Info (A-B)
  { key: "clubName", label: "Clube", type: "text", group: "Info" },
  { key: "clubId", label: "ID", type: "id", group: "Info" },
  // Section 2: Classifications (C-F)
  {
    key: "classificationPpsr",
    label: "Class. PPSR",
    type: "number",
    group: "Classificacoes",
  },
  {
    key: "classificationRingGame",
    label: "Class. Ring",
    type: "number",
    group: "Classificacoes",
  },
  {
    key: "classificationRgCustom",
    label: "Class. RG Custom",
    type: "number",
    group: "Classificacoes",
  },
  {
    key: "classificationMtt",
    label: "Class. MTT",
    type: "number",
    group: "Classificacoes",
  },
  // Section 3: Player Earnings - Ganhos do jogador (G-P)
  {
    key: "playerEarningsGeneral",
    label: "Geral",
    type: "currency",
    group: "Ganhos Jogador",
  },
  {
    key: "playerEarningsRingGames",
    label: "Ring Games",
    type: "currency",
    group: "Ganhos Jogador",
  },
  {
    key: "playerEarningsMttSitNGo",
    label: "MTT/SitNGo",
    type: "currency",
    group: "Ganhos Jogador",
  },
  {
    key: "playerEarningsSpinUp",
    label: "SpinUp",
    type: "currency",
    group: "Ganhos Jogador",
  },
  {
    key: "playerEarningsCaribbeanPoker",
    label: "Caribbean+",
    type: "currency",
    group: "Ganhos Jogador",
  },
  {
    key: "playerEarningsColorGame",
    label: "Color Game",
    type: "currency",
    group: "Ganhos Jogador",
  },
  {
    key: "playerEarningsCrash",
    label: "Crash",
    type: "currency",
    group: "Ganhos Jogador",
  },
  {
    key: "playerEarningsLuckyDraw",
    label: "Lucky Draw",
    type: "currency",
    group: "Ganhos Jogador",
  },
  {
    key: "playerEarningsJackpot",
    label: "Jackpot",
    type: "currency",
    group: "Ganhos Jogador",
  },
  {
    key: "playerEarningsSplitEv",
    label: "Dividir EV",
    type: "currency",
    group: "Ganhos Jogador",
  },
  // Section 4: Ticket/Prize (Q-S)
  {
    key: "ticketValueWon",
    label: "Ticket Ganho",
    type: "currency",
    group: "Ticket",
  },
  {
    key: "ticketBuyInPlayer",
    label: "Buy-in Ticket",
    type: "currency",
    group: "Ticket",
  },
  {
    key: "customPrizeValue",
    label: "Premio Custom",
    type: "currency",
    group: "Ticket",
  },
  // Section 5: Club Earnings - Ganhos do clube (T-AL)
  {
    key: "clubEarningsGeneral",
    label: "Geral",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsFee",
    label: "Taxa",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsFeePpst",
    label: "Taxa PPST",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsFeeNonPpst",
    label: "Taxa N-PPST",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsFeePpsr",
    label: "Taxa PPSR",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsFeeNonPpsr",
    label: "Taxa N-PPSR",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsSpinUpBuyIn",
    label: "SpinUp Buy-in",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsSpinUpPrize",
    label: "SpinUp Premio",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsCaribbeanBets",
    label: "Caribbean Apostas",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsCaribbeanPrize",
    label: "Caribbean Premio",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsColorGameBets",
    label: "Color Apostas",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsColorGamePrize",
    label: "Color Premio",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsCrashBets",
    label: "Crash Apostas",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsCrashPrize",
    label: "Crash Premio",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsLuckyDrawBets",
    label: "Lucky Apostas",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsLuckyDrawPrize",
    label: "Lucky Premio",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsJackpotFee",
    label: "Taxa Jackpot",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsJackpotPrize",
    label: "Premio Jackpot",
    type: "currency",
    group: "Ganhos Clube",
  },
  {
    key: "clubEarningsSplitEv",
    label: "Dividir EV",
    type: "currency",
    group: "Ganhos Clube",
  },
  // Section 6: Final Ticket/Gap (AM-AP)
  {
    key: "ticketDeliveredValue",
    label: "Ticket Entregue",
    type: "currency",
    group: "Final",
  },
  {
    key: "ticketDeliveredBuyIn",
    label: "Ticket Buy-in",
    type: "currency",
    group: "Final",
  },
  {
    key: "guaranteedGap",
    label: "Gap Garantido",
    type: "currency",
    group: "Final",
  },
] as const;

export function LeagueGeralDaLigaTab({
  leagueId,
  leagueSummary,
  stats,
  period,
  weekInfo,
  checks,
}: LeagueGeralDaLigaTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const clubs = leagueSummary?.clubs || [];
  const summaryMetricColumns = SUMMARY_COLUMNS.filter(
    (col) => col.key !== "clubName" && col.key !== "clubId",
  );
  const extraMetricColumns = ALL_COLUMNS.filter(
    (col) => !SUMMARY_COLUMNS.some((summaryCol) => summaryCol.key === col.key),
  );
  const totalTorneios = stats.mttSessions + stats.sitNGoSessions;
  const avgPlayersPerClub =
    stats.totalClubs > 0 ? stats.totalPlayers / stats.totalClubs : 0;
  const passedChecks = checks.filter((c) => c.status === "passed").length;
  const warningChecks = checks.filter((c) => c.status === "warning").length;
  const failedChecks = checks.filter((c) => c.status === "failed").length;

  // Filter clubs by search
  const filteredClubs = clubs.filter((club) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      club.clubName.toLowerCase().includes(query) || club.clubId.includes(query)
    );
  });

  if (!leagueSummary || clubs.length === 0) {
    return (
      <p className="text-center text-[#878787] py-8">
        Nenhum dado encontrado na aba Geral da Liga
      </p>
    );
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 pb-4">
      {/* Header Info - League, Period, Week */}
      <div className="flex items-center gap-3 flex-wrap">
        {leagueId && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
            <Icons.Apps className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Liga {leagueId}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-500/20 text-blue-400">
              Liga
            </span>
          </div>
        )}
        {period.start &&
          period.end &&
          (() => {
            const startDay = getDayOfWeek(period.start);
            const endDay = getDayOfWeek(period.end);
            const dayRange =
              startDay && endDay ? `${startDay} a ${endDay}` : null;
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
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              weekInfo.isSameWeek
                ? "bg-[#00C969]/10 text-[#00C969]"
                : "bg-amber-500/10 text-amber-500"
            }`}
          >
            <Icons.DateFormat className="w-4 h-4" />
            <span className="text-sm font-medium">
              Semana {weekInfo.importWeek}
            </span>
            {!weekInfo.isSameWeek && (
              <span className="text-xs opacity-70">
                (atual: {weekInfo.currentWeek})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Clubes */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Apps className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              Clubes
            </span>
          </div>
          <p className="text-2xl font-bold">{stats.totalClubs}</p>
          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Jogadores</span>
              <span className="font-mono">{stats.totalPlayers}</span>
            </div>
            <div className="flex justify-between">
              <span>Media por clube</span>
              <span className="font-mono">
                {stats.totalClubs > 0 ? avgPlayersPerClub.toFixed(1) : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Cadastro - Novos vs Existentes */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Customers className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              Cadastro
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-[#00C969]">
              {stats.newPlayers}
            </p>
            <span className="text-xs text-muted-foreground">novos</span>
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Ja cadastrados</span>
              <span className="font-mono">{stats.existingPlayers}</span>
            </div>
            <div className="flex justify-between">
              <span>Na planilha</span>
              <span className="font-mono">{stats.totalPlayers}</span>
            </div>
          </div>
        </div>

        {/* Transacoes */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Accounts className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              Transacoes
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{stats.totalTransactions}</p>
            <span className="text-xs text-muted-foreground">total</span>
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Volume</span>
              <span className="font-mono">
                {formatCurrency(stats.transactionVolume)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Media</span>
              <span className="font-mono">
                {formatCurrency(stats.avgTransactionValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Ganhos/Perdas */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              Ganhos + Eventos
            </span>
          </div>
          <p
            className={`text-2xl font-bold ${stats.totalWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
          >
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
            <span className="text-xs text-muted-foreground font-medium">
              Taxa/Rake
            </span>
          </div>
          <p className="text-2xl font-bold text-[#00C969]">
            {formatCurrency(stats.totalRake)}
          </p>
          <div className="mt-2 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Media por jogador</span>
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
            <span className="text-sm text-muted-foreground font-medium">
              Partidas
            </span>
            <span className="ml-auto text-2xl font-bold">
              {stats.totalSessions}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
              <span className="text-muted-foreground">Cash Games</span>
              <span className="font-mono font-medium ml-2">
                {stats.cashGameSessions}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs">
              <span className="text-muted-foreground">Torneios</span>
              <span className="font-mono font-medium ml-2">
                {totalTorneios}
              </span>
            </div>
            {stats.mttSessions > 0 && (
              <div className="flex items-center justify-between p-2 rounded bg-muted/20 text-xs">
                <span className="text-muted-foreground/70 pl-2">└ MTT</span>
                <span className="font-mono font-medium ml-2 text-muted-foreground">
                  {stats.mttSessions}
                </span>
              </div>
            )}
            {stats.sitNGoSessions > 0 && (
              <div className="flex items-center justify-between p-2 rounded bg-muted/20 text-xs">
                <span className="text-muted-foreground/70 pl-2">└ Sit&Go</span>
                <span className="font-mono font-medium ml-2 text-muted-foreground">
                  {stats.sitNGoSessions}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Validacao */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Icons.Check className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">
              Validacao
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{checks.length}</p>
              <p className="text-xs text-muted-foreground">verificacoes</p>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#00C969]" />
                <span className="text-sm">{passedChecks} aprovadas</span>
              </div>
              {warningChecks > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm">{warningChecks} avisos</span>
                </div>
              )}
              {failedChecks > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF3638]" />
                  <span className="text-sm">{failedChecks} falhas</span>
                </div>
              )}
            </div>
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
                  strokeDasharray={`${
                    checks.length > 0
                      ? (passedChecks / checks.length) * 97.5
                      : 0
                  } 97.5`}
                  className="text-[#00C969]"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold">
                  {checks.length > 0
                    ? Math.round((passedChecks / checks.length) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header with search and expand toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-[#878787]">{clubs.length} clubes</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <Icons.ChevronLeft className="w-4 h-4 mr-1" />
                Resumido ({SUMMARY_COLUMNS.length} cols)
              </>
            ) : (
              <>
                Expandir ({ALL_COLUMNS.length} cols)
                <Icons.ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
        <div className="relative w-64">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#878787]" />
          <Input
            placeholder="Buscar clube..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Clubs List */}
      <div className="border rounded-lg overflow-hidden">
        {filteredClubs.length === 0 ? (
          <div className="p-8 text-center text-[#878787]">
            Nenhum clube encontrado
          </div>
        ) : (
          <div className="divide-y overflow-x-auto">
            {filteredClubs.map((club, index) => (
              <div
                key={club.clubId}
                className="px-4 py-3 hover:bg-muted/30 min-w-[900px]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-6 text-right">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {club.clubName}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">
                        {club.clubId}
                      </span>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-6">
                    {summaryMetricColumns.map((col) => {
                      const rawValue = club[col.key as keyof typeof club];
                      const isNegative =
                        typeof rawValue === "number" && rawValue < 0;
                      const isPositive =
                        typeof rawValue === "number" && rawValue > 0;
                      const isHighlight =
                        col.key === "playerEarningsGeneral" ||
                        col.key === "clubEarningsGeneral";
                      return (
                        <div key={col.key} className="text-right min-w-[120px]">
                          <div className="text-[10px] text-muted-foreground">
                            {col.label}
                          </div>
                          <div
                            className={`font-mono text-xs ${
                              isHighlight && isNegative
                                ? "text-[#FF3638]"
                                : isHighlight && isPositive
                                  ? "text-[#00C969]"
                                  : ""
                            }`}
                          >
                            {formatValue(rawValue, col.type)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {expanded && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    {extraMetricColumns.map((col) => (
                      <div
                        key={col.key}
                        className="px-2 py-1 rounded bg-muted/30 font-mono"
                      >
                        <span className="opacity-70">{col.label}:</span>{" "}
                        {formatValue(
                          club[col.key as keyof typeof club],
                          col.type,
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="px-4 py-3 bg-muted/40 font-semibold min-w-[900px]">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-6 text-right">
                  —
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">TOTAL</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">
                      {filteredClubs.length} clubes
                    </span>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-6">
                  {summaryMetricColumns.map((col) => {
                    const total =
                      col.type === "currency" || col.type === "number"
                        ? filteredClubs.reduce((sum, club) => {
                            const val = club[col.key as keyof typeof club];
                            return sum + (typeof val === "number" ? val : 0);
                          }, 0)
                        : null;
                    return (
                      <div key={col.key} className="text-right min-w-[120px]">
                        <div className="text-[10px] text-muted-foreground">
                          {col.label}
                        </div>
                        <div
                          className={`font-mono text-xs ${
                            col.type === "currency" &&
                            total !== null &&
                            total < 0
                              ? "text-[#FF3638]"
                              : col.type === "currency" && total !== null
                                ? "text-[#00C969]"
                                : ""
                          }`}
                        >
                          {total !== null ? formatValue(total, col.type) : "-"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatValue(
  value: string | number | null | undefined,
  type: string,
): string {
  if (value === null || value === undefined) return "-";

  switch (type) {
    case "currency":
      return typeof value === "number"
        ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "-";
    case "number":
      return typeof value === "number" ? value.toLocaleString("pt-BR") : "-";
    case "id":
      return String(value);
    default:
      return String(value) || "-";
  }
}
