"use client";

import { formatCurrency, formatPercent } from "@/utils/format";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Summary = {
  ppPokerId: string;
  nickname: string;
  agentPpPokerId: string | null;
  rakeTotal: number;
};

type Session = {
  sessionType: string;
  totalRake: number;
};

type ResumoTabProps = {
  stats: {
    totalPlayers: number;
    totalAgents: number;
    totalSuperAgents: number;
    playersWithAgent: number;
    playersWithoutAgent: number;
    totalSessions: number;
    cashGames: number;
    mttGames: number;
    sitngGames: number;
    spinGames: number;
    totalRake: number;
    totalWinnings: number;
    winners: number;
    losers: number;
  };
  weekPeriod: {
    weekStart: string;
    weekEnd: string;
  };
  settlementsSummary: {
    totalSettlements: number;
    totalGross: number;
    totalRakeback: number;
    totalNet: number;
    playersWithPositiveBalance: number;
    playersWithNegativeBalance: number;
  };
  financials?: {
    leagueFee: number;
    leagueFeePercent: number;
    appFee: number;
    appFeePercent: number;
    totalExpenses: number;
  };
  summaries?: Summary[];
  sessions?: Session[];
};

function formatWeekRange(start: string, end: string) {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const startDay = format(startDate, "EEE", { locale: ptBR });
  const endDay = format(endDate, "EEE", { locale: ptBR });
  return {
    range: `${format(startDate, "dd/MM/yyyy")} - ${format(endDate, "dd/MM/yyyy")}`,
    days: `${startDay} a ${endDay}`,
  };
}

