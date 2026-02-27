"use client";

import type { ValidationResult } from "@/lib/poker/types";
import { formatCurrency } from "@/utils/format";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type OverviewTabProps = {
  result: ValidationResult;
};

export function OverviewTab({ result }: OverviewTabProps) {
  const { period, stats, topPerformers } = result;

  return (
    <div className="space-y-6">
      {/* Period */}
      <div className="border rounded-lg p-4">
        <p className="text-xs text-[#878787] mb-1">Período</p>
        <p className="font-medium">
          {period.start && period.end
            ? `${formatDate(period.start)} — ${formatDate(period.end)}`
            : "Não detectado"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-[#878787] mb-1">Jogadores</p>
          <p className="text-xl font-mono">{stats.totalPlayers}</p>
          <p className="text-xs text-[#878787] mt-1">
            {stats.winners} vencedores · {stats.losers} perdedores
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-[#878787] mb-1">Ganhos/Perdas</p>
          <p
            className={`text-xl font-mono ${stats.totalWinnings >= 0 ? "text-[#00C969]" : ""}`}
          >
            {formatCurrency(stats.totalWinnings)}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-[#878787] mb-1">Rake Total</p>
          <p className="text-xl font-mono">{formatCurrency(stats.totalRake)}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-[#878787] mb-1">Partidas</p>
          <p className="text-xl font-mono">
            {stats.totalSessions || stats.totalPlayers}
          </p>
          <p className="text-xs text-[#878787] mt-1">
            Cash: {stats.cashGameSessions} · MTT: {stats.mttSessions}
          </p>
        </div>
      </div>

      {/* Top Performers */}
      {(topPerformers.majorWinner || topPerformers.majorLoser) && (
        <div className="border rounded-lg divide-y">
          {topPerformers.majorWinner && (
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-[#878787]">Maior ganho</p>
                <p className="font-medium">{topPerformers.majorWinner.name}</p>
              </div>
              <p className="font-mono text-[#00C969]">
                +{formatCurrency(topPerformers.majorWinner.value)}
              </p>
            </div>
          )}
          {topPerformers.majorLoser && (
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-[#878787]">Maior perda</p>
                <p className="font-medium">{topPerformers.majorLoser.name}</p>
              </div>
              <p className="font-mono">
                {formatCurrency(topPerformers.majorLoser.value)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Transactions */}
      <div className="border rounded-lg divide-y">
        <div className="flex items-center justify-between p-4">
          <span className="text-[#878787]">Total de Transações</span>
          <span className="font-mono">
            {stats.totalTransactions.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="text-[#878787]">Volume Total</span>
          <span className="font-mono">
            {formatCurrency(stats.transactionVolume)}
          </span>
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="text-[#878787]">Média por Transação</span>
          <span className="font-mono">
            {formatCurrency(stats.avgTransactionValue)}
          </span>
        </div>
      </div>

      {/* Quality Score */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#878787]">Qualidade dos dados</span>
          <span className="font-mono text-lg">{result.qualityScore}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${result.qualityScore}%` }}
          />
        </div>
        <p className="text-xs text-[#878787] mt-2">
          {result.passedChecks} de {result.totalChecks} verificações aprovadas
        </p>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}
