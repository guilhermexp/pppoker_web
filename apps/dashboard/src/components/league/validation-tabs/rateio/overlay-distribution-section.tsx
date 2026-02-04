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
  MetaGroupData,
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
  metaGroups?: MetaGroupData[];
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
  metaGroups,
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
  const [tournamentMetaPlayers, setTournamentMetaPlayers] = useState<
    Record<string, number>
  >({});

  // Initialize selections from saved data when both queries resolve
  useEffect(() => {
    if (!data || savedSelections === undefined) return;
    const initial: OverlaySelectionMap = {};
    for (const t of data.tournaments) {
      const saved = savedSelections[t.gameId];
      initial[t.gameId] = {
        isSelected: saved ? saved.isSelected : false,
        metaPlayers: saved ? saved.metaPlayers : 0,
      };
    }
    setSelections(initial);
    setTournamentMetaPlayers((prev) => {
      const next = { ...prev };
      for (const t of data.tournaments) {
        if (next[t.gameId] === undefined) {
          next[t.gameId] = savedSelections[t.gameId]?.metaPlayers ?? 0;
        }
      }
      return next;
    });
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

  // 4b. Group selector state — default to first group (BR)
  const defaultGroupId = metaGroups?.[0] ? (metaGroups[0].id ?? metaGroups[0].name) : null;
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(defaultGroupId);

  // Keep in sync if metaGroups loads after initial render
  useEffect(() => {
    if (selectedGroupId === null && defaultGroupId) {
      setSelectedGroupId(defaultGroupId);
    }
  }, [defaultGroupId, selectedGroupId]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId || !metaGroups) return null;
    return metaGroups.find((g) => (g.id ?? g.name) === selectedGroupId) ?? null;
  }, [selectedGroupId, metaGroups]);

  const groupMemberSuIds = useMemo(() => {
    if (!selectedGroup) return null;
    return new Set(selectedGroup.members.map((m) => m.superUnionId));
  }, [selectedGroup]);

  const groupPercent = selectedGroup ? selectedGroup.metaPercent / 100 : 1;

  // 5. Compute filtered summary based on selections + group filter
  const computed = useMemo(() => {
    if (!data) return null;

    const selectedTournaments = data.tournaments.filter(
      (t) => selections[t.gameId]?.isSelected,
    );
    const unselectedTournaments = data.tournaments.filter(
      (t) => !selections[t.gameId]?.isSelected,
    );

    // Group-scaled overlay per tournament
    const overlayForTournament = (t: OverlayDistributionTournament) =>
      t.overlayAmount * groupPercent;

    // Selected = overlay repassado aos clubes (scaled by group %)
    const totalSelectedOverlay = selectedTournaments.reduce(
      (sum, t) => sum + overlayForTournament(t),
      0,
    );
    // Unselected = liga paga sozinha (scaled by group %)
    const totalUnselectedOverlay = unselectedTournaments.reduce(
      (sum, t) => sum + overlayForTournament(t),
      0,
    );

    // Recompute club summary from selected only, filtered by group members
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
        if (groupMemberSuIds && !groupMemberSuIds.has(club.superUnionId))
          continue;
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

    const totalClubCharges = clubSummary.reduce(
      (sum, c) => sum + c.totalCharge,
      0,
    );

    const selectedCount = Object.values(selections).filter((s) => s?.isSelected).length;

    const totalOverlayGroup =
      data.summary.totalOverlayAmount * groupPercent;

    return {
      selectedCount,
      totalOverlayAll: Math.round(totalOverlayGroup * 100) / 100,
      totalClubCharges: Math.round(totalClubCharges * 100) / 100,
      leagueRemainder: Math.round(
        (totalOverlayGroup - totalClubCharges) * 100,
      ) / 100,
      clubSummary,
    };
  }, [data, selections, groupPercent, groupMemberSuIds]);

  // 6. Dirty check — has user changed vs saved?
  const isDirty = useMemo(() => {
    if (!data || savedSelections === undefined) return false;
    for (const t of data.tournaments) {
      const saved = savedSelections[t.gameId];
      const current = selections[t.gameId];
      const savedSelected = saved ? saved.isSelected : false;
      const savedMeta = saved ? saved.metaPlayers : 0;
      const currentSelected = current ? current.isSelected : false;
      const currentMeta = current ? current.metaPlayers : 0;
      if (savedSelected !== currentSelected) return true;
      if (savedMeta !== currentMeta) return true;
    }
    return false;
  }, [data, savedSelections, selections]);

  // 7. Filters
  const [filterDay, setFilterDay] = useState<"all" | number>("all");
  const [filterHours, setFilterHours] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<"hour" | "gtd">("hour");

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

  // Filtered + sorted tournaments for display
  const filteredTournaments = useMemo(() => {
    if (!data) return [];
    const filtered = data.tournaments.filter((t) => {
      if (filterDay !== "all" && t.dayOfWeek !== filterDay) return false;
      if (filterHours.size > 0 && !filterHours.has(t.hour)) return false;
      return true;
    });
    if (sortBy === "gtd") {
      filtered.sort((a, b) => b.gtdAmount - a.gtdAmount);
    } else {
      const daySort = (d: number) => (d === 0 ? 7 : d);
      filtered.sort(
        (a, b) =>
          daySort(a.dayOfWeek) - daySort(b.dayOfWeek) || a.hour - b.hour,
      );
    }
    return filtered;
  }, [data, filterDay, filterHours, sortBy]);

  // Toggle helpers
  function toggleSelection(gameId: string) {
    setSelections((prev) => ({
      ...prev,
      [gameId]: {
        isSelected: !(prev[gameId]?.isSelected ?? false),
        metaPlayers: prev[gameId]?.metaPlayers ?? 0,
      },
    }));
  }

  function toggleAll() {
    if (!filteredTournaments.length) return;
    const allFilteredSelected = filteredTournaments.every(
      (t) => selections[t.gameId]?.isSelected,
    );
    setSelections((prev) => {
      const next = { ...prev };
      for (const t of filteredTournaments) {
        next[t.gameId] = {
          isSelected: !allFilteredSelected,
          metaPlayers: next[t.gameId]?.metaPlayers ?? 0,
        };
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
        isSelected: selections[t.gameId]?.isSelected ?? false,
        metaPlayers: selections[t.gameId]?.metaPlayers ?? 0,
      })),
    });
  }

  function handleClearSelection() {
    if (!weekYear || !weekNumber || !data) return;
    const cleared: OverlaySelectionMap = {};
    for (const t of data.tournaments) {
      cleared[t.gameId] = { isSelected: false, metaPlayers: 0 };
    }
    setSelections(cleared);
    saveMutation.mutate({
      weekYear,
      weekNumber,
      selections: data.tournaments.map((t) => ({
        gameId: t.gameId,
        isSelected: false,
        metaPlayers: 0,
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
    filteredTournaments.every((t) => selections[t.gameId]?.isSelected);
  const hasAnySelected = Object.values(selections).some(Boolean);
  const hasFilters = filterDay !== "all" || filterHours.size > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            Distribuicao de Overlay por Clubes
          </span>
          {metaGroups && metaGroups.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Grupo:</span>
              <button
                type="button"
                onClick={() => setSelectedGroupId(null)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  selectedGroupId === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Todos
              </button>
              {metaGroups.map((g) => {
                const gKey = g.id ?? g.name;
                return (
                  <button
                    key={gKey}
                    type="button"
                    onClick={() =>
                      setSelectedGroupId(
                        selectedGroupId === gKey ? null : gKey,
                      )
                    }
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      selectedGroupId === gKey
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {g.name}{" "}
                    <span className="opacity-60">{g.metaPercent}%</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
            <p className="text-[10px] text-muted-foreground">
              Total Overlay{selectedGroup ? ` (${selectedGroup.name} ${selectedGroup.metaPercent}%)` : ""}
            </p>
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
          onClick={() => setFilterHours(new Set())}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
            filterHours.size === 0
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
              setFilterHours((prev) => {
                const next = new Set(prev);
                if (next.has(h)) {
                  next.delete(h);
                } else {
                  next.add(h);
                }
                return next;
              })
            }
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              filterHours.has(h)
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
              setFilterHours(new Set());
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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!hasAnySelected || saveMutation.isPending}
            onClick={handleClearSelection}
          >
            <Icons.Delete className="w-3 h-3 mr-1" />
            Limpar Selecao
          </Button>
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
      </div>

      {/* Tournament Table */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Torneios</span>
            <span className="text-[10px] text-muted-foreground">Ordem:</span>
            <button
              type="button"
              onClick={() => setSortBy("hour")}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                sortBy === "hour"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Horario
            </button>
            <button
              type="button"
              onClick={() => setSortBy("gtd")}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                sortBy === "gtd"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Garantido
            </button>
          </div>
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
              isSelected={selections[t.gameId]?.isSelected ?? false}
              onToggle={() => toggleSelection(t.gameId)}
              metaPlayers={tournamentMetaPlayers[t.gameId] ?? 0}
              onMetaChange={(value) =>
                setTournamentMetaPlayers((prev) => ({
                  ...prev,
                  [t.gameId]: value,
                }))
              }
              groupPercent={groupPercent}
              groupMemberSuIds={groupMemberSuIds}
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
  metaPlayers,
  onMetaChange,
  groupPercent,
  groupMemberSuIds,
}: {
  tournament: OverlayDistributionTournament;
  isSelected: boolean;
  onToggle: () => void;
  metaPlayers: number;
  onMetaChange: (value: number) => void;
  groupPercent: number;
  groupMemberSuIds: Set<number> | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[tournament.status];

  const scaledOverlay = tournament.overlayAmount * groupPercent;
  const filteredClubs = groupMemberSuIds
    ? tournament.clubDistribution.filter((c) =>
        groupMemberSuIds.has(c.superUnionId),
      )
    : tournament.clubDistribution;
  const filteredCharges = filteredClubs.reduce((s, c) => s + c.charge, 0);
  const filteredLeagueRemainder = scaledOverlay - filteredCharges;

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
          <span className="px-1.5 py-0.5 rounded bg-muted text-foreground font-medium text-[10px] shrink-0">
            GTD {formatNumber(tournament.gtdAmount)}
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
            {formatNumber(scaledOverlay)}
          </span>
          {isSelected && filteredCharges > 0 && (
            <span className="font-mono text-amber-500 shrink-0">
              -{formatNumber(filteredCharges)}
            </span>
          )}
          <div className="flex items-center gap-2 ml-3">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>Meta</span>
              <input
                type="number"
                min={0}
                step={1}
                value={metaPlayers}
                onChange={(e) =>
                  onMetaChange(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-12 h-6 text-[10px] text-right font-mono bg-transparent border-b border-muted-foreground/30 outline-none focus:border-foreground"
              />
              <span>jog</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              x{" "}
              <span className="text-foreground font-mono">
                Buyin {formatNumber(tournament.buyinBase)}
              </span>{" "}
              ={" "}
              <span className="text-blue-500 font-mono">
                {formatNumber(metaPlayers * tournament.buyinBase)}
              </span>
            </span>
          </div>
        </button>
      </div>

      {expanded && isSelected && filteredClubs.length > 0 && (
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
              {filteredClubs.map((club) => (
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
                  {formatNumber(filteredLeagueRemainder)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {expanded && !isSelected && (
        <div className="px-3 pb-2 text-[11px] text-muted-foreground">
          Torneio nao selecionado. Liga paga 100% do overlay (
          {formatNumber(scaledOverlay)}).
        </div>
      )}

      {expanded &&
        isSelected &&
        filteredClubs.length === 0 && (
          <div className="px-3 pb-2 text-[11px] text-muted-foreground">
            Nenhuma meta definida para este horario. Liga paga{" "}
            {formatNumber(scaledOverlay)}.
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
