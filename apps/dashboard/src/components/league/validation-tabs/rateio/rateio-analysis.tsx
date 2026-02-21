"use client";

import type {
  ParsedLeagueGeralPPSTBloco,
  ParsedLeagueJogoPPST,
} from "@/lib/league/types";
import { Button } from "@midpoker/ui/button";
import { useMemo, useState } from "react";
import {
  type MetaGroupData,
  type TorneioInfo,
  formatDateDisplay,
  formatHourRange,
  formatNumber,
  formatPercent,
  getDateKey,
  getWeekdayLabel,
  parseDateString,
} from "./rateio-utils";

interface RateioAnalysisProps {
  geralPPST: ParsedLeagueGeralPPSTBloco[];
  jogosPPST: ParsedLeagueJogoPPST[];
  metaGroups: MetaGroupData[];
}

interface GroupAnalysis {
  group: MetaGroupData;
  expected: number;
  reached: number;
  gap: number;
  gapPercent: number;
  status: "success" | "warning" | "danger";
  perLiga: Record<number, number>;
  timeSlotAnalysis: {
    slot: MetaGroupData["timeSlots"][number];
    expected: number;
    reached: number;
    gap: number;
    status: "success" | "warning" | "danger";
  }[];
}

function getStatus(gapPercent: number): "success" | "warning" | "danger" {
  if (gapPercent <= 0) return "success";
  if (gapPercent <= 20) return "warning";
  return "danger";
}

const statusBg = {
  success: "bg-green-500/10",
  warning: "bg-yellow-500/10",
  danger: "bg-red-500/10",
};

