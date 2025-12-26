"use client";

import type {
  LeagueValidationResult,
  ParsedLeagueImportData,
} from "@/lib/league/types";
import { Icons } from "@midday/ui/icons";
import { getWeek, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";

// Chave do localStorage (mesma da página de grade)
const SCHEDULE_STORAGE_KEY = "ppst-tournament-schedule";

// Tipo para dados salvos no localStorage
interface StoredScheduleData {
  weekNumber: number;
  totalGTD: number;
  totalTournaments: number;
  weekInfo: {
    startDate: string;
    endDate: string;
  };
  savedAt: string;
}

interface LeagueOverviewTabProps {
  parsedData: ParsedLeagueImportData;
  validationResult: LeagueValidationResult;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Helper para obter número da semana de uma data (YYYY-MM-DD ou DD/MM/YYYY)
function getWeekFromDateString(dateStr: string): number | null {
  try {
    // Tenta formato yyyy-MM-dd primeiro
    let date = parse(dateStr, "yyyy-MM-dd", new Date());
    if (Number.isNaN(date.getTime())) {
      // Tenta formato dd/MM/yyyy
      date = parse(dateStr, "dd/MM/yyyy", new Date(), { locale: ptBR });
    }
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    // Usa mesmas opções do modal header para consistência
    return getWeek(date, { weekStartsOn: 0, firstWeekContainsDate: 1 });
  } catch {
    return null;
  }
}

export function LeagueOverviewTab({
  parsedData,
  validationResult,
}: LeagueOverviewTabProps) {
  const { stats } = validationResult;

  // Estado para dados da grade salvos
  const [scheduleData, setScheduleData] = useState<StoredScheduleData | null>(null);

  // Carregar dados da grade do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (stored) {
        setScheduleData(JSON.parse(stored));
      }
    } catch {
      // Ignora erros de parse
    }
  }, []);

  // Calcular semana do PPST baseado no período do validationResult
  const ppstWeekNumber = useMemo(() => {
    // Usa o período do validationResult (mesmo que aparece no header do modal)
    if (validationResult.period.start) {
      return getWeekFromDateString(validationResult.period.start);
    }
    if (validationResult.period.end) {
      return getWeekFromDateString(validationResult.period.end);
    }
    return null;
  }, [validationResult.period.start, validationResult.period.end]);

  // Conferência cruzada: compara GTD da grade com GTD realizado
  const crossValidation = useMemo(() => {
    if (!scheduleData || !ppstWeekNumber) {
      return null;
    }

    // Só compara se for a mesma semana
    if (scheduleData.weekNumber !== ppstWeekNumber) {
      return {
        match: false,
        reason: "different_week",
        scheduleWeek: scheduleData.weekNumber,
        ppstWeek: ppstWeekNumber,
      };
    }

    // Calcula a diferença de GTD
    // Grade está em fichas, PPST está em Reais (×5)
    // Converte Grade para Reais para comparar na mesma unidade
    const gtdScheduledFichas = scheduleData.totalGTD;
    const gtdScheduledReais = gtdScheduledFichas * 5;
    const gtdRealizedReais = parsedData.jogosPPST.reduce((sum, jogo) => {
      const gtd = jogo.metadata?.premiacaoGarantida || 0;
      return sum + gtd;
    }, 0);
    const gtdDiffReais = gtdScheduledReais - gtdRealizedReais;

    // Conta torneios com GTD na grade vs realizados
    const tournamentsScheduled = scheduleData.totalTournaments;
    const tournamentsWithGTD = parsedData.jogosPPST.filter(
      (j) => j.metadata?.premiacaoGarantida && j.metadata.premiacaoGarantida > 0
    ).length;

    return {
      match: true,
      scheduleWeek: scheduleData.weekNumber,
      ppstWeek: ppstWeekNumber,
      gtdScheduledFichas,
      gtdScheduledReais,
      gtdRealizedReais,
      gtdDiffReais,
      tournamentsScheduled,
      tournamentsWithGTD,
      isBalanced: Math.abs(gtdDiffReais) < 100, // considera igual se diferença < 100 reais
    };
  }, [scheduleData, ppstWeekNumber, parsedData.jogosPPST]);

  // Calculate game type counts
  const gameTypeCounts = useMemo(() => {
    const counts = { mtt: 0, spin: 0, pko: 0, mko: 0, sat: 0, total: 0 };
    for (const jogo of parsedData.jogosPPST) {
      counts.total++;
      const tipoJogo = jogo.metadata.tipoJogo;
      const subtipo = jogo.metadata.subtipo;

      if (tipoJogo.includes("SPINUP")) {
        counts.spin++;
      } else if (subtipo === "knockout") {
        if (tipoJogo.includes("PKO")) {
          counts.pko++;
        } else {
          counts.mko++;
        }
      } else if (subtipo === "satellite") {
        counts.sat++;
      } else {
        counts.mtt++;
      }
    }
    return counts;
  }, [parsedData.jogosPPST]);

  // Calculate GTD stats (GTD total, arrecadação, gap)
  const gtdStats = useMemo(() => {
    let totalGTD = 0;
    let totalArrecadacao = 0;
    let gtdCount = 0;

    for (const jogo of parsedData.jogosPPST) {
      if (jogo.metadata.premiacaoGarantida && jogo.metadata.premiacaoGarantida > 0) {
        totalGTD += jogo.metadata.premiacaoGarantida;
        gtdCount++;
        // Sum all buy-ins from players
        const arrecadacao = jogo.jogadores.reduce((sum, j) => sum + j.buyinFichas, 0);
        totalArrecadacao += arrecadacao;
      }
    }

    return {
      totalGTD,
      totalArrecadacao,
      gtdCount,
      gap: totalGTD - totalArrecadacao, // positive = overlay, negative = profit
    };
  }, [parsedData.jogosPPST]);

  // Calculate total taxa from Geral PPST
  const totalTaxa = useMemo(() => {
    let total = 0;
    for (const bloco of parsedData.geralPPST) {
      for (const liga of bloco.ligas) {
        total += liga.ganhosLigaTaxa;
      }
    }
    return total;
  }, [parsedData.geralPPST]);

  // Cross-validation counts
  const inicioCount = parsedData.jogosPPSTInicioCount ?? 0;
  const jogosCount = stats.totalJogosPPST;
  const cancelledCount = inicioCount > jogosCount ? inicioCount - jogosCount : 0;

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Torneios */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.PlayOutline className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Torneios</span>
          </div>
          <p className="text-2xl font-bold">{formatNumber(jogosCount)}</p>
          <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
            <div>aba Jogos PPST</div>
            {cancelledCount > 0 && (
              <div className="flex justify-between text-amber-500">
                <span>Cancelados</span>
                <span className="font-mono">{formatNumber(cancelledCount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Jogadores */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.AccountCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Jogadores</span>
          </div>
          <p className="text-2xl font-bold">{formatNumber(stats.totalJogadoresPPST)}</p>
          <div className="mt-2 text-[11px] text-muted-foreground">
            <div>participações totais</div>
          </div>
        </div>

        {/* Ligas */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Accounts className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Ligas</span>
          </div>
          <p className="text-2xl font-bold">{formatNumber(stats.totalLigasPPST)}</p>
          <div className="mt-2 text-[11px] text-muted-foreground">
            <div>aba Geral PPST</div>
          </div>
        </div>

        {/* Taxa Total */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.ReceiptLong className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Taxa Total</span>
          </div>
          <p className="text-2xl font-bold text-[#00C969]">{formatNumber(totalTaxa)}</p>
          <div className="mt-2 text-[11px] text-muted-foreground">
            <div>col. J (Geral PPST)</div>
            <div className="flex justify-between opacity-70">
              <span>R$ {formatNumber(totalTaxa * 5)}</span>
              <span>(×5)</span>
            </div>
          </div>
        </div>

        {/* GTD Total */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">GTD Total</span>
          </div>
          <p className="text-2xl font-bold">{formatNumber(gtdStats.totalGTD)}</p>
          <div className="mt-2 text-[11px] text-muted-foreground">
            <div>header "Premiação Garantida"</div>
            <div className="flex justify-between opacity-70">
              <span>R$ {formatNumber(gtdStats.totalGTD * 5)}</span>
              <span>(×5)</span>
            </div>
          </div>
        </div>

        {/* Arrecadação */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Currency className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Arrecadação</span>
          </div>
          <p className="text-2xl font-bold text-blue-500">{formatNumber(gtdStats.totalArrecadacao)}</p>
          <div className="mt-2 text-[11px] text-muted-foreground">
            <div>col. J (torneios c/ GTD)</div>
            <div className="flex justify-between opacity-70">
              <span>R$ {formatNumber(gtdStats.totalArrecadacao * 5)}</span>
              <span>(×5)</span>
            </div>
          </div>
        </div>

        {/* Gap */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Speed className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Gap (Overlay)</span>
          </div>
          <p className={`text-2xl font-bold ${gtdStats.gap > 0 ? "text-red-500" : "text-green-500"}`}>
            {gtdStats.gap > 0 ? "-" : "+"}{formatNumber(Math.abs(gtdStats.gap))}
          </p>
          <div className="mt-2 text-[11px] text-muted-foreground">
            <div>GTD - Arrecadação</div>
            <div className="flex justify-between opacity-70">
              <span>R$ {gtdStats.gap > 0 ? "-" : "+"}{formatNumber(Math.abs(gtdStats.gap) * 5)}</span>
              <span>(×5)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Tipos de Torneio */}
      <div className="grid grid-cols-1 gap-4">
        {/* Tipos de Torneio */}
        <div className="p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Icons.Category className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Tipos de Torneio</span>
            <span className="ml-auto text-2xl font-bold">{formatNumber(gameTypeCounts.total)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {gameTypeCounts.mtt > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-blue-500/10 text-xs">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">MTT</span>
                <span className="font-mono font-medium">{formatNumber(gameTypeCounts.mtt)}</span>
              </div>
            )}
            {gameTypeCounts.spin > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-pink-500/10 text-xs">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                <span className="text-muted-foreground">SPIN</span>
                <span className="font-mono font-medium">{formatNumber(gameTypeCounts.spin)}</span>
              </div>
            )}
            {gameTypeCounts.pko > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-orange-500/10 text-xs">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">PKO</span>
                <span className="font-mono font-medium">{formatNumber(gameTypeCounts.pko)}</span>
              </div>
            )}
            {gameTypeCounts.mko > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-orange-400/10 text-xs">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-muted-foreground">MKO</span>
                <span className="font-mono font-medium">{formatNumber(gameTypeCounts.mko)}</span>
              </div>
            )}
            {gameTypeCounts.sat > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded bg-purple-500/10 text-xs">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-muted-foreground">SAT</span>
                <span className="font-mono font-medium">{formatNumber(gameTypeCounts.sat)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cross-validation with Schedule (Grade de Torneios) */}
      {crossValidation && (
        <div className="p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center gap-2 mb-4">
            <Icons.SyncAlt className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Conferência com Grade de Torneios</span>
            <span className="text-xs text-muted-foreground ml-auto">
              Semana {crossValidation.scheduleWeek}
            </span>
          </div>

          {crossValidation.match === false && crossValidation.reason === "different_week" ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Icons.AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-600">
                Grade carregada é da Semana {crossValidation.scheduleWeek}, mas PPST é da Semana {crossValidation.ppstWeek}
              </span>
            </div>
          ) : crossValidation.match ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* GTD Previsto (Grade) */}
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-xs text-muted-foreground">GTD Previsto</span>
                <p className="text-lg font-bold mt-1">R$ {formatNumber(crossValidation.gtdScheduledReais)}</p>
                <span className="text-[10px] text-muted-foreground">na grade ({formatNumber(crossValidation.gtdScheduledFichas)} fichas)</span>
              </div>

              {/* GTD Realizado (PPST) */}
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-xs text-muted-foreground">GTD Realizado</span>
                <p className="text-lg font-bold mt-1">R$ {formatNumber(crossValidation.gtdRealizedReais)}</p>
                <span className="text-[10px] text-muted-foreground">no PPST</span>
              </div>

              {/* Diferença */}
              <div className={`p-3 rounded-lg ${
                crossValidation.isBalanced
                  ? "bg-[#00C969]/10"
                  : crossValidation.gtdDiffReais > 0
                    ? "bg-amber-500/10"
                    : "bg-blue-500/10"
              }`}>
                <span className="text-xs text-muted-foreground">Diferença GTD</span>
                <p className={`text-lg font-bold mt-1 ${
                  crossValidation.isBalanced
                    ? "text-[#00C969]"
                    : crossValidation.gtdDiffReais > 0
                      ? "text-amber-500"
                      : "text-blue-500"
                }`}>
                  {crossValidation.isBalanced
                    ? "✓ OK"
                    : `R$ ${crossValidation.gtdDiffReais > 0 ? "+" : ""}${formatNumber(crossValidation.gtdDiffReais)}`
                  }
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {crossValidation.isBalanced
                    ? "valores iguais"
                    : crossValidation.gtdDiffReais > 0
                      ? "faltou criar"
                      : "criado a mais"
                  }
                </span>
              </div>

              {/* Torneios GTD */}
              <div className="p-3 rounded-lg bg-muted/30">
                <span className="text-xs text-muted-foreground">Torneios GTD</span>
                <p className="text-lg font-bold mt-1">
                  {crossValidation.tournamentsWithGTD} / {crossValidation.tournamentsScheduled}
                </p>
                <span className="text-[10px] text-muted-foreground">criados / previstos</span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Info se não tiver grade carregada */}
      {!scheduleData && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-dashed">
          <Icons.Info className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Importe a Grade de Torneios PPST para conferir GTD previsto vs realizado
          </span>
        </div>
      )}
    </div>
  );
}
