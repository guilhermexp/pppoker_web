"use client";

import type { ParsedLeagueJogoPPST } from "@/lib/league/types";
import { useCallback, useMemo, useState } from "react";
import {
  type MetaGroupData,
  formatNumber,
  formatPercent,
} from "./rateio-utils";

interface InteractiveMetasTableProps {
  metaGroups: MetaGroupData[];
  jogosPPST: ParsedLeagueJogoPPST[];
  overlayTotal: number;
}

interface UnionRow {
  groupId: string;
  groupName: string;
  superUnionId: number;
  displayName: string;
  percent: number;
  metaDollar: number;
  alcanzado: number;
  deficit: number;
  overlay: number;
}

const GROUP_COLORS = [
  "bg-blue-500/5",
  "bg-purple-500/5",
  "bg-green-500/5",
  "bg-amber-500/5",
  "bg-cyan-500/5",
  "bg-rose-500/5",
];

export function InteractiveMetasTable({
  metaGroups,
  jogosPPST,
  overlayTotal,
}: InteractiveMetasTableProps) {
  const activeGroups = useMemo(
    () => metaGroups.filter((g) => g.isActive && g.members.length > 0),
    [metaGroups],
  );

  // Compute per-union alcanzado from overlay tournaments
  const perUnionAlcanzado = useMemo(() => {
    const acc: Record<number, number> = {};

    for (const jogo of jogosPPST) {
      const gtd = jogo.metadata?.premiacaoGarantida ?? 0;
      const isPPST =
        jogo.metadata?.tipoJogo?.toUpperCase()?.startsWith("PPST") ?? false;

      if (!isPPST || gtd <= 0) continue;

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
      const resultado = jogoBuyin + jogoBuyinTicket - jogoTaxa - gtd;

      if (resultado >= 0) continue; // No overlay

      for (const jogador of jogo.jogadores ?? []) {
        const ligaId = jogador.ligaId;
        const liquido = (jogador.buyinFichas ?? 0) + (jogador.buyinTicket ?? 0) - (jogador.taxa ?? 0);
        acc[ligaId] = (acc[ligaId] ?? 0) + liquido;
      }
    }

    return acc;
  }, [jogosPPST]);

  // Initial distribution: use fallbackPercent when available, otherwise equal split
  const initialPercents = useMemo(() => {
    const result: Record<number, number> = {};
    for (const group of activeGroups) {
      const count = group.members.length;
      if (count === 0) continue;
      const hasFallback = group.members.some((m) => m.fallbackPercent != null);
      if (hasFallback) {
        for (const m of group.members) {
          result[m.superUnionId] = m.fallbackPercent ?? 0;
        }
      } else {
        const each = Math.round((group.metaPercent / count) * 10) / 10;
        for (const m of group.members) {
          result[m.superUnionId] = each;
        }
      }
    }
    return result;
  }, [activeGroups]);

  const [userPercents, setUserPercents] = useState<Record<number, number>>({});

  const effectivePercents = useMemo(
    () => ({ ...initialPercents, ...userPercents }),
    [initialPercents, userPercents],
  );

  // Redistribution logic
  const handlePercentChange = useCallback(
    (superUnionId: number, newValue: number, groupId: string) => {
      const group = activeGroups.find((g) => g.id === groupId);
      if (!group) return;

      const clamped = Math.min(100, Math.max(0, newValue));
      const groupMemberIds = group.members.map((m) => m.superUnionId);
      const otherIds = groupMemberIds.filter((id) => id !== superUnionId);

      // Sum of others' current percents (excluding zeros)
      const othersWithValue = otherIds.filter(
        (id) => (effectivePercents[id] ?? 0) > 0,
      );
      const othersSum = othersWithValue.reduce(
        (sum, id) => sum + (effectivePercents[id] ?? 0),
        0,
      );

      const remaining = group.metaPercent - clamped;
      const newPercents: Record<number, number> = { [superUnionId]: clamped };

      if (othersWithValue.length > 0 && othersSum > 0) {
        let distributed = 0;
        for (let i = 0; i < othersWithValue.length; i++) {
          const id = othersWithValue[i];
          if (i === othersWithValue.length - 1) {
            // Last one gets remainder to avoid float drift
            newPercents[id] = Math.round((remaining - distributed) * 10) / 10;
          } else {
            const ratio = (effectivePercents[id] ?? 0) / othersSum;
            const val = Math.round(ratio * remaining * 10) / 10;
            newPercents[id] = val;
            distributed += val;
          }
        }
        // Zero-percent members stay at 0
        for (const id of otherIds) {
          if ((effectivePercents[id] ?? 0) === 0 && !(id in newPercents)) {
            newPercents[id] = 0;
          }
        }
      }

      setUserPercents((prev) => ({ ...prev, ...newPercents }));
    },
    [activeGroups, effectivePercents],
  );

  // Compute rows
  const { rows, totals } = useMemo(() => {
    const allRows: UnionRow[] = [];

    for (const group of activeGroups) {
      for (const member of group.members) {
        const percent = effectivePercents[member.superUnionId] ?? 0;
        const metaDollar = (percent / 100) * overlayTotal;
        const alcanzado = perUnionAlcanzado[member.superUnionId] ?? 0;
        const deficit = percent === 0 ? 0 : alcanzado - metaDollar;

        allRows.push({
          groupId: group.id,
          groupName: group.name,
          superUnionId: member.superUnionId,
          displayName: member.displayName ?? `Liga ${member.superUnionId}`,
          percent,
          metaDollar,
          alcanzado,
          deficit,
          overlay: 0, // computed after totals
        });
      }
    }

    // Compute total deficit (only negative deficits count)
    const totalDeficit = allRows.reduce(
      (sum, r) => sum + Math.min(0, r.deficit),
      0,
    );

    // Assign overlay proportionally based on deficit
    for (const row of allRows) {
      if (totalDeficit < 0 && row.deficit < 0) {
        row.overlay = (row.deficit / totalDeficit) * overlayTotal;
      } else {
        row.overlay = 0;
      }
    }

    const totalPercent = allRows.reduce((s, r) => s + r.percent, 0);
    const totalMeta = allRows.reduce((s, r) => s + r.metaDollar, 0);
    const totalAlcanzado = allRows.reduce((s, r) => s + r.alcanzado, 0);
    const totalDeficitSum = allRows.reduce((s, r) => s + r.deficit, 0);
    const totalOverlay = allRows.reduce((s, r) => s + r.overlay, 0);

    return {
      rows: allRows,
      totals: {
        percent: totalPercent,
        meta: totalMeta,
        alcanzado: totalAlcanzado,
        deficit: totalDeficitSum,
        overlay: totalOverlay,
      },
    };
  }, [activeGroups, effectivePercents, overlayTotal, perUnionAlcanzado]);

  if (activeGroups.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
        Nenhum grupo meta ativo com membros configurado.
      </div>
    );
  }

  // Group rows by groupId for rendering with separators
  const groupedRows: {
    groupId: string;
    groupName: string;
    rows: UnionRow[];
    colorIdx: number;
  }[] = [];
  let colorIdx = 0;
  for (const group of activeGroups) {
    const groupRows = rows.filter((r) => r.groupId === group.id);
    if (groupRows.length > 0) {
      groupedRows.push({
        groupId: group.id,
        groupName: group.name,
        rows: groupRows,
        colorIdx,
      });
      colorIdx++;
    }
  }

  const percentWarning = Math.abs(totals.percent - 100) > 0.2;

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Metas por Uniao</span>
        {percentWarning && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600">
            Total: {formatPercent(totals.percent)} (esperado 100%)
          </span>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden text-xs">
        {/* Header */}
        <div className="grid grid-cols-6 gap-2 px-3 py-2 bg-muted/30 border-b text-muted-foreground font-medium">
          <span>UNIONES</span>
          <span className="text-right">METAS %</span>
          <span className="text-right">METAS $</span>
          <span className="text-right">ALCANZADO</span>
          <span className="text-right">DEFICIT</span>
          <span className="text-right">OVERLAY</span>
        </div>

        {/* Body */}
        {groupedRows.map((gBlock) => {
          const bgColor = GROUP_COLORS[gBlock.colorIdx % GROUP_COLORS.length];
          const groupPercent = activeGroups.find(
            (g) => g.id === gBlock.groupId,
          )?.metaPercent;

          return (
            <div key={gBlock.groupId}>
              {/* Group separator */}
              <div
                className={`px-3 py-1.5 border-b ${bgColor} flex items-center gap-2`}
              >
                <span className="font-medium text-xs">{gBlock.groupName}</span>
                {groupPercent != null && (
                  <span className="text-[10px] text-muted-foreground">
                    ({formatPercent(groupPercent)})
                  </span>
                )}
              </div>

              {/* Union rows */}
              {gBlock.rows.map((row) => (
                <div
                  key={row.superUnionId}
                  className={`grid grid-cols-6 gap-2 px-3 py-1.5 border-b ${bgColor}`}
                >
                  <span className="truncate">
                    {row.displayName}
                    <span className="text-muted-foreground ml-1 text-[10px]">
                      ({row.superUnionId})
                    </span>
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={row.percent}
                      onChange={(e) =>
                        handlePercentChange(
                          row.superUnionId,
                          Number(e.target.value) || 0,
                          row.groupId,
                        )
                      }
                      className="w-14 h-5 text-xs text-right font-mono bg-transparent border-b border-muted-foreground/30 outline-none focus:border-foreground"
                    />
                    <span className="text-[10px] text-muted-foreground">%</span>
                  </div>
                  <span className="text-right font-mono">
                    {formatNumber(row.metaDollar)}
                  </span>
                  <span className="text-right font-mono">
                    {formatNumber(row.alcanzado)}
                  </span>
                  <span
                    className={`text-right font-mono ${row.deficit < 0 ? "text-red-500" : ""}`}
                  >
                    {formatNumber(row.deficit)}
                  </span>
                  <span
                    className={`text-right font-mono ${row.overlay > 0 ? "text-red-500" : ""}`}
                  >
                    {formatNumber(row.overlay)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}

        {/* Totals row */}
        <div className="grid grid-cols-6 gap-2 px-3 py-2 bg-muted/50 font-medium">
          <span>TOTAL</span>
          <span className="text-right font-mono">
            {formatPercent(totals.percent)}
          </span>
          <span className="text-right font-mono">
            {formatNumber(totals.meta)}
          </span>
          <span className="text-right font-mono">
            {formatNumber(totals.alcanzado)}
          </span>
          <span
            className={`text-right font-mono ${totals.deficit < 0 ? "text-red-500" : ""}`}
          >
            {formatNumber(totals.deficit)}
          </span>
          <span
            className={`text-right font-mono ${totals.overlay > 0 ? "text-red-500" : ""}`}
          >
            {formatNumber(totals.overlay)}
          </span>
        </div>
      </div>
    </div>
  );
}
