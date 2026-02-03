"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Card, CardContent } from "@midpoker/ui/card";
import { Checkbox } from "@midpoker/ui/checkbox";
import { Icons } from "@midpoker/ui/icons";
import { Spinner } from "@midpoker/ui/spinner";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type {
  OverlayDistributionClub,
  OverlayDistributionTournament,
  OverlaySelectionMap,
} from "./rateio-utils";
import { formatNumber } from "./rateio-utils";

interface OverlayDistributionSectionProps {
  weekYear?: number;
  weekNumber?: number;
  weekStart?: string;
  weekEnd?: string;
}

const STATUS_CONFIG = {
  no_matching_metas: {
    label: "Sem Meta",
    className: "bg-muted text-muted-foreground",
  },
  all_metas_met: {
    label: "Metas Batidas",
    className: "bg-green-500/10 text-green-600 border-green-500/30",
  },
  clubs_charged: {
    label: "Clubes Cobrados",
    className: "bg-red-500/10 text-red-600 border-red-500/30",
  },
} as const;

export function OverlayDistributionSection({
  weekYear,
  weekNumber,
  weekStart,
  weekEnd,
}: OverlayDistributionSectionProps) {
  const trpc = useTRPC();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const enabled = !!(weekYear && weekNumber && weekStart && weekEnd);

  // 1. Fetch all overlay tournaments
  const { data, isLoading } = useQuery(
    trpc.su.metas.overlayDistribution.queryOptions(
      {
        weekYear: weekYear ?? 0,
        weekNumber: weekNumber ?? 0,
        weekStart: weekStart ?? "",
        weekEnd: weekEnd ?? "",
      },
      { enabled },
    ),
  );

  // 2. Fetch saved selections
  const { data: savedSelections, isLoading: isLoadingSelections } = useQuery(
    trpc.su.metas["overlaySelections.get"].queryOptions(
      {
        weekYear: weekYear ?? 0,
        weekNumber: weekNumber ?? 0,
      },
      { enabled },
    ),
  );

  // 3. Local selection state
  const [selections, setSelections] = useState<OverlaySelectionMap>({});

  // Initialize selections from saved data when both queries resolve
  useEffect(() => {
    if (!data || savedSelections === undefined) return;
    const initial: OverlaySelectionMap = {};
    for (const t of data.tournaments) {
      initial[t.gameId] =
        savedSelections[t.gameId] !== undefined
          ? savedSelections[t.gameId]
          : false;
    }
    setSelections(initial);
  }, [data, savedSelections]);

  // 4. Save mutation
  const saveMutation = useMutation(
    trpc.su.metas["overlaySelections.save"].mutationOptions({
      onSuccess: () => {
        toast({ title: "Selecao salva" });
        queryClient.invalidateQueries({
          queryKey: trpc.su.metas["overlaySelections.get"].queryKey(),
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao salvar selecao",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  // 5. Compute filtered summary based on selections
  const computed = useMemo(() => {
    if (!data) return null;

    const selectedTournaments = data.tournaments.filter(
      (t) => selections[t.gameId],
    );
    const unselectedTournaments = data.tournaments.filter(
      (t) => !selections[t.gameId],
    );

    // Selected = overlay repassado aos clubes
    const totalClubCharges = selectedTournaments.reduce(
      (sum, t) => sum + t.overlayAmount,
      0,
    );
    // Unselected = liga paga sozinha
    const leagueRemainder = unselectedTournaments.reduce(
      (sum, t) => sum + t.overlayAmount,
      0,
    );

    // Recompute club summary from selected only
    const clubAccum = new Map<
      string,
      {
        clubId: number;
        clubName: string;
        superUnionId: number;
        ligaId: number;
        totalCharge: number;
        tournamentsCharged: number;
        tournamentsExempt: number;
      }
    >();

    for (const t of selectedTournaments) {
      for (const club of t.clubDistribution) {
        const key = `${club.superUnionId}-${club.clubId}`;
        if (!clubAccum.has(key)) {
          clubAccum.set(key, {
            clubId: club.clubId,
            clubName: club.clubName,
            superUnionId: club.superUnionId,
            ligaId: club.ligaId,
            totalCharge: 0,
            tournamentsCharged: 0,
            tournamentsExempt: 0,
          });
        }
        const accum = clubAccum.get(key)!;
        accum.totalCharge += club.charge;
        if (club.metMeta) {
          accum.tournamentsExempt++;
        } else {
          accum.tournamentsCharged++;
        }
      }
    }

    const clubSummary = Array.from(clubAccum.values())
      .map((c) => ({
        ...c,
        totalCharge: Math.round(c.totalCharge * 100) / 100,
      }))
      .sort((a, b) => b.totalCharge - a.totalCharge);

    const selectedCount = Object.values(selections).filter(Boolean).length;

    return {
      selectedCount,
      totalOverlayAll: data.summary.totalOverlayAmount,
      totalClubCharges: Math.round(totalClubCharges * 100) / 100,
      leagueRemainder: Math.round(leagueRemainder * 100) / 100,
      clubSummary,
    };
  }, [data, selections]);

  // 6. Dirty check — has user changed vs saved?
  const isDirty = useMemo(() => {
    if (!data || savedSelections === undefined) return false;
    for (const t of data.tournaments) {
      const saved =
        savedSelections[t.gameId] !== undefined
          ? savedSelections[t.gameId]
          : false;
      const current = selections[t.gameId] ?? false;
      if (saved !== current) return true;
    }
    return false;
  }, [data, savedSelections, selections]);

  // 7. Filters
  const [filterDay, setFilterDay] = useState<"all" | number>("all");
  const [filterHour, setFilterHour] = useState<"all" | number>("all");

  // Available days & hours from data
  const { availableDays, availableHours } = useMemo(() => {
    if (!data) return { availableDays: [], availableHours: [] };
    const days = new Map<number, string>();
    const hours = new Set<number>();
    for (const t of data.tournaments) {
      days.set(t.dayOfWeek, t.dayOfWeekLabel);
      hours.add(t.hour);
    }
    // Sort Mon(1)..Sat(6), Sun(0) last
    const daySort = (d: number) => (d === 0 ? 7 : d);
    return {
      availableDays: Array.from(days.entries())
        .sort((a, b) => daySort(a[0]) - daySort(b[0]))
        .map(([value, label]) => ({ value, label })),
      availableHours: Array.from(hours).sort((a, b) => a - b),
    };
  }, [data]);

  // Filtered tournaments for display
  const filteredTournaments = useMemo(() => {
    if (!data) return [];
    return data.tournaments.filter((t) => {
      if (filterDay !== "all" && t.dayOfWeek !== filterDay) return false;
      if (filterHour !== "all" && t.hour !== filterHour) return false;
      return true;
    });
  }, [data, filterDay, filterHour]);

  // Toggle helpers
  function toggleSelection(gameId: string) {
    setSelections((prev) => ({ ...prev, [gameId]: !prev[gameId] }));
  }

  function toggleAll() {
    if (!filteredTournaments.length) return;
    const allFilteredSelected = filteredTournaments.every(
      (t) => selections[t.gameId],
    );
    setSelections((prev) => {
      const next = { ...prev };
      for (const t of filteredTournaments) {
        next[t.gameId] = !allFilteredSelected;
      }
      return next;
    });
  }

  function handleSave() {
    if (!weekYear || !weekNumber || !data) return;
    saveMutation.mutate({
      weekYear,
      weekNumber,
      selections: data.tournaments.map((t) => ({
        gameId: t.gameId,
        isSelected: selections[t.gameId] ?? false,
      })),
    });
  }

  // ---- Render ----

  if (!enabled) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
        Importe dados na aba Grade para calcular a distribuicao de overlay.
      </div>
    );
  }

  if (isLoading || isLoadingSelections) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="w-5 h-5" />
      </div>
    );
  }

  if (!data || data.summary.totalOverlayTournaments === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
        Nenhum torneio com overlay nesta semana.
      </div>
    );
  }

  const totalCount = data.tournaments.length;
  const selectedCount = computed?.selectedCount ?? 0;
  const filteredCount = filteredTournaments.length;
  const allFilteredSelected =
    filteredCount > 0 &&
    filteredTournaments.every((t) => selections[t.gameId]);
  const hasFilters = filterDay !== "all" || filterHour !== "all";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Distribuicao de Overlay por Clubes
        </span>
        <span className="text-xs text-muted-foreground">
          S{weekNumber}/{weekYear} ({weekStart} a {weekEnd})
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">
              Torneios c/ Overlay
            </p>
            <p className="text-lg font-bold">
              {selectedCount}/{totalCount}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                selecionados
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">Total Overlay</p>
            <p className="text-lg font-bold text-red-500">
              {formatNumber(computed?.totalOverlayAll ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">
              Cobrado Clubes
            </p>
            <p className="text-lg font-bold text-amber-500">
              {formatNumber(computed?.totalClubCharges ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">Liga Paga</p>
            <p className="text-lg font-bold">
              {formatNumber(computed?.leagueRemainder ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Dia:</span>
        <button
          type="button"
          onClick={() => setFilterDay("all")}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
            filterDay === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Todos
        </button>
        {availableDays.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() =>
              setFilterDay(filterDay === d.value ? "all" : d.value)
            }
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              filterDay === d.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {d.label}
          </button>
        ))}

        <span className="text-xs text-muted-foreground ml-2">Hora:</span>
        <button
          type="button"
          onClick={() => setFilterHour("all")}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
            filterHour === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Todas
        </button>
        {availableHours.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() =>
              setFilterHour(filterHour === h ? "all" : h)
            }
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              filterHour === h
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {String(h).padStart(2, "0")}h
          </button>
        ))}

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setFilterDay("all");
              setFilterHour("all");
            }}
            className="px-2 py-0.5 rounded text-xs text-red-500 hover:bg-red-500/10 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Selection header with actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="overlay-select-all"
            checked={allFilteredSelected}
            onCheckedChange={() => toggleAll()}
          />
          <label
            htmlFor="overlay-select-all"
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            {allFilteredSelected ? "Desmarcar" : "Selecionar"}{" "}
            {hasFilters ? `${filteredCount} filtrados` : "todos"}
          </label>
          <span className="text-xs text-muted-foreground">
            {selectedCount}/{totalCount} selecionados
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!isDirty || saveMutation.isPending}
          onClick={handleSave}
        >
          {saveMutation.isPending ? (
            <Spinner className="w-3 h-3 mr-1" />
          ) : (
            <Icons.Check className="w-3 h-3 mr-1" />
          )}
          Salvar Selecao
        </Button>
      </div>

      {/* Tournament Table */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Torneios</span>
          {hasFilters && (
            <span className="text-xs text-muted-foreground">
              {filteredCount} de {totalCount}
            </span>
          )}
        </div>
        <div className="border rounded-lg overflow-hidden">
          {filteredTournaments.map((t) => (
            <TournamentRow
              key={t.gameId}
              tournament={t}
              isSelected={selections[t.gameId] ?? false}
              onToggle={() => toggleSelection(t.gameId)}
            />
          ))}
          {filteredCount === 0 && (
            <div className="py-4 text-center text-xs text-muted-foreground">
              Nenhum torneio para este filtro.
            </div>
          )}
        </div>
      </div>

      {/* Club Summary */}
      {(computed?.clubSummary.length ?? 0) > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium">Resumo por Clube</span>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">Clube</th>
                  <th className="px-3 py-2 font-medium text-right">
                    Total Cobrado
                  </th>
                  <th className="px-3 py-2 font-medium text-right">
                    Cobrados
                  </th>
                  <th className="px-3 py-2 font-medium text-right">
                    Isentos
                  </th>
                </tr>
              </thead>
              <tbody>
                {computed?.clubSummary.map((club) => (
                  <tr
                    key={`${club.superUnionId}-${club.clubId}`}
                    className="border-t border-border/50"
                  >
                    <td className="px-3 py-1.5">
                      <span className="font-medium">{club.clubName}</span>
                      <span className="text-muted-foreground ml-1 text-[9px]">
                        ({club.superUnionId}/{club.clubId})
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-amber-500">
                      {formatNumber(club.totalCharge)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">
                      {club.tournamentsCharged}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-green-600">
                      {club.tournamentsExempt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TournamentRow({
  tournament,
  isSelected,
  onToggle,
}: {
  tournament: OverlayDistributionTournament;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[tournament.status];

  return (
    <div
      className={`border-b border-border/50 last:border-b-0 transition-opacity ${
        isSelected ? "" : "opacity-50"
      }`}
    >
      <div className="flex items-center gap-1 px-3 py-2 text-xs">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle()}
          className="shrink-0"
        />
        <button
          type="button"
          className="flex-1 flex items-center gap-2 text-left hover:bg-muted/30 transition-colors rounded px-1"
          onClick={() => setExpanded(!expanded)}
        >
          <Icons.ChevronRight
            className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <span className="font-medium truncate max-w-[180px]">
            {tournament.gameName}
          </span>
          <span className="text-muted-foreground shrink-0">
            {tournament.dayOfWeekLabel}{" "}
            {String(tournament.hour).padStart(2, "0")}h
          </span>
          <Badge
            variant="outline"
            className={`text-[9px] shrink-0 ${config.className}`}
          >
            {config.label}
          </Badge>
          {!isSelected && (
            <Badge
              variant="outline"
              className="text-[9px] shrink-0 bg-muted text-muted-foreground"
            >
              Liga paga 100%
            </Badge>
          )}
          <span className="ml-auto font-mono text-red-500 shrink-0">
            {formatNumber(tournament.overlayAmount)}
          </span>
          {isSelected && tournament.totalClubCharges > 0 && (
            <span className="font-mono text-amber-500 shrink-0">
              -{formatNumber(tournament.totalClubCharges)}
            </span>
          )}
        </button>
      </div>

      {expanded && isSelected && tournament.clubDistribution.length > 0 && (
        <div className="px-3 pb-2">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="px-2 py-1 font-normal">Clube</th>
                <th className="px-2 py-1 font-normal text-right">Meta</th>
                <th className="px-2 py-1 font-normal text-right">Real</th>
                <th className="px-2 py-1 font-normal text-right">Deficit</th>
                <th className="px-2 py-1 font-normal text-right">Ref Buyin</th>
                <th className="px-2 py-1 font-normal text-right">Cobranca</th>
              </tr>
            </thead>
            <tbody>
              {tournament.clubDistribution.map((club) => (
                <ClubDistRow
                  key={`${club.superUnionId}-${club.clubId}`}
                  club={club}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border/30 font-medium">
                <td className="px-2 py-1" colSpan={5}>
                  Liga paga
                </td>
                <td className="px-2 py-1 text-right font-mono">
                  {formatNumber(tournament.leagueRemainder)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {expanded && !isSelected && (
        <div className="px-3 pb-2 text-[11px] text-muted-foreground">
          Torneio nao selecionado. Liga paga 100% do overlay (
          {formatNumber(tournament.overlayAmount)}).
        </div>
      )}

      {expanded &&
        isSelected &&
        tournament.clubDistribution.length === 0 && (
          <div className="px-3 pb-2 text-[11px] text-muted-foreground">
            Nenhuma meta definida para este horario. Liga paga{" "}
            {formatNumber(tournament.overlayAmount)}.
          </div>
        )}
    </div>
  );
}

function ClubDistRow({ club }: { club: OverlayDistributionClub }) {
  const bgClass = club.metMeta
    ? "bg-green-500/5"
    : club.shortfall > 0
      ? "bg-red-500/5"
      : "";

  return (
    <tr className={`border-t border-border/20 ${bgClass}`}>
      <td className="px-2 py-1">
        <span className="font-medium">{club.clubName}</span>
        <span className="text-muted-foreground ml-1 text-[9px]">
          ({club.superUnionId}/{club.clubId})
        </span>
      </td>
      <td className="px-2 py-1 text-right font-mono">
        {club.metaTarget}
        <span className="text-muted-foreground ml-0.5 text-[9px]">
          {club.metaType === "players" ? "jog" : "bi"}
        </span>
      </td>
      <td className="px-2 py-1 text-right font-mono">{club.actual}</td>
      <td className="px-2 py-1 text-right font-mono">
        {club.shortfall > 0 ? (
          <span className="text-red-500">{club.shortfall}</span>
        ) : (
          <span className="text-green-600">0</span>
        )}
      </td>
      <td className="px-2 py-1 text-right font-mono text-muted-foreground">
        {formatNumber(club.referenceBuyin)}
      </td>
      <td className="px-2 py-1 text-right font-mono">
        {club.charge > 0 ? (
          <span className="text-amber-500">{formatNumber(club.charge)}</span>
        ) : (
          <span className="text-green-600">R$ 0</span>
        )}
      </td>
    </tr>
  );
}
