"use client";

import type {
  LeagueValidationResult,
  ParsedLeagueImportData,
} from "@/lib/league/types";
import { Icons } from "@midpoker/ui/icons";
import { getWeek, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";

// Chave do localStorage (mesma da página de grade)
const SCHEDULE_STORAGE_KEY = "ppst-tournament-schedule";

// Tipo para torneio salvo
interface StoredTournament {
  name: string;
  day: string;
  time: string;
  gtd: number;
  buyIn: string;
  game: string;
}

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
  // Nomes dos torneios com GTD para comparação (legacy)
  tournamentNames?: string[];
  // Torneios completos com detalhes
  tournaments?: StoredTournament[];
}

// Labels para os dias
const dayLabels: Record<string, string> = {
  MONDAY: "Seg",
  TUESDAY: "Ter",
  WEDNESDAY: "Qua",
  THURSDAY: "Qui",
  FRIDAY: "Sex",
  SATURDAY: "Sáb",
  SUNDAY: "Dom",
};

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
  const [scheduleData, setScheduleData] = useState<StoredScheduleData | null>(
    null,
  );

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
      (j) =>
        j.metadata?.premiacaoGarantida && j.metadata.premiacaoGarantida > 0,
    ).length;

    // Comparar nomes dos torneios (grade vs planilha)
    let missingTournaments: StoredTournament[] = [];
    let missingGTDTotal = 0;

    // Nomes da planilha PPST (nomeMesa = nome do torneio)
    const ppstNames = new Set(
      parsedData.jogosPPST
        .filter(
          (j) =>
            j.metadata?.premiacaoGarantida && j.metadata.premiacaoGarantida > 0,
        )
        .map((j) => j.metadata.nomeMesa.trim().toUpperCase()),
    );

    // Usar torneios completos se disponível, senão fallback para nomes
    if (scheduleData.tournaments && scheduleData.tournaments.length > 0) {
      missingTournaments = scheduleData.tournaments.filter(
        (t) => !ppstNames.has(t.name),
      );
      missingGTDTotal = missingTournaments.reduce(
        (sum, t) => sum + t.gtd * 5,
        0,
      ); // GTD em reais
    } else if (
      scheduleData.tournamentNames &&
      scheduleData.tournamentNames.length > 0
    ) {
      // Fallback para dados antigos (só nomes)
      missingTournaments = scheduleData.tournamentNames
        .filter((name) => !ppstNames.has(name))
        .map((name) => ({
          name,
          day: "",
          time: "",
          gtd: 0,
          buyIn: "",
          game: "",
        }));
    }

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
      missingTournaments,
      missingGTDTotal,
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
      if (
        jogo.metadata.premiacaoGarantida &&
        jogo.metadata.premiacaoGarantida > 0
      ) {
        totalGTD += jogo.metadata.premiacaoGarantida;
        gtdCount++;
        // Sum all buy-ins from players
        const arrecadacao = jogo.jogadores.reduce(
          (sum, j) => sum + j.buyinFichas,
          0,
        );
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

  // Soma dos totais das partidas (Jogos PPST)
  const partidasStats = useMemo(() => {
    let totalBuyin = 0;
    let totalGTD = 0;
    let totalGanhos = 0;
    let totalTaxa = 0;

    for (const jogo of parsedData.jogosPPST) {
      // GTD do header
      if (jogo.metadata.premiacaoGarantida) {
        totalGTD += jogo.metadata.premiacaoGarantida;
      }
      // Buyin, Ganhos, Taxa - do totalGeral ou soma dos jogadores
      const buyinFichas =
        jogo.totalGeral?.buyinFichas ||
        jogo.jogadores.reduce((s, j) => s + j.buyinFichas, 0);
      const ganhos =
        jogo.totalGeral?.ganhos ||
        jogo.jogadores.reduce((s, j) => s + j.ganhos, 0);
      const taxa =
        jogo.totalGeral?.taxa ||
        jogo.jogadores.reduce((s, j) => s + (j.taxa ?? 0), 0);

      totalBuyin += buyinFichas;
      totalGanhos += ganhos;
      totalTaxa += taxa;
    }

    return { totalBuyin, totalGTD, totalGanhos, totalTaxa };
  }, [parsedData.jogosPPST]);

  // Calculate overlay stats - torneios onde (Buyin - Taxa) < GTD
  const overlayStats = useMemo(() => {
    let overlayCount = 0;
    let totalOverlay = 0;

    for (const jogo of parsedData.jogosPPST) {
      // Só considera torneios com GTD
      if (
        !jogo.metadata.premiacaoGarantida ||
        jogo.metadata.premiacaoGarantida <= 0
      ) {
        continue;
      }

      const buyinFichas =
        jogo.totalGeral?.buyinFichas ||
        jogo.jogadores.reduce((s, j) => s + j.buyinFichas, 0);
      const buyinTicket =
        jogo.totalGeral?.buyinTicket ||
        jogo.jogadores.reduce((s, j) => s + (j.buyinTicket ?? 0), 0);
      const taxa =
        jogo.totalGeral?.taxa ||
        jogo.jogadores.reduce((s, j) => s + (j.taxa ?? 0), 0);
      const buyinLiquido = buyinFichas + buyinTicket - taxa;
      const gtd = jogo.metadata.premiacaoGarantida;
      const resultado = buyinLiquido - gtd;

      // Overlay = quando resultado é negativo (arrecadação menor que GTD)
      if (resultado < 0) {
        overlayCount++;
        totalOverlay += resultado; // valor negativo
      }
    }

    return { overlayCount, totalOverlay };
  }, [parsedData.jogosPPST]);

  // Calculate totals from Geral PPST - busca o bloco com ratio 1:5
  const geralPPSTTotals = useMemo(() => {
    // Procura o bloco com taxaCambio 1:5 (geralmente o primeiro)
    const bloco =
      parsedData.geralPPST?.find((b) => b.contexto?.taxaCambio === "1:5") ||
      parsedData.geralPPST?.[0];
    if (!bloco?.total) {
      return {
        ganhosJogador: 0,
        ganhosLigaTaxa: 0,
        ganhosLigaGeral: 0,
        gapGarantido: 0,
        contexto: null,
      };
    }
    return {
      ganhosJogador: bloco.total.ganhosJogador ?? 0,
      ganhosLigaTaxa: bloco.total.ganhosLigaTaxa ?? 0,
      ganhosLigaGeral: bloco.total.ganhosLigaGeral ?? 0,
      gapGarantido: bloco.total.gapGarantido ?? 0,
      contexto: bloco.contexto,
    };
  }, [parsedData.geralPPST]);

  // Taxa total = do primeiro bloco Geral PPST
  const totalTaxa = geralPPSTTotals.ganhosLigaTaxa;

  // Calculate totals from Geral PPSR - usa apenas o PRIMEIRO bloco (principal)
  const geralPPSRTotals = useMemo(() => {
    const bloco = parsedData.geralPPSR?.[0];
    if (!bloco?.total) {
      return { ganhosJogadorGeral: 0, ganhosLigaTaxa: 0, ganhosLigaGeral: 0 };
    }
    return {
      ganhosJogadorGeral: bloco.total.ganhosJogadorGeral ?? 0,
      ganhosLigaTaxa: bloco.total.ganhosLigaTaxa ?? 0,
      ganhosLigaGeral: bloco.total.ganhosLigaGeral ?? 0,
    };
  }, [parsedData.geralPPSR]);

  // PPSR: distribuição por tipo de cash
  const cashTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const jogo of parsedData.jogosPPSR) {
      const tipo = jogo.metadata.tipoCash;
      const label = tipo.replace(/^PPSR\//, "");
      counts[label] = (counts[label] || 0) + 1;
    }
    return counts;
  }, [parsedData.jogosPPSR]);

  // PPSR: soma dos totais das partidas
  const ppsrPartidasStats = useMemo(() => {
    let totalBuyin = 0;
    let totalGanhos = 0;
    let totalTaxa = 0;
    let totalMaos = 0;

    for (const jogo of parsedData.jogosPPSR) {
      const buyin =
        jogo.totalGeral?.buyinFichas ||
        jogo.jogadores.reduce((s, j) => s + j.buyinFichas, 0);
      const ganhos =
        jogo.totalGeral?.ganhosJogadorGeral ||
        jogo.jogadores.reduce((s, j) => s + j.ganhosJogadorGeral, 0);
      const taxa =
        jogo.totalGeral?.taxa || jogo.jogadores.reduce((s, j) => s + j.taxa, 0);
      const maos =
        jogo.totalGeral?.maos || jogo.jogadores.reduce((s, j) => s + j.maos, 0);
      totalBuyin += buyin;
      totalGanhos += ganhos;
      totalTaxa += taxa;
      totalMaos += maos;
    }

    return { totalBuyin, totalGanhos, totalTaxa, totalMaos };
  }, [parsedData.jogosPPSR]);

  // Cross-validation counts
  const inicioCount = parsedData.jogosPPSTInicioCount ?? 0;
  const jogosCount = stats.totalJogosPPST;
  const cancelledCount =
    inicioCount > jogosCount ? inicioCount - jogosCount : 0;

  // Color map for PPSR cash game types
  const cashTypeColors: Record<string, string> = {
    NLH: "text-green-500 bg-green-500/10 border-green-500/30",
    NLHOLDEM: "text-green-500 bg-green-500/10 border-green-500/30",
    PLO: "text-blue-500 bg-blue-500/10 border-blue-500/30",
    PLO5: "text-purple-500 bg-purple-500/10 border-purple-500/30",
    PLO6: "text-pink-500 bg-pink-500/10 border-pink-500/30",
    "6+": "text-orange-500 bg-orange-500/10 border-orange-500/30",
    "6+ NLH": "text-orange-500 bg-orange-500/10 border-orange-500/30",
    OFC: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
    "FLASH/NLH": "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
    "3-1": "text-teal-500 bg-teal-500/10 border-teal-500/30",
  };

  return (
    <div className="space-y-4">
      {/* Context Header - Liga e Taxa de Câmbio */}
      {geralPPSTTotals.contexto && (
        <div className="px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 inline-flex items-center gap-2">
          <span className="text-sm font-medium text-amber-500">
            Liga {geralPPSTTotals.contexto.entidadeId}
          </span>
          <span className="text-amber-500/50">•</span>
          <span className="text-sm text-amber-400">
            Taxa de câmbio {geralPPSTTotals.contexto.taxaCambio}
          </span>
        </div>
      )}

      {/* ── PPST & PPSR lado a lado ── */}
      <div className="grid grid-cols-2 gap-0 rounded-lg border border-border">
      {/* ── PPST (Torneios) ── */}
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-500">
            PPST — Torneios
          </span>
        </div>

        {/* Métricas principais */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Torneios
            </div>
            <div className="text-xl font-bold">{formatNumber(jogosCount)}</div>
            <div className="flex flex-wrap gap-x-2 text-[10px] text-muted-foreground mt-0.5">
              {gameTypeCounts.mtt > 0 && <span>MTT {gameTypeCounts.mtt}</span>}
              {gameTypeCounts.spin > 0 && (
                <span>Spin {gameTypeCounts.spin}</span>
              )}
              {gameTypeCounts.pko > 0 && <span>PKO {gameTypeCounts.pko}</span>}
              {gameTypeCounts.mko > 0 && <span>MKO {gameTypeCounts.mko}</span>}
              {gameTypeCounts.sat > 0 && <span>SAT {gameTypeCounts.sat}</span>}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Ligas
            </div>
            <div className="text-xl font-bold">
              {formatNumber(stats.totalLigasPPST)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Jogadores
            </div>
            <div className="text-xl font-bold">
              {formatNumber(stats.totalJogadoresPPST)}
            </div>
            {stats.totalParticipacoesPPST &&
              stats.totalParticipacoesPPST !== stats.totalJogadoresPPST && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Entradas {formatNumber(stats.totalParticipacoesPPST)}
                </div>
              )}
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Overlay{" "}
              <span className="text-muted-foreground/60">
                ({overlayStats.overlayCount})
              </span>
            </div>
            <div className="text-xl font-bold text-red-500">
              {formatNumber(Math.abs(overlayStats.totalOverlay))}
            </div>
          </div>
        </div>

        {/* Financeiro */}
        <div className="grid grid-cols-3 gap-4 border-t border-border pt-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Taxa Total
            </div>
            <div className="text-lg font-bold text-[#00C969]">
              {formatNumber(totalTaxa)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Ganhos Jogador
            </div>
            <div
              className={`text-lg font-bold ${geralPPSTTotals.ganhosJogador < 0 ? "text-red-500" : "text-[#00C969]"}`}
            >
              {formatNumber(geralPPSTTotals.ganhosJogador)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Gap GTD
            </div>
            <div
              className={`text-lg font-bold ${geralPPSTTotals.gapGarantido < 0 ? "text-red-500" : geralPPSTTotals.gapGarantido > 0 ? "text-[#00C969]" : ""}`}
            >
              {formatNumber(geralPPSTTotals.gapGarantido)}
            </div>
          </div>
        </div>

        {/* Detalhes: Σ Partidas + Geral PPST side by side */}
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
          {/* Σ Partidas */}
          <div className="space-y-1 text-sm">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Σ Partidas
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buyin</span>
              <span className="text-blue-500 font-mono">
                {formatNumber(partidasStats.totalBuyin)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GTD</span>
              <span className="text-[#00C969] font-mono">
                {formatNumber(partidasStats.totalGTD)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ganhos</span>
              <span
                className={`font-mono ${partidasStats.totalGanhos < 0 ? "text-red-500" : "text-green-500"}`}
              >
                {formatNumber(partidasStats.totalGanhos)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa</span>
              <span className="text-green-500 font-mono">
                {formatNumber(partidasStats.totalTaxa)}
              </span>
            </div>
          </div>

          {/* Geral PPST 1:5 */}
          <div className="space-y-1 text-sm">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Geral PPST 1:5
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ganhos (col E)</span>
              <span
                className={`font-mono ${geralPPSTTotals.ganhosJogador < 0 ? "text-red-500" : "text-green-500"}`}
              >
                {formatNumber(geralPPSTTotals.ganhosJogador)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa (col J)</span>
              <span className="text-green-500 font-mono">
                {formatNumber(geralPPSTTotals.ganhosLigaTaxa)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gap (col O)</span>
              <span
                className={`font-mono ${geralPPSTTotals.gapGarantido < 0 ? "text-red-500" : geralPPSTTotals.gapGarantido > 0 ? "text-green-500" : ""}`}
              >
                {formatNumber(geralPPSTTotals.gapGarantido)}
              </span>
            </div>
            {partidasStats.totalGanhos !== geralPPSTTotals.ganhosJogador && (
              <div className="flex justify-between text-xs text-muted-foreground border-t pt-1 mt-1">
                <span>Δ Ganhos</span>
                <span
                  className={
                    Math.abs(
                      partidasStats.totalGanhos - geralPPSTTotals.ganhosJogador,
                    ) > 1
                      ? "text-amber-500"
                      : "text-green-500"
                  }
                >
                  {formatNumber(
                    partidasStats.totalGanhos - geralPPSTTotals.ganhosJogador,
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PPSR (Cash) ── */}
      <div className="border-l border-border p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs font-semibold uppercase tracking-wide text-green-500">
            PPSR — Cash
          </span>
        </div>

        {/* Métricas principais */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Mesas
            </div>
            <div className="text-xl font-bold">
              {formatNumber(stats.totalJogosPPSR)}
            </div>
            {Object.keys(cashTypeCounts).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(cashTypeCounts).map(([type, count]) => (
                  <span
                    key={type}
                    className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${cashTypeColors[type] || "text-muted-foreground bg-muted/20 border-border"}`}
                  >
                    {type} {count}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Ligas
            </div>
            <div className="text-xl font-bold">
              {formatNumber(stats.totalLigasPPSR)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Jogadores
            </div>
            <div className="text-xl font-bold">
              {formatNumber(stats.totalJogadoresPPSR)}
            </div>
            {stats.totalParticipacoesPPSR &&
              stats.totalParticipacoesPPSR !== stats.totalJogadoresPPSR && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Entradas {formatNumber(stats.totalParticipacoesPPSR)}
                </div>
              )}
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Mãos
            </div>
            <div className="text-xl font-bold">
              {formatNumber(ppsrPartidasStats.totalMaos)}
            </div>
          </div>
        </div>

        {/* Financeiro */}
        <div className="grid grid-cols-3 gap-4 border-t border-border pt-3">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Taxa Total
            </div>
            <div className="text-lg font-bold text-[#00C969]">
              {formatNumber(geralPPSRTotals.ganhosLigaTaxa)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Ganhos Jogador
            </div>
            <div
              className={`text-lg font-bold ${geralPPSRTotals.ganhosJogadorGeral < 0 ? "text-red-500" : "text-[#00C969]"}`}
            >
              {formatNumber(geralPPSRTotals.ganhosJogadorGeral)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">
              Liga Geral
            </div>
            <div
              className={`text-lg font-bold ${geralPPSRTotals.ganhosLigaGeral < 0 ? "text-red-500" : "text-[#00C969]"}`}
            >
              {formatNumber(geralPPSRTotals.ganhosLigaGeral)}
            </div>
          </div>
        </div>

        {/* Detalhes: Σ Partidas + Geral PPSR side by side */}
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-3">
          {/* Σ Partidas PPSR */}
          <div className="space-y-1 text-sm">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Σ Partidas
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buyin</span>
              <span className="text-blue-500 font-mono">
                {formatNumber(ppsrPartidasStats.totalBuyin)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ganhos</span>
              <span
                className={`font-mono ${ppsrPartidasStats.totalGanhos < 0 ? "text-red-500" : "text-green-500"}`}
              >
                {formatNumber(ppsrPartidasStats.totalGanhos)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa</span>
              <span className="text-green-500 font-mono">
                {formatNumber(ppsrPartidasStats.totalTaxa)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mãos</span>
              <span className="font-mono">
                {formatNumber(ppsrPartidasStats.totalMaos)}
              </span>
            </div>
          </div>

          {/* Geral PPSR */}
          <div className="space-y-1 text-sm">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              Geral PPSR
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ganhos Jogador</span>
              <span
                className={`font-mono ${geralPPSRTotals.ganhosJogadorGeral < 0 ? "text-red-500" : "text-green-500"}`}
              >
                {formatNumber(geralPPSRTotals.ganhosJogadorGeral)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa Liga</span>
              <span className="text-green-500 font-mono">
                {formatNumber(geralPPSRTotals.ganhosLigaTaxa)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Liga Geral</span>
              <span
                className={`font-mono ${geralPPSRTotals.ganhosLigaGeral < 0 ? "text-red-500" : "text-green-500"}`}
              >
                {formatNumber(geralPPSRTotals.ganhosLigaGeral)}
              </span>
            </div>
            {ppsrPartidasStats.totalGanhos !==
              geralPPSRTotals.ganhosJogadorGeral && (
              <div className="flex justify-between text-xs text-muted-foreground border-t pt-1 mt-1">
                <span>Δ Ganhos</span>
                <span
                  className={
                    Math.abs(
                      ppsrPartidasStats.totalGanhos -
                        geralPPSRTotals.ganhosJogadorGeral,
                    ) > 1
                      ? "text-amber-500"
                      : "text-green-500"
                  }
                >
                  {formatNumber(
                    ppsrPartidasStats.totalGanhos -
                      geralPPSRTotals.ganhosJogadorGeral,
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* ── Conferência Grade (Cross-validation) ── */}
      {crossValidation && (
        <div className="border rounded bg-muted/10 p-2">
          <div className="flex items-center gap-2 mb-2">
            <Icons.SyncAlt className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              Grade S{crossValidation.scheduleWeek}
            </span>
          </div>

          {crossValidation.match === false &&
          crossValidation.reason === "different_week" ? (
            <div className="flex items-center gap-1 text-[10px] text-amber-500">
              <Icons.AlertCircle className="w-3 h-3" />
              <span>
                Grade S{crossValidation.scheduleWeek} ≠ PPST S
                {crossValidation.ppstWeek}
              </span>
            </div>
          ) : crossValidation.match ? (
            <>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <div className="text-[9px] text-muted-foreground">
                    Previsto
                  </div>
                  <div className="font-mono font-medium">
                    R$ {formatNumber(crossValidation.gtdScheduledReais)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground">
                    Realizado
                  </div>
                  <div className="font-mono font-medium">
                    R$ {formatNumber(crossValidation.gtdRealizedReais)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground">Diff</div>
                  <div
                    className={`font-mono font-medium ${
                      crossValidation.isBalanced
                        ? "text-[#00C969]"
                        : crossValidation.gtdDiffReais > 0
                          ? "text-amber-500"
                          : "text-blue-500"
                    }`}
                  >
                    {crossValidation.isBalanced
                      ? "OK"
                      : `${crossValidation.gtdDiffReais > 0 ? "+" : ""}${formatNumber(crossValidation.gtdDiffReais)}`}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground">
                    Torneios
                  </div>
                  <div
                    className={`font-mono font-medium ${crossValidation.tournamentsWithGTD !== crossValidation.tournamentsScheduled ? "text-amber-500" : ""}`}
                  >
                    {crossValidation.tournamentsWithGTD}/
                    {crossValidation.tournamentsScheduled}
                  </div>
                </div>
              </div>
              {/* Torneios não encontrados */}
              {crossValidation.missingTournaments &&
                crossValidation.missingTournaments.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] text-amber-500 font-medium">
                        {crossValidation.missingTournaments.length} torneios da
                        grade não encontrados
                      </div>
                      {crossValidation.missingGTDTotal > 0 && (
                        <div className="text-[10px] text-amber-500">
                          GTD: R${" "}
                          {formatNumber(crossValidation.missingGTDTotal)}
                        </div>
                      )}
                    </div>
                    <div className="max-h-[200px] overflow-y-auto border rounded">
                      <table className="w-full text-[10px]">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left px-2 py-1 font-medium">
                              Dia
                            </th>
                            <th className="text-left px-2 py-1 font-medium">
                              Hora
                            </th>
                            <th className="text-left px-2 py-1 font-medium">
                              Torneio
                            </th>
                            <th className="text-left px-2 py-1 font-medium">
                              Tipo
                            </th>
                            <th className="text-right px-2 py-1 font-medium">
                              GTD
                            </th>
                            <th className="text-right px-2 py-1 font-medium">
                              Buy-in
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {crossValidation.missingTournaments.map((t, i) => (
                            <tr
                              key={i}
                              className="border-t border-border/30 hover:bg-muted/30"
                            >
                              <td className="px-2 py-1 text-muted-foreground">
                                {dayLabels[t.day] || t.day}
                              </td>
                              <td className="px-2 py-1 font-mono">{t.time}</td>
                              <td className="px-2 py-1 font-medium text-amber-600">
                                {t.name}
                              </td>
                              <td className="px-2 py-1 text-muted-foreground">
                                {t.game}
                              </td>
                              <td className="px-2 py-1 text-right font-mono text-green-600">
                                {t.gtd > 0 ? formatNumber(t.gtd * 5) : "-"}
                              </td>
                              <td className="px-2 py-1 text-right font-mono">
                                {t.buyIn || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </>
          ) : null}
        </div>
      )}

      {/* Info se não tiver grade carregada */}
      {!scheduleData && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-muted/10 border border-dashed text-[10px] text-muted-foreground">
          <Icons.Info className="w-3 h-3" />
          <span>Importe Grade PPST para conferir GTD</span>
        </div>
      )}
    </div>
  );
}
