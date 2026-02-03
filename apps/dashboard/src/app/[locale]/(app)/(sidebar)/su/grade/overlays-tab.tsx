"use client";

import type { SAOverlayData } from "@/lib/league/overlay-spreadsheet-parser";
import type { MatchResult } from "@/lib/league/tournament-matching";
import type { StoredRealizedData } from "@/lib/league/tournament-matching";
import { matchTournaments } from "@/lib/league/tournament-matching";
import { dayLabels, dayOrder } from "@/lib/league/tournament-schedule";
import type { TournamentScheduleData } from "@/lib/league/tournament-schedule";
import { Badge } from "@midpoker/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@midpoker/ui/card";
import { Icons } from "@midpoker/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { useEffect, useMemo, useState } from "react";
import { SA_OVERLAY_STORAGE_KEY } from "./analise-tab";
import type { StoredTournament } from "./grade-tab";

const SCHEDULE_STORAGE_KEY = "ppst-tournament-schedule";
const REALIZED_TOURNAMENTS_KEY = "ppst-realized-tournaments";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "danger" | "success" | "warning";
}) {
  const styles = {
    default: {
      bg: "dark:bg-[#0c0c0c] border dark:border-[#1d1d1d]",
      icon: "text-muted-foreground",
      value: "",
    },
    danger: {
      bg: "dark:bg-red-500/5 border border-red-500/20",
      icon: "text-red-500",
      value: "text-red-500",
    },
    success: {
      bg: "dark:bg-[#00C969]/5 border border-[#00C969]/20",
      icon: "text-[#00C969]",
      value: "text-[#00C969]",
    },
    warning: {
      bg: "dark:bg-amber-500/5 border border-amber-500/20",
      icon: "text-amber-500",
      value: "text-amber-500",
    },
  };
  const s = styles[variant];

  return (
    <div className={`p-4 rounded-lg ${s.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${s.icon}`} />
        <span className="text-xs text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p className={`text-xl font-mono font-bold ${s.value}`}>{value}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
          {subValue}
        </p>
      )}
    </div>
  );
}

// ---- Cross-matching helpers ----

function normalizeWords(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9+]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

function nameMatchScore(a: string, b: string): number {
  const wa = normalizeWords(a);
  const wb = normalizeWords(b);
  if (!wa.length || !wb.length) return 0;
  if (wa.join(" ") === wb.join(" ")) return 1;
  const common = wa.filter((w) => wb.includes(w)).length;
  return common / Math.max(wa.length, wb.length);
}

function dateToEnglishDay(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length !== 3) return "";
  const d = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]),
  );
  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return days[d.getDay()] || "";
}

type ComparisonRow = {
  day: string;
  dayIdx: number;
  time: string;
  internalName: string | null;
  internalOverlay: number | null;
  internalGTD: number | null;
  saName: string | null;
  saOverlay: number | null;
  saGTD: number | null;
  matched: boolean;
};

