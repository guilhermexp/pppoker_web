"use client";

import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";

type LigaTabProps = {
  stats: {
    totalRake: number;
    totalPlayers: number;
    totalSessions: number;
    totalWinnings: number;
  };
  leagueSettings?: {
    leagueName: string;
    leagueFeePercent: number;
  };
  onLeagueFeeChange?: (percent: number) => void;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function LigaTab({
  stats,
  leagueSettings,
  onLeagueFeeChange,
}: LigaTabProps) {
  const playerWinnings = stats.totalWinnings;
  const rakeBalance = stats.totalRake;
  const settlementResult = playerWinnings - rakeBalance;

  const leaguePays = settlementResult > 0;
  const clubPays = settlementResult < 0;
  const settlementAmount = Math.abs(settlementResult);

  const leagueFee = leagueSettings
    ? (stats.totalRake * leagueSettings.leagueFeePercent) / 100
    : 0;

  // Margin calculation (how much of the settlement is the fee)
  const feeMargin =
    settlementAmount > 0 && leagueFee > 0
      ? (leagueFee / settlementAmount) * 100
      : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header - Liga info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icons.Accounts className="w-4 h-4" />
          <span className="font-medium">
            {leagueSettings?.leagueName || "Acerto com Liga"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Taxa da Liga:</span>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={leagueSettings?.leagueFeePercent ?? ""}
              onChange={(e) =>
                onLeagueFeeChange?.(Number.parseFloat(e.target.value) || 0)
              }
              placeholder="0"
              className="w-16 text-right font-mono h-7 text-sm"
              min={0}
              max={100}
              step={0.1}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Financial Summary */}
        <div className="space-y-5">
          {/* Hero: Resultado do Acerto */}
          <div className="pb-4 border-b border-[#2a2a2a]">
            <span className="text-xs text-muted-foreground">
              Resultado do Acerto
            </span>
            <div className="flex items-baseline gap-3 mt-0.5">
              <span
                className={cn(
                  "text-3xl font-bold font-mono",
                  leaguePays
                    ? "text-[#00C969]"
                    : clubPays
                      ? "text-[#FF3638]"
                      : "text-muted-foreground",
                )}
              >
                {leaguePays ? "+" : clubPays ? "-" : ""}
                {formatCurrency(settlementAmount)}
              </span>
              {leagueFee > 0 && (
                <span className="text-xs font-mono text-purple-500/60">
                  {formatPercent(feeMargin)} taxa
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {leaguePays
                ? "Liga paga pro Clube"
                : clubPays
                  ? "Clube paga pra Liga"
                  : "Sem acerto pendente"}
            </p>
          </div>

          {/* Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Ganhos dos Jogadores
              </span>
              <span
                className={cn(
                  "font-mono",
                  playerWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
                )}
              >
                {formatCurrency(playerWinnings)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">− Rake Total</span>
              <span className="font-mono text-[#00C969]">
                {formatCurrency(rakeBalance)}
              </span>
            </div>

            <div className="flex justify-between pt-2 border-t border-[#2a2a2a]">
              <span className="text-muted-foreground">= Saldo</span>
              <span
                className={cn(
                  "font-mono font-medium",
                  settlementResult >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
                )}
              >
                {formatCurrency(settlementResult)}
              </span>
            </div>

            {leagueSettings && leagueSettings.leagueFeePercent > 0 && (
              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">
                  Taxa da Liga
                  <span className="text-[10px] ml-1 opacity-50">
                    ({formatPercent(leagueSettings.leagueFeePercent)} do rake)
                  </span>
                </span>
                <span className="font-mono text-purple-500">
                  {formatCurrency(leagueFee)}
                </span>
              </div>
            )}
          </div>

          {/* Note */}
          <div className="text-xs text-muted-foreground/60 flex items-start gap-2 pt-2">
            <Icons.Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              Positivo = Liga deve ao Clube · Negativo = Clube deve à Liga
            </span>
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
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Ativos na semana</div>
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
            <div className="text-right text-xs text-muted-foreground">
              <div>Total de sessões</div>
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
                  playerWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
                )}
              >
                {formatCurrency(playerWinnings)}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Resultado líquido</div>
            </div>
          </div>

          {/* Rake Total */}
          <div className="flex justify-between items-start pb-3 border-b border-[#2a2a2a]">
            <div>
              <span className="text-xs text-muted-foreground">Rake Total</span>
              <div className="text-2xl font-bold font-mono text-[#00C969]">
                {formatCurrency(rakeBalance)}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Arrecadado</div>
            </div>
          </div>

          {/* Taxa da Liga */}
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-muted-foreground">
                Taxa da Liga
              </span>
              <div className="text-2xl font-bold font-mono text-purple-500">
                {formatCurrency(leagueFee)}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>
                {leagueSettings
                  ? `${formatPercent(leagueSettings.leagueFeePercent)} do rake`
                  : "Não configurado"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
