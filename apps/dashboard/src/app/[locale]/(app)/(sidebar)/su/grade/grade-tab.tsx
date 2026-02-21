"use client";

import {
  type DateValidationResult,
  type MatchResult,
  type StoredRealizedData,
  matchTournaments,
  validateDateRanges,
} from "@/lib/league/tournament-matching";
import {
  type TournamentEvent,
  type TournamentScheduleData,
  calculateTotals,
  dayLabels,
  dayOrder,
  groupEventsByDay,
  parseTournamentSchedule,
} from "@/lib/league/tournament-schedule";
import { getWeekFromShortDateString } from "@/lib/poker/date-utils";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
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
import { useToast } from "@midpoker/ui/use-toast";
import { getWeek } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Chave do localStorage para dados da grade
const SCHEDULE_STORAGE_KEY = "ppst-tournament-schedule";

// Tipo para torneio salvo
export interface StoredTournament {
  name: string;
  day: string;
  time: string;
  gtd: number;
  buyIn: string;
  game: string;
}

// Tipo para dados salvos no localStorage
export interface StoredScheduleData {
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

// getWeekFromShortDateString imported from @/lib/poker/date-utils

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

// Badge de tipo de jogo com cores
function GameTypeBadge({ game }: { game: string }) {
  const normalized = game.toUpperCase();
  let colorClass = "bg-blue-500/10 text-blue-500 border-blue-500/20";

  if (normalized.includes("PLO")) {
    colorClass = "bg-orange-500/10 text-orange-500 border-orange-500/20";
  } else if (normalized.includes("SPIN")) {
    colorClass = "bg-pink-500/10 text-pink-500 border-pink-500/20";
  }

  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-medium ${colorClass}`}
    >
      {game}
    </Badge>
  );
}

// Componente de dia com torneios (layout compacto tipo Jogos PPST)
function DaySection({
  day,
  events,
  matchedKeys,
}: {
  day: string;
  events: TournamentEvent[];
  matchedKeys?: Set<string>;
}) {
  const dayTotal = events.reduce((sum, e) => {
    const gtd = Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0;
    return sum + gtd;
  }, 0);

  return (
    <div>
      {/* Cabeçalho do dia */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{dayLabels[day] || day}</span>
          <span className="text-xs text-muted-foreground">
            {events.length} torneios
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          GTD:{" "}
          <span className="font-mono font-medium text-foreground">
            {formatNumber(dayTotal)}
          </span>
          <span className="ml-1 opacity-60">USD</span>
        </div>
      </div>

      {/* Lista de torneios */}
      {events.map((event) => {
        const eventKey = `${day}-${event.times["-3"] || ""}-${event.name.trim().toUpperCase()}`;
        const gtdNum = Number.parseFloat(event.gtd.replace(/[^\d.]/g, "")) || 0;
        const hasGtd = gtdNum > 0;
        const isMatched = matchedKeys?.has(eventKey);
        const showIndicator = hasGtd && matchedKeys;

        return (
          <div
            key={event.id}
            className="flex items-center w-full px-3 py-1 text-xs hover:bg-muted/20"
          >
            {/* Match indicator */}
            {showIndicator ? (
              isMatched ? (
                <Icons.Check className="w-3 h-3 text-green-500 shrink-0 mr-1.5" />
              ) : (
                <Icons.Close className="w-3 h-3 text-red-500 shrink-0 mr-1.5" />
              )
            ) : (
              <span className="w-3 mr-1.5 shrink-0" />
            )}

            {/* Horário */}
            <span className="font-mono text-muted-foreground w-[40px] shrink-0">
              {event.times["-3"] || "-"}
            </span>

            {/* Tipo */}
            <span className="shrink-0 mr-1.5">
              <GameTypeBadge game={event.game} />
            </span>

            {/* Nome */}
            <span
              className="font-medium truncate min-w-0 mr-2"
              title={event.name}
            >
              {event.name}
            </span>

            {/* Spacer */}
            <span className="flex-1" />

            {/* Buy-in */}
            <span
              className="font-mono text-muted-foreground shrink-0 w-[32px] text-right mr-2"
              title="Buy-in"
            >
              {event.buyIn || "-"}
            </span>

            {/* GTD */}
            <span
              className={`font-mono shrink-0 w-[70px] text-right mr-2 ${hasGtd ? "text-[#00C969] font-medium" : "text-muted-foreground/40"}`}
              title={
                hasGtd
                  ? `GTD USD ${formatNumber(gtdNum)} / R$ ${formatNumber(gtdNum * 5)}`
                  : ""
              }
            >
              {hasGtd ? formatNumber(gtdNum) : "-"}
            </span>

            {/* R$ equivalente */}
            <span className="font-mono text-muted-foreground/50 shrink-0 w-[65px] text-right text-[10px] mr-2">
              {hasGtd ? `R$${formatNumber(gtdNum * 5)}` : ""}
            </span>

            {/* Rebuy / Stack / Late - compacto */}
            <span
              className="font-mono text-muted-foreground shrink-0 text-[10px] w-[90px] text-right"
              title={`Rebuy: ${event.rebuy || "-"} | Stack: ${event.stack || "-"} | Late: ${event.lateReg || "-"}`}
            >
              {event.rebuy || "-"} / {event.stack || "-"} /{" "}
              {event.lateReg || "-"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function GradeTab({
  realizedData,
}: {
  realizedData?: StoredRealizedData | null;
}) {
  const [data, setData] = useState<TournamentScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<
    "all" | "com-gtd" | "sem-gtd" | "overlay"
  >("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      setError(null);

      // Show processing toast (Vault style)
      const { dismiss } = toast({
        variant: "spinner",
        title: "Processando grade...",
        description: file.name,
        duration: Number.POSITIVE_INFINITY,
      });

      try {
        const result = await parseTournamentSchedule(file);
        setData(result);
        dismiss();
      } catch (err) {
        dismiss();
        setError("Erro ao processar arquivo. Verifique se é um XLSX válido.");
        console.error(err);
      } finally {
        setIsLoading(false);
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [toast],
  );

  const handleClear = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  const groupedEvents = data ? groupEventsByDay(data.events) : {};
  const totals = data
    ? calculateTotals(data.events)
    : { totalGTD: 0, totalTournaments: 0 };

  // Calcular informações da semana
  // Usa mesmas opções do modal de validação para consistência
  const weekInfo = useMemo(() => {
    const currentWeek = getWeek(new Date(), {
      weekStartsOn: 0,
      firstWeekContainsDate: 1,
    });

    if (!data) {
      return { currentWeek, scheduleWeek: null, isSameWeek: false };
    }

    const scheduleWeek = getWeekFromShortDateString(data.weekInfo.startDate);

    return {
      currentWeek,
      scheduleWeek,
      isSameWeek: scheduleWeek === currentWeek,
    };
  }, [data]);

  // Salvar dados da grade no localStorage para conferência cruzada
  useEffect(() => {
    if (data && weekInfo.scheduleWeek) {
      // Extrair torneios com GTD > 0 com todos os detalhes
      const tournaments: StoredTournament[] = data.events
        .filter((e) => {
          const gtd = Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0;
          return gtd > 0;
        })
        .map((e) => ({
          name: e.name.trim().toUpperCase(),
          day: e.day,
          time: e.times["-3"] || "",
          gtd: Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0,
          buyIn: e.buyIn,
          game: e.game,
        }));

      // Nomes para compatibilidade
      const tournamentNames = tournaments.map((t) => t.name);

      const storageData: StoredScheduleData = {
        weekNumber: weekInfo.scheduleWeek,
        totalGTD: totals.totalGTD,
        totalTournaments: totals.totalTournaments,
        weekInfo: {
          startDate: data.weekInfo.startDate,
          endDate: data.weekInfo.endDate,
        },
        savedAt: new Date().toISOString(),
        tournamentNames,
        tournaments,
      };
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(storageData));
    }
  }, [data, weekInfo.scheduleWeek, totals]);

  // Computar matching entre grade e dados realizados
  const matchResult: MatchResult | null = useMemo(() => {
    if (!data || !realizedData) return null;
    const scheduleTournaments: StoredTournament[] = data.events
      .filter((e) => (Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0) > 0)
      .map((e) => ({
        name: e.name.trim().toUpperCase(),
        day: e.day,
        time: e.times["-3"] || "",
        gtd: Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0,
        buyIn: e.buyIn,
        game: e.game,
      }));
    return matchTournaments(scheduleTournaments, realizedData.tournaments);
  }, [data, realizedData]);

  // Chaves compostas dos torneios que deram match (para indicadores visuais)
  const matchedKeys: Set<string> | undefined = useMemo(() => {
    if (!matchResult) return undefined;
    const keys = new Set<string>();
    for (const pair of matchResult.matched) {
      keys.add(
        `${pair.schedule.day}-${pair.schedule.time}-${pair.schedule.name}`,
      );
    }
    return keys;
  }, [matchResult]);

  // Filtro de torneios da grade
  const filteredGroupedEvents = useMemo(() => {
    if (!data) return {};
    if (gradeFilter === "all") return groupedEvents;
    let events = data.events;
    if (gradeFilter === "overlay") {
      if (!matchResult) return groupedEvents;
      const overlayKeys = new Set<string>();
      for (const pair of matchResult.matched) {
        if (pair.realized.overlay < 0) {
          overlayKeys.add(
            `${pair.schedule.day}-${pair.schedule.time}-${pair.schedule.name}`,
          );
        }
      }
      events = data.events.filter((e) => {
        const key = `${e.day}-${e.times["-3"] || ""}-${e.name.trim().toUpperCase()}`;
        return overlayKeys.has(key);
      });
    } else {
      events = data.events.filter((e) => {
        const gtd = Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0;
        return gradeFilter === "com-gtd" ? gtd > 0 : gtd === 0;
      });
    }
    return groupEventsByDay(events);
  }, [data, gradeFilter, matchResult, groupedEvents]);

  // Match result filtrado pelo gradeFilter
  const filteredMatchResult: MatchResult | null = useMemo(() => {
    if (!matchResult || gradeFilter === "all") return matchResult;
    if (gradeFilter === "overlay") {
      return {
        matched: matchResult.matched.filter((p) => p.realized.overlay < 0),
        missingFromImport: [],
        extraInImport: [],
      };
    }
    if (gradeFilter === "com-gtd") return matchResult;
    // sem-gtd: nenhum match possível (matching só ocorre com GTD)
    return { matched: [], missingFromImport: [], extraInImport: [] };
  }, [matchResult, gradeFilter]);

  // Validação de datas: comparar períodos DD/MM da grade vs import
  const dateValidation: DateValidationResult | null = useMemo(() => {
    if (!data || !realizedData?.period.start || !realizedData?.period.end)
      return null;
    return validateDateRanges(
      data.weekInfo.startDate,
      data.weekInfo.endDate,
      realizedData.period.start,
      realizedData.period.end,
    );
  }, [data, realizedData]);

  // Stats for PPST realized data
  const realizedStats = useMemo(() => {
    if (!realizedData?.tournaments) return null;
    let count = 0;
    let withGtd = 0;
    let overlayCount = 0;
    let totalOverlay = 0;
    for (const t of realizedData.tournaments) {
      count++;
      if (t.gtdFichas > 0) withGtd++;
      if (t.overlay < 0) {
        overlayCount++;
        totalOverlay += t.overlay;
      }
    }
    return { count, withGtd, overlayCount, totalOverlay };
  }, [realizedData]);

  return (
    <div className="flex flex-col gap-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
          <Icons.AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Two source cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade de Torneios card */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-500/10">
                  <Icons.CalendarMonth className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Grade de Torneios</CardTitle>
                  <CardDescription>
                    {data
                      ? `${data.weekInfo.startDate} - ${data.weekInfo.endDate}`
                      : "Programação semanal PPST"}
                  </CardDescription>
                </div>
              </div>
              {data && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    <Icons.Close className="w-4 h-4 mr-1" />
                    Limpar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                  >
                    <Icons.Import className="w-4 h-4 mr-1" />
                    Outra
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {data ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg dark:bg-[#0c0c0c] border dark:border-[#1d1d1d]">
                  <div className="flex items-center gap-2 mb-2">
                    <Icons.PlayOutline className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Torneios
                    </span>
                  </div>
                  <p className="text-xl font-mono font-bold">
                    {formatNumber(totals.totalTournaments)}
                  </p>
                  {weekInfo.scheduleWeek && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Semana {weekInfo.scheduleWeek}
                    </p>
                  )}
                </div>
                <div className="p-4 rounded-lg dark:bg-[#00C969]/5 border border-[#00C969]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Icons.TrendingUp className="w-4 h-4 text-[#00C969]" />
                    <span className="text-xs text-muted-foreground font-medium">
                      GTD Total
                    </span>
                  </div>
                  <p className="text-xl font-mono font-bold text-[#00C969]">
                    {formatNumber(totals.totalGTD)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    R$ {formatNumber(totals.totalGTD * 5)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Icons.CalendarMonth className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Importe a planilha XLSX com a grade semanal.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Icons.Import className="w-4 h-4 mr-2" />
                  Upload XLSX
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jogos PPST card */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-500/10">
                  <Icons.SyncAlt className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Jogos PPST</CardTitle>
                  <CardDescription>
                    {realizedData?.period
                      ? `${realizedData.period.start} - ${realizedData.period.end}`
                      : "Dados importados do sistema"}
                  </CardDescription>
                </div>
              </div>
              {realizedStats && realizedStats.overlayCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-red-500/10 text-red-500 border-red-500/20 text-sm px-3 py-1"
                >
                  {realizedStats.overlayCount} overlays
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {realizedStats ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg dark:bg-[#0c0c0c] border dark:border-[#1d1d1d]">
                  <div className="flex items-center gap-2 mb-2">
                    <Icons.PlayOutline className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Torneios
                    </span>
                  </div>
                  <p className="text-xl font-mono font-bold">
                    {realizedStats.count}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {realizedStats.withGtd} com GTD
                  </p>
                </div>
                <div
                  className={`p-4 rounded-lg ${realizedStats.overlayCount > 0 ? "dark:bg-red-500/5 border border-red-500/20" : "dark:bg-[#0c0c0c] border dark:border-[#1d1d1d]"}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icons.TrendingDown
                      className={`w-4 h-4 ${realizedStats.overlayCount > 0 ? "text-red-500" : "text-muted-foreground"}`}
                    />
                    <span className="text-xs text-muted-foreground font-medium">
                      Overlay
                    </span>
                  </div>
                  <p
                    className={`text-xl font-mono font-bold ${realizedStats.overlayCount > 0 ? "text-red-500" : ""}`}
                  >
                    {realizedStats.overlayCount > 0
                      ? formatNumber(realizedStats.totalOverlay)
                      : "0"}
                  </p>
                  {realizedStats.overlayCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {realizedStats.overlayCount} torneios
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Icons.AlertCircle className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Importe e aprove dados PPST na tela de{" "}
                  <span className="font-medium text-foreground">
                    Importação
                  </span>
                  .
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Content below cards (when schedule data exists) */}
      {data && (
        <div className="space-y-6">
          {/* Week Info & Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            {weekInfo.scheduleWeek && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  weekInfo.isSameWeek
                    ? "bg-[#00C969]/10 text-[#00C969] border-[#00C969]/30"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                }`}
              >
                <Icons.DateFormat className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Semana {weekInfo.scheduleWeek}
                </span>
                {!weekInfo.isSameWeek && (
                  <span className="text-xs opacity-70">
                    (atual: {weekInfo.currentWeek})
                  </span>
                )}
              </div>
            )}

            {/* Filtro */}
            <div className="flex items-center gap-1 ml-auto">
              {(
                [
                  { value: "all", label: "Todos" },
                  { value: "com-gtd", label: "Com GTD" },
                  { value: "sem-gtd", label: "Sem GTD" },
                  { value: "overlay", label: "Overlay" },
                ] as const
              ).map((opt) => (
                <Button
                  key={opt.value}
                  variant={gradeFilter === opt.value ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setGradeFilter(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Confrontação Grade × Import PPST */}
          {matchResult && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-500/10">
                      <Icons.SyncAlt className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        Confrontação Grade x Import
                      </CardTitle>
                      <CardDescription>
                        Match por nome, dia e horário entre grade e import PPST
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="bg-[#00C969]/10 text-[#00C969] border-[#00C969]/20 text-sm px-3 py-1"
                    >
                      {filteredMatchResult?.matched.length ?? 0} matched
                    </Badge>
                    {(filteredMatchResult?.missingFromImport.length ?? 0) >
                      0 && (
                      <Badge
                        variant="outline"
                        className="bg-red-500/10 text-red-500 border-red-500/20 text-sm px-3 py-1"
                      >
                        {filteredMatchResult?.missingFromImport.length} ausentes
                      </Badge>
                    )}
                    {(filteredMatchResult?.extraInImport.length ?? 0) > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-sm px-3 py-1"
                      >
                        {filteredMatchResult?.extraInImport.length} extras
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Validação de datas */}
                {dateValidation && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg border ${
                      dateValidation.datesMatch
                        ? "bg-[#00C969]/10 text-[#00C969] border-[#00C969]/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                    }`}
                  >
                    {dateValidation.datesMatch ? (
                      <Icons.Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <Icons.AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span className="text-sm">
                      {dateValidation.datesMatch ? (
                        <>
                          Períodos conferem: Grade{" "}
                          <span className="font-medium">
                            {dateValidation.scheduleStart}-
                            {dateValidation.scheduleEnd}
                          </span>{" "}
                          | Import{" "}
                          <span className="font-medium">
                            {dateValidation.importStart}-
                            {dateValidation.importEnd}
                          </span>
                        </>
                      ) : (
                        <>
                          Períodos diferentes: Grade{" "}
                          <span className="font-medium">
                            {dateValidation.scheduleStart}-
                            {dateValidation.scheduleEnd}
                          </span>{" "}
                          | Import{" "}
                          <span className="font-medium">
                            {dateValidation.importStart}-
                            {dateValidation.importEnd}
                          </span>
                          <span className="block text-xs mt-0.5 opacity-80">
                            Verifique se está usando a planilha correta.
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                )}

                {/* Tabela side-by-side: Grade × Import */}
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="w-[60px]">Dia</TableHead>
                        <TableHead className="w-[50px]">Hora</TableHead>
                        <TableHead>Grade (Previsto)</TableHead>
                        <TableHead className="w-[110px] text-right">
                          GTD
                        </TableHead>
                        <TableHead className="w-[20px] p-0" />
                        <TableHead>Import PPST (Realizado)</TableHead>
                        <TableHead className="w-[110px] text-right">
                          GTD
                        </TableHead>
                        <TableHead className="w-[90px] text-right">
                          Resultado
                        </TableHead>
                        <TableHead className="w-[50px] text-center">
                          Match
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Matched pairs */}
                      {filteredMatchResult?.matched
                        .sort((a, b) => {
                          const dayDiff =
                            (dayOrder.indexOf(a.schedule.day) ?? 0) -
                            (dayOrder.indexOf(b.schedule.day) ?? 0);
                          if (dayDiff !== 0) return dayDiff;
                          return a.schedule.time.localeCompare(b.schedule.time);
                        })
                        .map((pair, i) => (
                          <TableRow
                            key={`m-${i}-${pair.schedule.day}-${pair.schedule.time}-${pair.schedule.name}`}
                          >
                            <TableCell className="text-xs">
                              {dayLabels[pair.schedule.day] ||
                                pair.schedule.day}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {pair.schedule.time || "-"}
                            </TableCell>
                            <TableCell
                              className="font-medium text-sm max-w-[180px] truncate"
                              title={pair.schedule.name}
                            >
                              {pair.schedule.name}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                              USD {formatNumber(pair.schedule.gtd)}
                            </TableCell>
                            <TableCell className="w-[20px] p-0">
                              <div className="w-[2px] h-full mx-auto bg-border/50" />
                            </TableCell>
                            <TableCell
                              className="font-medium text-sm max-w-[180px] truncate"
                              title={pair.realized.name}
                            >
                              {pair.realized.name}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                              R$ {formatNumber(pair.realized.gtdFichas)}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <span
                                className={`font-mono text-sm font-medium ${pair.realized.overlay >= 0 ? "text-[#00C969]" : "text-red-500"}`}
                              >
                                {pair.realized.overlay >= 0 ? "+" : ""}
                                {formatNumber(pair.realized.overlay)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Icons.Check className="w-4 h-4 text-[#00C969] mx-auto" />
                            </TableCell>
                          </TableRow>
                        ))}

                      {/* Missing from import (only in schedule) */}
                      {(filteredMatchResult?.missingFromImport ?? [])
                        .sort((a, b) => {
                          const dayDiff =
                            (dayOrder.indexOf(a.day) ?? 0) -
                            (dayOrder.indexOf(b.day) ?? 0);
                          if (dayDiff !== 0) return dayDiff;
                          return a.time.localeCompare(b.time);
                        })
                        .map((t, i) => (
                          <TableRow
                            key={`miss-${i}-${t.day}-${t.time}-${t.name}`}
                            className="opacity-70"
                          >
                            <TableCell className="text-xs">
                              {dayLabels[t.day] || t.day}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {t.time || "-"}
                            </TableCell>
                            <TableCell
                              className="font-medium text-sm max-w-[180px] truncate"
                              title={t.name}
                            >
                              {t.name}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                              USD {formatNumber(t.gtd)}
                            </TableCell>
                            <TableCell className="w-[20px] p-0">
                              <div className="w-[2px] h-full mx-auto bg-border/50" />
                            </TableCell>
                            <TableCell className="text-muted-foreground italic text-sm">
                              -
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              -
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              -
                            </TableCell>
                            <TableCell className="text-center">
                              <Icons.Close className="w-3.5 h-3.5 text-red-500 mx-auto" />
                            </TableCell>
                          </TableRow>
                        ))}

                      {/* Extra in import (not in schedule) */}
                      {(filteredMatchResult?.extraInImport ?? [])
                        .sort((a, b) => {
                          const dayDiff =
                            (dayOrder.indexOf(a.day) ?? 0) -
                            (dayOrder.indexOf(b.day) ?? 0);
                          if (dayDiff !== 0) return dayDiff;
                          return a.time.localeCompare(b.time);
                        })
                        .map((t, i) => (
                          <TableRow
                            key={`extra-${i}-${t.day}-${t.time}-${t.name}`}
                            className="opacity-70"
                          >
                            <TableCell className="text-xs">
                              {dayLabels[t.day] || t.day}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {t.time || "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground italic text-sm">
                              -
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              -
                            </TableCell>
                            <TableCell className="w-[20px] p-0">
                              <div className="w-[2px] h-full mx-auto bg-border/50" />
                            </TableCell>
                            <TableCell
                              className="font-medium text-sm max-w-[180px] truncate"
                              title={t.name}
                            >
                              {t.name}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                              R$ {formatNumber(t.gtdFichas)}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <span
                                className={`font-mono text-sm font-medium ${t.overlay >= 0 ? "text-[#00C969]" : "text-red-500"}`}
                              >
                                {t.overlay >= 0 ? "+" : ""}
                                {formatNumber(t.overlay)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Icons.AlertCircle className="w-3.5 h-3.5 text-amber-500 mx-auto" />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Days */}
          <Card>
            <CardContent className="p-0 overflow-hidden">
              {/* Cabeçalho de colunas */}
              <div className="flex items-center w-full px-3 py-1 text-[10px] text-muted-foreground border-b border-border/20 bg-muted/20">
                <span className="w-3 mr-1.5 shrink-0" />
                <span className="w-[40px] shrink-0">Hora</span>
                <span className="shrink-0 mr-1.5 w-[36px]">Tipo</span>
                <span className="mr-2">Torneio</span>
                <span className="flex-1" />
                <span className="w-[32px] text-right mr-2">BI</span>
                <span className="w-[70px] text-right mr-2">GTD USD</span>
                <span className="w-[65px] text-right text-[9px] mr-2">
                  GTD R$
                </span>
                <span className="w-[90px] text-right">Reb / Stk / Late</span>
              </div>
              {dayOrder.map((day) => {
                const events = filteredGroupedEvents[day];
                if (!events || events.length === 0) return null;
                return (
                  <DaySection
                    key={day}
                    day={day}
                    events={events}
                    matchedKeys={matchedKeys}
                  />
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