export function ResumoTab({
  stats,
  weekPeriod,
  settlementsSummary,
  financials,
  summaries = [],
  sessions = [],
}: ResumoTabProps) {
  const weekRange = formatWeekRange(weekPeriod.weekStart, weekPeriod.weekEnd);
  const totalTorneios = stats.mttGames + stats.sitngGames + stats.spinGames;

  // Calculate rake by agent status
  const rakeFromPlayersWithAgent = summaries
    .filter((s) => s.agentPpPokerId)
    .reduce((sum, s) => sum + s.rakeTotal, 0);
  const rakeFromPlayersWithoutAgent = summaries
    .filter((s) => !s.agentPpPokerId)
    .reduce((sum, s) => sum + s.rakeTotal, 0);

  // Calculate rake by session type
  const rakeByType = {
    cash: sessions
      .filter((s) => s.sessionType === "cash_game")
      .reduce((sum, s) => sum + s.totalRake, 0),
    mtt: sessions
      .filter((s) => s.sessionType === "mtt")
      .reduce((sum, s) => sum + s.totalRake, 0),
    sitng: sessions
      .filter((s) => s.sessionType === "sit_and_go")
      .reduce((sum, s) => sum + s.totalRake, 0),
    spin: sessions
      .filter((s) => s.sessionType === "spin")
      .reduce((sum, s) => sum + s.totalRake, 0),
  };

  // Financial calculations
  const lucroBruto = stats.totalRake;
  const rakePosRakeback = stats.totalRake - settlementsSummary.totalRakeback;
  const despesasOperacionais =
    (financials?.leagueFee || 0) + (financials?.appFee || 0);
  const lucroLiquido =
    rakePosRakeback - despesasOperacionais - (financials?.totalExpenses || 0);
  const margemLiquida = lucroBruto > 0 ? (lucroLiquido / lucroBruto) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header - Period info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icons.CalendarMonth className="w-4 h-4" />
        <span className="font-mono">{weekRange.range}</span>
        <span className="text-xs">({weekRange.days})</span>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Financial Summary */}
        <div className="space-y-5">
          {/* Hero: Lucro Líquido */}
          <div className="pb-4 border-b border-[#2a2a2a]">
            <span className="text-xs text-muted-foreground">Lucro Líquido</span>
            <div className="flex items-baseline gap-3 mt-0.5">
              <span
                className={cn(
                  "text-3xl font-bold font-mono",
                  lucroLiquido >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
                )}
              >
                {formatCurrency(lucroLiquido)}
              </span>
              <span
                className={cn(
                  "text-xs font-mono",
                  margemLiquida >= 0
                    ? "text-[#00C969]/60"
                    : "text-[#FF3638]/60",
                )}
              >
                {formatPercent(margemLiquida)} margem
              </span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rake Total</span>
              <span className="font-mono text-[#00C969]">
                {formatCurrency(lucroBruto)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                − Rakeback
                <span className="text-[10px] ml-1 opacity-50">
                  (
                  {lucroBruto > 0
                    ? formatPercent(
                        (settlementsSummary.totalRakeback / lucroBruto) * 100,
                      )
                    : "0%"}
                  )
                </span>
              </span>
              <span className="font-mono text-orange-500">
                {formatCurrency(settlementsSummary.totalRakeback)}
              </span>
            </div>

            {financials?.leagueFee ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  − Taxa Liga{" "}
                  <span className="text-[10px] opacity-50">
                    ({financials.leagueFeePercent}%)
                  </span>
                </span>
                <span className="font-mono text-purple-500">
                  {formatCurrency(financials.leagueFee)}
                </span>
              </div>
            ) : null}

            {financials?.appFee ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  − Taxa App{" "}
                  <span className="text-[10px] opacity-50">
                    ({financials.appFeePercent}%)
                  </span>
                </span>
                <span className="font-mono text-blue-500">
                  {formatCurrency(financials.appFee)}
                </span>
              </div>
            ) : null}

            {(financials?.totalExpenses || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">− Outras Despesas</span>
                <span className="font-mono text-[#FF3638]">
                  {formatCurrency(financials?.totalExpenses || 0)}
                </span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-[#2a2a2a]">
              <span className="text-muted-foreground">= Rake do Clube</span>
              <span className="font-mono font-medium">
                {formatCurrency(rakePosRakeback)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Activity Stats */}
        <div className="space-y-4">
          {/* Jogadores */}
          <div className="flex justify-between items-start pb-3 border-b border-[#2a2a2a]">
            <div>
              <span className="text-xs text-muted-foreground">Jogadores</span>
              <div className="text-2xl font-bold font-mono">
                {stats.totalPlayers}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                <span className="text-[#00C969]">+{stats.winners}</span>
                {" / "}
                <span className="text-[#FF3638]">−{stats.losers}</span>
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <div className="flex justify-between gap-4 text-muted-foreground">
                <span>
                  Com agente:{" "}
                  <span className="font-mono text-foreground">
                    {stats.playersWithAgent}
                  </span>
                </span>
                <span className="font-mono text-[#00C969]">
                  {formatCurrency(rakeFromPlayersWithAgent)}
                </span>
              </div>
              <div
                className={cn(
                  "flex justify-between gap-4",
                  stats.playersWithoutAgent > 0
                    ? "text-orange-500"
                    : "text-muted-foreground",
                )}
              >
                <span>
                  Sem agente:{" "}
                  <span className="font-mono font-medium">
                    {stats.playersWithoutAgent}
                  </span>
                </span>
                <span className="font-mono text-[#00C969]">
                  {formatCurrency(rakeFromPlayersWithoutAgent)}
                </span>
              </div>
            </div>
          </div>

          {/* Agentes */}
          <div className="flex justify-between items-start pb-3 border-b border-[#2a2a2a]">
            <div>
              <span className="text-xs text-muted-foreground">Agentes</span>
              <div className="text-2xl font-bold font-mono">
                {stats.totalAgents}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>
                Super Agentes:{" "}
                <span className="font-mono text-foreground">
                  {stats.totalSuperAgents}
                </span>
              </div>
            </div>
          </div>

          {/* Partidas */}
          <div className="flex justify-between items-start pb-3 border-b border-[#2a2a2a]">
            <div>
              <span className="text-xs text-muted-foreground">Partidas</span>
              <div className="text-2xl font-bold font-mono">
                {stats.totalSessions}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground space-y-0.5">
              <div className="flex justify-between gap-4">
                <span>
                  Cash:{" "}
                  <span className="font-mono text-foreground">
                    {stats.cashGames}
                  </span>
                </span>
                <span className="font-mono text-[#00C969]">
                  {formatCurrency(rakeByType.cash)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>
                  MTT:{" "}
                  <span className="font-mono text-foreground">
                    {stats.mttGames}
                  </span>
                </span>
                <span className="font-mono text-[#00C969]">
                  {formatCurrency(rakeByType.mtt)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>
                  Sit&Go:{" "}
                  <span className="font-mono text-foreground">
                    {stats.sitngGames}
                  </span>
                </span>
                <span className="font-mono text-[#00C969]">
                  {formatCurrency(rakeByType.sitng)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>
                  Spin:{" "}
                  <span className="font-mono text-foreground">
                    {stats.spinGames}
                  </span>
                </span>
                <span className="font-mono text-[#00C969]">
                  {formatCurrency(rakeByType.spin)}
                </span>
              </div>
            </div>
          </div>

          {/* Ganhos Jogadores */}
          <div className="flex justify-between items-start pb-3 border-b border-[#2a2a2a]">
            <div>
              <span className="text-xs text-muted-foreground">
                Ganhos Jogadores
              </span>
              <div
                className={cn(
                  "text-2xl font-bold font-mono",
                  stats.totalWinnings >= 0
                    ? "text-[#00C969]"
                    : "text-[#FF3638]",
                )}
              >
                {formatCurrency(stats.totalWinnings)}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>
                Winners:{" "}
                <span className="font-mono text-[#00C969]">
                  {stats.winners}
                </span>
              </div>
              <div>
                Losers:{" "}
                <span className="font-mono text-[#FF3638]">{stats.losers}</span>
              </div>
            </div>
          </div>

          {/* Acertos */}
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-muted-foreground">Acertos</span>
              <div className="text-2xl font-bold font-mono">
                {settlementsSummary.totalSettlements}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground space-y-0.5">
              <div>
                Bruto:{" "}
                <span className="font-mono text-foreground">
                  {formatCurrency(settlementsSummary.totalGross)}
                </span>
              </div>
              <div>
                Rakeback:{" "}
                <span className="font-mono text-orange-500">
                  {formatCurrency(settlementsSummary.totalRakeback)}
                </span>
              </div>
              <div>
                Líquido:{" "}
                <span className="font-mono text-foreground">
                  {formatCurrency(settlementsSummary.totalNet)}
                </span>
              </div>
              <div className="pt-1">
                <span className="text-[#00C969]">
                  +{settlementsSummary.playersWithPositiveBalance}
                </span>
                {" / "}
                <span className="text-[#FF3638]">
                  −{settlementsSummary.playersWithNegativeBalance}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
