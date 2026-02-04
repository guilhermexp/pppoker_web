"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Checkbox } from "@midpoker/ui/checkbox";
import { Icons } from "@midpoker/ui/icons";
import { Spinner } from "@midpoker/ui/spinner";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWeek, getYear } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClubMetaForm } from "./club-meta-form";
import type { AvailableClub, MetaGroupData } from "./rateio-utils";
import { formatNumber, formatPercent } from "./rateio-utils";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

interface ClubMetasSectionProps {
  availableClubs: AvailableClub[];
  defaultWeekYear?: number;
  defaultWeekNumber?: number;
  weekStart?: string;
  weekEnd?: string;
  metaGroups?: MetaGroupData[];
  usingFallback?: boolean;
  overlayTotal?: number;
}

export function ClubMetasSection({
  availableClubs,
  defaultWeekYear,
  defaultWeekNumber,
  weekStart,
  weekEnd,
  metaGroups,
  usingFallback,
  overlayTotal = 0,
}: ClubMetasSectionProps) {
  const trpc = useTRPC();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const now = new Date();
  const [weekYear, setWeekYear] = useState(defaultWeekYear ?? getYear(now));
  const [weekNumber, setWeekNumber] = useState(
    defaultWeekNumber ??
      getWeek(now, { weekStartsOn: 0, firstWeekContainsDate: 1 }),
  );
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Query
  const { data: metas, isLoading } = useQuery(
    trpc.su.metas["clubMetas.getByWeek"].queryOptions({
      weekYear,
      weekNumber,
    }),
  );

  const overlayEnabled = !!(weekYear && weekNumber && weekStart && weekEnd);

  const { data: overlayDistribution } = useQuery(
    trpc.su.metas.overlayDistribution.queryOptions(
      {
        weekYear: weekYear ?? 0,
        weekNumber: weekNumber ?? 0,
        weekStart: weekStart ?? "",
        weekEnd: weekEnd ?? "",
      },
      { enabled: overlayEnabled },
    ),
  );

  const { data: overlaySelections } = useQuery(
    trpc.su.metas["overlaySelections.get"].queryOptions(
      {
        weekYear: weekYear ?? 0,
        weekNumber: weekNumber ?? 0,
      },
      { enabled: overlayEnabled },
    ),
  );

  // Mutations
  const createMetaMutation = useMutation(
    trpc.su.metas["clubMetas.create"].mutationOptions({
      onSuccess: () => {
        toast({ title: "Meta criada" });
        queryClient.invalidateQueries({
          queryKey: trpc.su.metas["clubMetas.getByWeek"].queryKey(),
        });
        setShowCreateForm(false);
      },
      onError: (error) => {
        toast({
          title: "Erro ao criar meta",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const deleteMetaMutation = useMutation(
    trpc.su.metas["clubMetas.delete"].mutationOptions({
      onSuccess: () => {
        toast({ title: "Meta removida" });
        queryClient.invalidateQueries({
          queryKey: trpc.su.metas["clubMetas.getByWeek"].queryKey(),
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao remover meta",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const inheritMutation = useMutation(
    trpc.su.metas["clubMetas.inheritFromPrevious"].mutationOptions({
      onSuccess: (result) => {
        toast({
          title: "Metas herdadas",
          description: `${result.count} metas copiadas da semana anterior`,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.su.metas["clubMetas.getByWeek"].queryKey(),
        });
      },
      onError: (error) => {
        toast({
          title: "Erro ao herdar metas",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  const handleInherit = () => {
    const prevWeek = weekNumber === 1 ? 52 : weekNumber - 1;
    const prevYear = weekNumber === 1 ? weekYear - 1 : weekYear;
    inheritMutation.mutate({
      targetWeekYear: weekYear,
      targetWeekNumber: weekNumber,
      sourceWeekYear: prevYear,
      sourceWeekNumber: prevWeek,
    });
  };

  // Build lookup map for club names
  const clubLookup = useMemo(() => {
    const map = new Map<string, AvailableClub>();
    for (const club of availableClubs) {
      map.set(`${club.ligaId}-${club.clubeId}`, club);
    }
    return map;
  }, [availableClubs]);

  // Organize available clubs by meta group (for fallback display in Gerenciamento)
  const clubsByGroup = useMemo(() => {
    if (!metaGroups || metaGroups.length === 0 || availableClubs.length === 0) {
      return null;
    }
    const result: { group: MetaGroupData; clubs: AvailableClub[] }[] = [];
    const assigned = new Set<string>();

    for (const group of metaGroups) {
      const memberLigaIds = new Set(group.members.map((m) => m.superUnionId));
      const groupClubs = availableClubs.filter((c) => {
        if (memberLigaIds.has(c.ligaId)) {
          assigned.add(`${c.ligaId}-${c.clubeId}`);
          return true;
        }
        return false;
      });
      result.push({ group, clubs: groupClubs });
    }

    const unassigned = availableClubs.filter(
      (c) => !assigned.has(`${c.ligaId}-${c.clubeId}`),
    );

    return { groups: result, unassigned };
  }, [metaGroups, availableClubs]);

  // Local state: club overlay % distribution within each group
  const [clubPercents, setClubPercents] = useState<Record<string, number>>({});
  const [selectedClubs, setSelectedClubs] = useState<Record<string, boolean>>(
    {},
  );

  // Club percents start at 0 – only filled when user manually sets a value
  const effectivePercents = clubPercents;

  const handlePercentChange = useCallback(
    (key: string, value: number) => {
      setClubPercents((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleClubSelection = useCallback((key: string, checked: boolean) => {
    setSelectedClubs((prev) => ({ ...prev, [key]: checked }));
  }, []);

  // Collapse state per group – SA starts collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (metaGroups) {
      for (const g of metaGroups) {
        init[g.id] = true;
      }
    }
    return init;
  });

  // Group metas by SuperUnion + Club
  const grouped = (metas ?? []).reduce((acc: Record<string, any[]>, m: any) => {
    const key = `${m.super_union_id}-${m.club_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  useEffect(() => {
    if (!clubsByGroup) return;
    setSelectedClubs((prev) => {
      const next = { ...prev };
      for (const { clubs } of clubsByGroup.groups) {
        for (const c of clubs) {
          const key = `${c.ligaId}-${c.clubeId}`;
          if (next[key] === undefined) {
            next[key] = false;
          }
        }
      }
      return next;
    });
  }, [clubsByGroup]);

  const overlayChargeSummary = useMemo(() => {
    if (!overlayDistribution) {
      return {
        hasSelections: false,
        selectedOverlayTotal: 0,
        selectedTournaments: [],
        unselectedTournaments: [],
        clubChargesByKey: new Map<string, number>(),
      };
    }

    const selections = overlaySelections ?? {};
    let hasSelections = false;
    let selectedOverlayTotal = 0;
    const clubChargesByKey = new Map<string, number>();
    const selectedTournaments: typeof overlayDistribution.tournaments = [];
    const unselectedTournaments: typeof overlayDistribution.tournaments = [];

    for (const t of overlayDistribution.tournaments) {
      const selected = selections[t.gameId] ?? false;
      if (selected) {
        hasSelections = true;
        selectedOverlayTotal += t.overlayAmount;
        selectedTournaments.push(t);

        for (const club of t.clubDistribution) {
          const key = `${club.ligaId}-${club.clubId}`;
          clubChargesByKey.set(
            key,
            (clubChargesByKey.get(key) ?? 0) + club.charge,
          );
        }
      } else {
        unselectedTournaments.push(t);
      }
    }

    return {
      hasSelections,
      selectedOverlayTotal: Math.round(selectedOverlayTotal * 100) / 100,
      selectedTournaments,
      unselectedTournaments,
      clubChargesByKey,
    };
  }, [overlayDistribution, overlaySelections]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Metas por Clube</span>
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              className="px-1 hover:text-foreground text-muted-foreground"
              onClick={() => {
                if (weekNumber === 1) {
                  setWeekYear(weekYear - 1);
                  setWeekNumber(52);
                } else {
                  setWeekNumber(weekNumber - 1);
                }
              }}
            >
              &larr;
            </button>
            <span className="font-mono text-xs">
              S{weekNumber}/{weekYear}
            </span>
            <button
              type="button"
              className="px-1 hover:text-foreground text-muted-foreground"
              onClick={() => {
                if (weekNumber === 52) {
                  setWeekYear(weekYear + 1);
                  setWeekNumber(1);
                } else {
                  setWeekNumber(weekNumber + 1);
                }
              }}
            >
              &rarr;
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleInherit}
            disabled={inheritMutation.isPending}
          >
            {inheritMutation.isPending
              ? "Copiando..."
              : "Herdar Semana Anterior"}
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowCreateForm(true)}
          >
            + Nova Meta
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Spinner className="w-5 h-5" />
        </div>
      )}

      {/* Fallback display: show clubs grouped by meta group (used in Gerenciamento) */}
      {!isLoading &&
        Object.keys(grouped).length === 0 &&
        clubsByGroup &&
        usingFallback && (
          <>
            {(() => {
              const groupSummaries = clubsByGroup.groups.map(({ group, clubs }) => {
                const groupOverlay = (group.metaPercent / 100) * overlayTotal;
                const groupClubCharges = clubs.reduce((sum, c) => {
                  const key = `${c.ligaId}-${c.clubeId}`;
                  if (!selectedClubs[key]) return sum;
                  return (
                    sum +
                    (overlayChargeSummary.clubChargesByKey.get(key) ?? 0)
                  );
                }, 0);
                const leaguePays = Math.max(groupOverlay - groupClubCharges, 0);
                return {
                  group,
                  clubs,
                  groupOverlay,
                  groupClubCharges,
                  leaguePays,
                };
              });

              const leagueGroup =
                groupSummaries.find(
                  (s) => s.group.name.toUpperCase() === "BR",
                ) ?? groupSummaries[0];
              const leagueTotal = leagueGroup?.leaguePays ?? 0;
              const leaguePercent =
                overlayTotal > 0 ? (leagueTotal / overlayTotal) * 100
                  : 0;

              const brDays = new Set<string>();
              const brHours = new Set<number>();
              for (const t of overlayChargeSummary.selectedTournaments) {
                brDays.add(t.dayOfWeekLabel);
                brHours.add(t.hour);
              }
              const brDaysLabel = Array.from(brDays).join(", ");
              const brHoursLabel = Array.from(brHours)
                .sort((a, b) => a - b)
                .map((h) => `${String(h).padStart(2, "0")}h`)
                .join(", ");

              return (
                <>
                  <div className="border border-dashed rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 w-full text-left">
                      <span className="text-xs font-medium">Liga</span>
                      <Badge
                        variant="outline"
                        className="text-[9px] border-amber-500/30 text-amber-500"
                      >
                        Fallback
                      </Badge>
                      {leagueGroup && overlayTotal > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          Paga: {formatNumber(leagueTotal)} (
                          {formatPercent(leaguePercent)})
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Liga ficou responsavel por{" "}
                      {overlayChargeSummary.unselectedTournaments.length}{" "}
                      torneios.
                    </div>
                  </div>

                  {groupSummaries.map(
                    ({ group, clubs, groupOverlay, groupClubCharges }) => {
                      const groupLeaguePays = Math.max(
                        groupOverlay - groupClubCharges,
                        0,
                      );
                      const groupLeaguePercent =
                        groupOverlay > 0
                          ? (groupLeaguePays / groupOverlay) * 100
                          : 0;
                      const isCollapsed = !!collapsedGroups[group.id];
                      return (
                        <div
                          key={group.id}
                          className="border border-dashed rounded-lg p-3 space-y-2"
                        >
                          <button
                            type="button"
                            className="flex items-center gap-2 w-full text-left"
                            onClick={() =>
                              setCollapsedGroups((prev) => ({
                                ...prev,
                                [group.id]: !prev[group.id],
                              }))
                            }
                          >
                            <Icons.ChevronRight
                              className={`w-3 h-3 text-muted-foreground transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                            />
                            <span className="text-xs font-medium">
                              {group.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] border-amber-500/30 text-amber-500"
                            >
                              Fallback
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {clubs.length} clubes
                            </span>
                          </button>
                          {overlayTotal > 0 && (
                            <div className="flex items-center justify-between px-2 text-[10px] text-muted-foreground">
                              <span>
                                Clubes: {formatNumber(groupClubCharges)}
                              </span>
                              <span>
                                Liga: {formatNumber(groupLeaguePays)} (
                                {formatPercent(groupLeaguePercent)})
                              </span>
                            </div>
                          )}
                          {!isCollapsed && clubs.length > 0 ? (
                            <div className="space-y-1">
                              {group.name.toUpperCase() === "BR" && (
                                <div className="px-2 text-[10px] text-muted-foreground">
                                  BR ficou responsavel por{" "}
                                  {overlayChargeSummary.selectedTournaments.length}{" "}
                                  torneios
                                  {brDaysLabel ? `, dias: ${brDaysLabel}` : ""}
                                  {brHoursLabel
                                    ? `, horarios: ${brHoursLabel}`
                                    : ""}
                                  .
                                </div>
                              )}
                              {clubs.map((c) => {
                                const key = `${c.ligaId}-${c.clubeId}`;
                                const pct = effectivePercents[key] ?? 0;
                                const isSelected = selectedClubs[key] ?? true;
                                const clubOverlay =
                                  isSelected
                                    ? overlayChargeSummary.clubChargesByKey.get(
                                        key,
                                      ) ?? 0
                                    : 0;
                                return (
                                  <div
                                    key={key}
                                    className={`flex items-center gap-2 text-xs px-2 py-1 rounded bg-muted/30 ${isSelected ? "" : "opacity-60"}`}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(value) =>
                                        handleClubSelection(key, Boolean(value))
                                      }
                                      className="h-3 w-3"
                                    />
                                    <span className="font-medium">
                                      {c.clubeNome}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {c.ligaNome}
                                    </span>
                                    <span className="text-muted-foreground text-[9px]">
                                      ({c.superUnionId}/{c.clubeId})
                                    </span>
                                    {overlayTotal > 0 && (
                                      <div className="flex items-center gap-1 ml-auto">
                                        <input
                                          type="number"
                                          min={0}
                                          max={100}
                                          step={0.1}
                                          value={pct}
                                          onChange={(e) =>
                                            handlePercentChange(
                                              key,
                                              Number(e.target.value) || 0,
                                            )
                                          }
                                          className="w-16 h-6 text-xs text-right font-mono bg-transparent border-b border-muted-foreground/30 outline-none focus:border-foreground"
                                        />
                                        <span className="text-[10px] text-muted-foreground">
                                          %
                                        </span>
                                        <span className="text-xs font-mono text-red-500 ml-2">
                                          {formatNumber(clubOverlay)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {overlayTotal > 0 && (
                                <div className="flex items-center justify-end gap-2 px-2 pt-1 text-[10px] text-muted-foreground">
                                  <span>
                                    Soma clubes: {formatNumber(groupClubCharges)}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : !isCollapsed ? (
                            <p className="text-xs text-muted-foreground">
                              Nenhum clube nesta importacao pertence a este grupo.
                            </p>
                          ) : null}
                        </div>
                      );
                    },
                  )}
                </>
              );
            })()}
            {clubsByGroup.unassigned.length > 0 && (
              <div className="border border-dashed rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Sem Grupo</span>
                  <span className="text-[10px] text-muted-foreground">
                    {clubsByGroup.unassigned.length} clubes
                  </span>
                </div>
                <div className="space-y-1">
                  {clubsByGroup.unassigned.map((c) => (
                    <div
                      key={`${c.ligaId}-${c.clubeId}`}
                      className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-muted/30"
                    >
                      <span className="font-medium">{c.clubeNome}</span>
                      <span className="text-muted-foreground">
                        {c.ligaNome}
                      </span>
                      <span className="text-muted-foreground text-[9px]">
                        ({c.superUnionId}/{c.clubeId})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      {!isLoading &&
        Object.keys(grouped).length === 0 &&
        (!clubsByGroup || !usingFallback) && (
          <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
            Nenhuma meta configurada para esta semana.
          </div>
        )}

      {!isLoading &&
        Object.entries(grouped).map(([key, clubMetas]) => {
          const first = clubMetas[0];
          const clubInfo = clubLookup.get(
            `${first.super_union_id}-${first.club_id}`,
          );
          return (
            <div key={key} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {clubInfo?.ligaNome ?? `Liga ${first.super_union_id}`}
                </span>
                <span className="text-muted-foreground text-xs">
                  {clubInfo?.clubeNome ?? `Clube ${first.club_id}`}
                </span>
                <span className="text-muted-foreground text-[9px]">
                  ({first.super_union_id}/{first.club_id})
                </span>
              </div>

              <div className="space-y-1">
                {clubMetas.map((m: any) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs px-2 py-1 rounded bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">
                        {m.target_type === "players" ? "Jogadores" : "Buyins"}
                      </Badge>
                      <span className="font-mono">
                        {m.target_type === "players"
                          ? `${m.targetValue} jogadores`
                          : formatNumber(m.targetValue)}
                      </span>
                      {m.day_of_week != null && (
                        <span className="text-muted-foreground">
                          {DAY_LABELS[m.day_of_week]}
                        </span>
                      )}
                      {m.hour_start != null && m.hour_end != null && (
                        <span className="text-muted-foreground">
                          {m.hour_start}h-{m.hour_end}h
                        </span>
                      )}
                      {m.note && (
                        <span className="text-muted-foreground italic truncate max-w-[120px]">
                          {m.note}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:text-red-500"
                      onClick={() => deleteMetaMutation.mutate({ id: m.id })}
                      disabled={deleteMetaMutation.isPending}
                    >
                      <Icons.Trash className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

      {/* Create Dialog */}
      <ClubMetaForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        onSubmit={(data) => createMetaMutation.mutate(data)}
        isPending={createMetaMutation.isPending}
        weekYear={weekYear}
        weekNumber={weekNumber}
        availableClubs={availableClubs}
        mode="create"
      />
    </div>
  );
}