export function OverlaysTab() {
  const [scheduleData, setScheduleData] =
    useState<TournamentScheduleData | null>(null);
  const [realizedData, setRealizedData] = useState<StoredRealizedData | null>(
    null,
  );
  const [saData, setSaData] = useState<SAOverlayData | null>(null);

  useEffect(() => {
    try {
      const storedRealized = localStorage.getItem(REALIZED_TOURNAMENTS_KEY);
      if (storedRealized) setRealizedData(JSON.parse(storedRealized));

      const storedScheduleRaw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (storedScheduleRaw) {
        const parsed = JSON.parse(storedScheduleRaw);
        if (parsed.tournaments) {
          setScheduleData({
            events: parsed.tournaments.map(
              (t: StoredTournament, i: number) => ({
                id: `stored-${i}`,
                day: t.day,
                name: t.name,
                game: t.game,
                gtd: String(t.gtd),
                buyIn: t.buyIn,
                rebuy: "",
                addOn: "",
                stack: "",
                players: "",
                lateReg: "",
                minutes: "",
                structure: "",
                times: { "-3": t.time },
              }),
            ),
            weekInfo: {
              startDate: parsed.weekInfo?.startDate || "",
              endDate: parsed.weekInfo?.endDate || "",
              filename: "",
            },
          });
        }
      }

      const storedSA = localStorage.getItem(SA_OVERLAY_STORAGE_KEY);
      if (storedSA) setSaData(JSON.parse(storedSA));
    } catch {
      /* ignore */
    }
  }, []);

  const matchResult: MatchResult | null = useMemo(() => {
    if (!scheduleData || !realizedData) return null;
    const scheduleTournaments: StoredTournament[] = scheduleData.events
      .filter(
        (e) => (Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0) > 0,
      )
      .map((e) => ({
        name: e.name.trim().toUpperCase(),
        day: e.day,
        time: e.times["-3"] || "",
        gtd: Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0,
        buyIn: e.buyIn,
        game: e.game,
      }));
    return matchTournaments(scheduleTournaments, realizedData.tournaments);
  }, [scheduleData, realizedData]);

  // Matched overlay tournaments (for cross-matching table)
  const overlayTournaments = useMemo(() => {
    if (!matchResult) return [];
    return matchResult.matched
      .filter((p) => p.realized.overlay < 0)
      .sort((a, b) => {
        const dayDiff =
          (dayOrder.indexOf(a.schedule.day) ?? 0) -
          (dayOrder.indexOf(b.schedule.day) ?? 0);
        if (dayDiff !== 0) return dayDiff;
        return a.schedule.time.localeCompare(b.schedule.time);
      });
  }, [matchResult]);

  // All internal overlays from realized data (for stats cards)
  // Matches validator logic: gtdFichas > 0 AND overlay < 0
  const internalOverlayStats = useMemo(() => {
    if (!realizedData?.tournaments) {
      return { count: 0, totalOverlay: 0, totalGTD: 0, totalArrecadado: 0 };
    }
    let count = 0;
    let totalOverlay = 0;
    let totalGTD = 0;
    let totalArrecadado = 0;
    for (const t of realizedData.tournaments) {
      if (t.gtdFichas > 0 && t.overlay < 0) {
        count++;
        totalOverlay += t.overlay;
        totalGTD += t.gtdFichas;
        totalArrecadado += t.gtdFichas + t.overlay;
      }
    }
    return { count, totalOverlay, totalGTD, totalArrecadado };
  }, [realizedData]);

  const saTotals = useMemo(() => {
    if (!saData?.resumen.length) return null;
    return {
      ppst: saData.resumen.reduce((s, r) => s + r.ppst, 0),
      sat: saData.resumen.reduce((s, r) => s + r.sat, 0),
      total: saData.resumen.reduce((s, r) => s + r.total, 0),
    };
  }, [saData]);

  // ---- Cross-matching: internal overlays ↔ SA tournaments ----
  const crossMatched = useMemo(() => {
    const saAll = saData?.tournaments || [];
    if (!overlayTournaments.length && !saAll.length)
      return { rows: [] as ComparisonRow[], matchCount: 0 };

    const rows: ComparisonRow[] = [];
    const usedSa = new Set<number>();
    let matchCount = 0;

    for (const pair of overlayTournaments) {
      const schedDay = pair.schedule.day; // e.g. "MONDAY"
      const internalDate = pair.realized.date; // YYYY/MM/DD
      const internalName = pair.realized.name;

      let bestIdx = -1;
      let bestScore = 0;

      for (let i = 0; i < saAll.length; i++) {
        if (usedSa.has(i)) continue;
        const sa = saAll[i];

        // Match by exact date or same day-of-week
        const sameDate = internalDate === sa.date;
        const sameDayOfWeek =
          !sameDate && dateToEnglishDay(sa.date) === schedDay;
        if (!sameDate && !sameDayOfWeek) continue;

        const score = nameMatchScore(internalName, sa.name);
        const adjusted = sameDate ? score : score * 0.8;

        if (adjusted > bestScore && adjusted >= 0.4) {
          bestIdx = i;
          bestScore = adjusted;
        }
      }

      const dayIdx = dayOrder.indexOf(schedDay);

      if (bestIdx >= 0) {
        usedSa.add(bestIdx);
        matchCount++;
        const sa = saAll[bestIdx];
        rows.push({
          day: schedDay,
          dayIdx,
          time: pair.schedule.time,
          internalName,
          internalOverlay: pair.realized.overlay,
          internalGTD: pair.realized.gtdFichas,
          saName: sa.name,
          saOverlay: sa.overlay,
          saGTD: sa.gtd,
          matched: true,
        });
      } else {
        rows.push({
          day: schedDay,
          dayIdx,
          time: pair.schedule.time,
          internalName,
          internalOverlay: pair.realized.overlay,
          internalGTD: pair.realized.gtdFichas,
          saName: null,
          saOverlay: null,
          saGTD: null,
          matched: false,
        });
      }
    }

    // Add unmatched SA tournaments with overlay
    for (let i = 0; i < saAll.length; i++) {
      if (usedSa.has(i)) continue;
      const sa = saAll[i];
      if (sa.overlay >= 0) continue;
      const saDay = dateToEnglishDay(sa.date);
      rows.push({
        day: saDay,
        dayIdx: dayOrder.indexOf(saDay),
        time: "",
        internalName: null,
        internalOverlay: null,
        internalGTD: null,
        saName: sa.name,
        saOverlay: sa.overlay,
        saGTD: sa.gtd,
        matched: false,
      });
    }

    // Sort by day then time
    rows.sort((a, b) => {
      if (a.dayIdx !== b.dayIdx) return a.dayIdx - b.dayIdx;
      return a.time.localeCompare(b.time);
    });

    return { rows, matchCount };
  }, [overlayTournaments, saData]);

  const hasImportedData = scheduleData && realizedData;
  const hasSAData = saData && saData.tournaments.length > 0;
  const hasBothSources = hasImportedData && hasSAData;

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Internal overlay stats */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-500/10">
                  <Icons.TrendingDown className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Overlays Internos</CardTitle>
                  <CardDescription>
                    Torneios com resultado negativo
                  </CardDescription>
                </div>
              </div>
              {internalOverlayStats.count > 0 && (
                <Badge
                  variant="outline"
                  className="bg-red-500/10 text-red-500 border-red-500/20 text-sm px-3 py-1"
                >
                  R$ {formatNumber(internalOverlayStats.totalOverlay)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {!hasImportedData ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Icons.AlertCircle className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Importe dados na aba{" "}
                  <span className="font-medium text-foreground">Grade</span>.
                </p>
              </div>
            ) : internalOverlayStats.count === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Icons.Check className="w-5 h-5 text-[#00C969] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum overlay nesta semana.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Torneios"
                  value={String(internalOverlayStats.count)}
                  subValue={`de ${realizedData?.tournaments.length ?? 0} total`}
                  icon={Icons.PlayOutline}
                />
                <StatCard
                  label="GTD Total"
                  value={`R$ ${formatNumber(internalOverlayStats.totalGTD)}`}
                  subValue={`USD ${formatNumber(Math.round(internalOverlayStats.totalGTD / 5 * 100) / 100)}`}
                  icon={Icons.PieChart}
                />
                <StatCard
                  label="Arrecadado"
                  value={`R$ ${formatNumber(internalOverlayStats.totalArrecadado)}`}
                  subValue={`USD ${formatNumber(Math.round(internalOverlayStats.totalArrecadado / 5 * 100) / 100)}`}
                  icon={Icons.TrendingDown}
                  variant="warning"
                />
                <StatCard
                  label="Overlay Total"
                  value={`R$ ${formatNumber(internalOverlayStats.totalOverlay)}`}
                  subValue={`USD ${formatNumber(Math.round(internalOverlayStats.totalOverlay / 5 * 100) / 100)}`}
                  icon={Icons.TrendingDown}
                  variant="danger"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* SA stats */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-500/10">
                  <Icons.Import className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Torneios SA</CardTitle>
                  <CardDescription>Planilha sul-americana</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {!hasSAData ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Icons.Import className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Importe a planilha SA na aba{" "}
                  <span className="font-medium text-foreground">Análise</span>.
                </p>
              </div>
            ) : saTotals ? (
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Torneios"
                  value={String(saData.tournaments.length)}
                  icon={Icons.PlayOutline}
                />
                <StatCard
                  label="PPST Overlay"
                  value={formatNumber(
                    Math.round(saTotals.ppst * 100) / 100,
                  )}
                  subValue={`R$ ${formatNumber(Math.round(saTotals.ppst * 5 * 100) / 100)}`}
                  icon={Icons.TrendingDown}
                  variant={saTotals.ppst < 0 ? "danger" : "default"}
                />
                <StatCard
                  label="SAT Total"
                  value={formatNumber(
                    Math.round(saTotals.sat * 100) / 100,
                  )}
                  subValue={`R$ ${formatNumber(Math.round(saTotals.sat * 5 * 100) / 100)}`}
                  icon={Icons.TrendingDown}
                  variant={saTotals.sat < 0 ? "danger" : "default"}
                />
                <StatCard
                  label="Total Geral"
                  value={formatNumber(
                    Math.round(saTotals.total * 100) / 100,
                  )}
                  subValue={`R$ ${formatNumber(Math.round(saTotals.total * 5 * 100) / 100)}`}
                  icon={Icons.PieChart}
                  variant={saTotals.total < 0 ? "danger" : "success"}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Cross-match comparison table */}
      {hasBothSources && crossMatched.rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-500/10">
                  <Icons.PieChart className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Confrontação de Overlays
                  </CardTitle>
                  <CardDescription>
                    Match por nome e dia entre interno e SA
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="bg-[#00C969]/10 text-[#00C969] border-[#00C969]/20 text-sm px-3 py-1"
                >
                  {crossMatched.matchCount} match
                  {crossMatched.matchCount !== 1 && "es"}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-sm px-3 py-1"
                >
                  {crossMatched.rows.length - crossMatched.matchCount} sem match
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-[60px]">Dia</TableHead>
                    <TableHead className="w-[50px]">Hora</TableHead>
                    <TableHead>Torneio Interno</TableHead>
                    <TableHead className="w-[110px] text-right">
                      Overlay R$
                    </TableHead>
                    <TableHead className="w-[20px] p-0" />
                    <TableHead>Torneio SA</TableHead>
                    <TableHead className="w-[100px] text-right">
                      Overlay USD
                    </TableHead>
                    <TableHead className="w-[50px] text-center">
                      Match
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crossMatched.rows.map((row, i) => (
                    <TableRow
                      key={`cm-${i}-${row.day}-${row.time}`}
                      className={row.matched ? "" : "opacity-70"}
                    >
                      <TableCell className="text-xs">
                        {dayLabels[row.day] || row.day}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.time || "-"}
                      </TableCell>
                      <TableCell
                        className={`text-sm max-w-[180px] truncate ${
                          row.internalName
                            ? "font-medium"
                            : "text-muted-foreground italic"
                        }`}
                        title={row.internalName || undefined}
                      >
                        {row.internalName || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.internalOverlay != null ? (
                          <span className="text-red-500">
                            R$ {formatNumber(row.internalOverlay)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="w-[20px] p-0"><div className="w-[2px] h-full mx-auto bg-border/50" /></TableCell>
                      <TableCell
                        className={`text-sm max-w-[180px] truncate ${
                          row.saName
                            ? "font-medium"
                            : "text-muted-foreground italic"
                        }`}
                        title={row.saName || undefined}
                      >
                        {row.saName || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.saOverlay != null ? (
                          <span
                            className={
                              row.saOverlay < 0
                                ? "text-red-500"
                                : "text-[#00C969]"
                            }
                          >
                            {formatNumber(row.saOverlay)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.matched ? (
                          <Icons.Check className="w-4 h-4 text-[#00C969] mx-auto" />
                        ) : (
                          <Icons.AlertCircle className="w-3.5 h-3.5 text-amber-500 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/30 font-medium">
                    <TableCell colSpan={3} className="text-right text-sm">
                      Totais:
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-red-500">
                      R$ {formatNumber(overlayTournaments.reduce((s, p) => s + p.realized.overlay, 0))}
                    </TableCell>
                    <TableCell className="w-[20px] p-0"><div className="w-[2px] h-full mx-auto bg-border/50" /></TableCell>
                    <TableCell />
                    <TableCell className="text-right font-mono text-sm font-bold text-red-500">
                      {formatNumber(
                        crossMatched.rows.reduce(
                          (s, r) => s + (r.saOverlay ?? 0),
                          0,
                        ),
                      )}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