export function RateioAnalysis({
  geralPPST,
  jogosPPST,
  metaGroups,
}: RateioAnalysisProps) {
  const [showAllGtd, setShowAllGtd] = useState(false);

  const stats = useMemo(() => {
    // Build set of all member liga IDs across all groups
    const allMemberIds = new Set<number>();
    for (const g of metaGroups) {
      for (const m of g.members) {
        allMemberIds.add(m.superUnionId);
      }
    }

    let gtdTotal = 0;
    let soOverlay = 0;
    let gtdTourneysCount = 0;
    let overlayTourneysCount = 0;
    let gtdTotalTodos = 0;

    const torneiosOverlay: TorneioInfo[] = [];
    const torneisoME: TorneioInfo[] = [];
    const torneiosOutros: TorneioInfo[] = [];

    // Per-group accumulators (overlay-only)
    const groupReached: Record<string, number> = {};
    const groupPerLiga: Record<string, Record<number, number>> = {};
    // Per-group per-timeslot accumulators
    const groupSlotReached: Record<string, Record<string, number>> = {};

    for (const g of metaGroups) {
      groupReached[g.id] = 0;
      groupPerLiga[g.id] = {};
      groupSlotReached[g.id] = {};
      for (const ts of g.timeSlots) {
        groupSlotReached[g.id][ts.id] = 0;
      }
    }

    for (const jogo of jogosPPST) {
      const gtd = jogo.metadata?.premiacaoGarantida ?? 0;
      const isPPSTOrganized =
        jogo.metadata?.tipoJogo?.toUpperCase()?.startsWith("PPST") ?? false;

      const jogoBuyin =
        jogo.totalGeral?.buyinFichas ||
        jogo.jogadores?.reduce((s, j) => s + (j.buyinFichas ?? 0), 0) ||
        0;
      const jogoBuyinTicket =
        jogo.totalGeral?.buyinTicket ||
        jogo.jogadores?.reduce((s, j) => s + (j.buyinTicket ?? 0), 0) ||
        0;
      const jogoTaxa =
        jogo.totalGeral?.taxa ||
        jogo.jogadores?.reduce((s, j) => s + (j.taxa ?? 0), 0) ||
        0;

      if (isPPSTOrganized && gtd > 0) {
        gtdTourneysCount++;
        gtdTotalTodos += gtd;

        const buyinLiquido = jogoBuyin + jogoBuyinTicket - jogoTaxa;
        const resultado = buyinLiquido - gtd;
        const temOverlay = resultado < 0;

        const horaInicio = jogo.metadata?.horaInicio ?? "";
        const isME = horaInicio === "20:00";

        const torneioInfo: TorneioInfo = {
          nome: jogo.metadata?.nomeMesa ?? "Sem nome",
          data: jogo.metadata?.dataInicio ?? "",
          horaInicio,
          gtdUSD: gtd / 5,
          gtdBRL: gtd,
          buyinBRL: buyinLiquido,
          entradas: jogo.jogadores?.length ?? 0,
          overlay: temOverlay ? Math.abs(resultado) : 0,
        };

        if (isME) {
          torneisoME.push(torneioInfo);
        } else {
          torneiosOutros.push(torneioInfo);
        }

        if (temOverlay) {
          torneiosOverlay.push(torneioInfo);
          gtdTotal += gtd;
          soOverlay += resultado;
          overlayTourneysCount++;

          // Parse tournament hour for time slot matching
          const tourHour = horaInicio
            ? Number.parseInt(horaInicio.split(":")[0], 10)
            : -1;

          for (const jogador of jogo.jogadores ?? []) {
            const ligaId = jogador.ligaId;
            const liquido =
              (jogador.buyinFichas ?? 0) +
              (jogador.buyinTicket ?? 0) -
              (jogador.taxa ?? 0);

            // Find which group this liga belongs to
            for (const g of metaGroups) {
              const isMember = g.members.some((m) => m.superUnionId === ligaId);
              if (isMember) {
                groupReached[g.id] += liquido;
                if (!groupPerLiga[g.id][ligaId]) {
                  groupPerLiga[g.id][ligaId] = 0;
                }
                groupPerLiga[g.id][ligaId] += liquido;

                // Time slot accumulation
                if (tourHour >= 0) {
                  for (const ts of g.timeSlots) {
                    if (
                      ts.isActive &&
                      tourHour >= ts.hourStart &&
                      tourHour < ts.hourEnd
                    ) {
                      groupSlotReached[g.id][ts.id] += liquido;
                    }
                  }
                }
                break;
              }
            }
          }
        }
      }
    }

    // Calculate group analysis
    const totalOverlay = Math.abs(soOverlay);
    const groupAnalyses: GroupAnalysis[] = metaGroups
      .filter((g) => g.isActive)
      .map((g) => {
        const expected = (g.metaPercent / 100) * gtdTotal;
        const reached = groupReached[g.id] ?? 0;
        const gap = (g.metaPercent / 100) * totalOverlay;
        const gapPercent =
          expected > 0 ? ((expected - reached) / expected) * 100 : 0;

        const timeSlotAnalysis = g.timeSlots
          .filter((ts) => ts.isActive)
          .map((ts) => {
            const slotExpected = (ts.metaPercent / 100) * gtdTotal;
            const slotReached = groupSlotReached[g.id]?.[ts.id] ?? 0;
            const slotGap = (ts.metaPercent / 100) * totalOverlay;
            const slotGapPercent =
              slotExpected > 0
                ? ((slotExpected - slotReached) / slotExpected) * 100
                : 0;

            return {
              slot: ts,
              expected: slotExpected,
              reached: slotReached,
              gap: slotGap,
              status: getStatus(slotGapPercent),
            };
          });

        return {
          group: g,
          expected,
          reached,
          gap,
          gapPercent,
          status: getStatus(gapPercent),
          perLiga: groupPerLiga[g.id] ?? {},
          timeSlotAnalysis,
        };
      });

    // Gap from spreadsheet
    const bloco15 = geralPPST.find((b) => b.contexto?.taxaCambio === "1:5");
    const gapPlanilha = bloco15?.total?.gapGarantido ?? 0;

    torneiosOverlay.sort((a, b) => b.overlay - a.overlay);

    return {
      gtdTotal,
      soOverlay,
      gapPlanilha,
      gtdTourneysCount,
      overlayTourneysCount,
      gtdTotalTodos,
      torneiosOverlay,
      torneisoME,
      torneiosOutros,
      groupAnalyses,
    };
  }, [geralPPST, jogosPPST, metaGroups]);

  if (jogosPPST.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Nenhum dado de Jogos PPST encontrado
      </div>
    );
  }

  const torneiosGtd = [...stats.torneisoME, ...stats.torneiosOutros].sort(
    (a, b) => {
      const timeA =
        parseDateString(a.data)?.getTime() ?? Number.POSITIVE_INFINITY;
      const timeB =
        parseDateString(b.data)?.getTime() ?? Number.POSITIVE_INFINITY;
      return timeA - timeB;
    },
  );
  let lastDateKey = "";

  return (
    <div className="space-y-6">
      {/* Group Analysis Cards */}
      {stats.groupAnalyses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 rounded-lg border border-border divide-x divide-border">
          {stats.groupAnalyses.map((ga) => (
            <div key={ga.group.id} className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{ga.group.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-background/50">
                    {formatPercent(ga.group.metaPercent)}
                  </span>
                </div>
                <span
                  className={`text-xs font-mono ${ga.gap > 0 ? "text-red-500" : "text-green-500"}`}
                >
                  {ga.gap > 0
                    ? `Overlay: ${formatNumber(ga.gap)}`
                    : "Sem overlay"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-[10px] text-muted-foreground">Meta</div>
                  <div className="font-mono">{formatNumber(ga.expected)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    Arrecadado
                  </div>
                  <div className="font-mono">{formatNumber(ga.reached)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">%</div>
                  <div className="font-mono">
                    {ga.expected > 0
                      ? formatPercent((ga.reached / ga.expected) * 100)
                      : "-"}
                  </div>
                </div>
              </div>

              {/* Per-liga breakdown */}
              {Object.keys(ga.perLiga).length > 0 && (
                <div className="pt-1 border-t border-border space-y-0.5">
                  {ga.group.members
                    .filter((m) => (ga.perLiga[m.superUnionId] ?? 0) !== 0)
                    .sort(
                      (a, b) =>
                        (ga.perLiga[b.superUnionId] ?? 0) -
                        (ga.perLiga[a.superUnionId] ?? 0),
                    )
                    .map((m) => (
                      <div
                        key={m.superUnionId}
                        className="flex items-center justify-between text-[10px]"
                      >
                        <span>{m.displayName || `Liga ${m.superUnionId}`}</span>
                        <span className="font-mono">
                          {formatNumber(ga.perLiga[m.superUnionId] ?? 0)}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* Time slot breakdown */}
              {ga.timeSlotAnalysis.length > 0 && (
                <div className="pt-1 border-t border-border space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Time Slots
                  </div>
                  {ga.timeSlotAnalysis.map((tsa) => (
                    <div
                      key={tsa.slot.id}
                      className={`flex items-center justify-between text-[10px] px-1.5 py-0.5 rounded ${statusBg[tsa.status]}`}
                    >
                      <span>
                        {tsa.slot.name} (
                        {formatHourRange(tsa.slot.hourStart, tsa.slot.hourEnd)})
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span>{formatNumber(tsa.reached)}</span>
                        <span className="text-muted-foreground">/</span>
                        <span>{formatNumber(tsa.expected)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comparativo */}
      <div className="space-y-1 text-sm border-t pt-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Comparativo entre torneios com overlay geral vindo da planilha e
          torneios com overlay so de PPST + GTD
        </div>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-xs">
          <span className="text-muted-foreground whitespace-nowrap">
            Gap planilha (col O) - overlay total informado na planilha (todos
            GTD PPST)
          </span>
          <span
            className={`font-mono tabular-nums text-right ${stats.gapPlanilha < 0 ? "text-red-500" : "text-green-500"}`}
          >
            {formatNumber(stats.gapPlanilha)}
          </span>
          <span className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
            So overlay (torneios PPST com GTD e overlay)
          </span>
          <span className="font-mono tabular-nums text-right text-red-500">
            {formatNumber(stats.soOverlay)}
          </span>
        </div>
      </div>

      {/* Torneios com overlay */}
      {stats.torneiosOverlay.length > 0 && (
        <div className="border-t pt-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              So overlay - torneios ({stats.torneiosOverlay.length})
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[10px] uppercase tracking-wide"
              onClick={() => setShowAllGtd((current) => !current)}
            >
              {showAllGtd ? "Ocultar GTD" : "Ver torneios GTD"}
            </Button>
          </div>
          <div className="text-xs">
            <div className="grid grid-cols-6 gap-2 text-muted-foreground border-b pb-1 mb-1">
              <span>Nome</span>
              <span>Data</span>
              <span className="text-right">GTD</span>
              <span className="text-right">Arrecadado</span>
              <span className="text-right">Entradas</span>
              <span className="text-right">Overlay</span>
            </div>
            {stats.torneiosOverlay.map((t, i) => (
              <div
                key={`${t.nome}-${t.data}-${i}`}
                className="grid grid-cols-6 gap-2 py-0.5"
              >
                <span className="truncate">{t.nome}</span>
                <span>{t.data || "-"}</span>
                <span className="text-right font-mono">
                  {formatNumber(t.gtdBRL)}
                </span>
                <span className="text-right font-mono text-green-500">
                  {formatNumber(t.buyinBRL)}
                </span>
                <span className="text-right font-mono">{t.entradas}</span>
                <span className="text-right font-mono text-red-500">
                  {formatNumber(t.overlay)}
                </span>
              </div>
            ))}
          </div>
          {showAllGtd && (
            <div className="pt-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                Torneios GTD (PPST) ({torneiosGtd.length})
              </div>
              <div className="text-xs">
                <div className="grid grid-cols-6 gap-2 text-muted-foreground border-b pb-1 mb-1">
                  <span>Nome</span>
                  <span>Data</span>
                  <span className="text-right">GTD</span>
                  <span className="text-right">Arrecadado</span>
                  <span className="text-right">Entradas</span>
                  <span className="text-right">Overlay</span>
                </div>
                {torneiosGtd.map((t, i) => {
                  const dateKey = getDateKey(t.data);
                  const weekdayLabel = getWeekdayLabel(t.data);
                  const dateLabel = formatDateDisplay(t.data);
                  const showWeekday = dateKey !== lastDateKey;
                  if (showWeekday) {
                    lastDateKey = dateKey;
                  }
                  return (
                    <div key={`${t.nome}-${t.data}-${i}`}>
                      {showWeekday && (
                        <div className="flex items-center gap-2 py-2">
                          <div className="h-px flex-1 bg-border/70" />
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {weekdayLabel} &bull; {dateLabel}
                          </div>
                          <div className="h-px flex-1 bg-border/70" />
                        </div>
                      )}
                      <div className="grid grid-cols-6 gap-2 py-0.5">
                        <span className="truncate">{t.nome}</span>
                        <span>{t.data || "-"}</span>
                        <span className="text-right font-mono">
                          {formatNumber(t.gtdBRL)}
                        </span>
                        <span className="text-right font-mono text-green-500">
                          {formatNumber(t.buyinBRL)}
                        </span>
                        <span className="text-right font-mono">
                          {t.entradas}
                        </span>
                        <span
                          className={`text-right font-mono ${
                            t.overlay > 0
                              ? "text-red-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          {t.overlay > 0 ? formatNumber(t.overlay) : "-"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
