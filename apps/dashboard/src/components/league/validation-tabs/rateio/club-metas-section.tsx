"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { Spinner } from "@midpoker/ui/spinner";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWeek, getYear } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { ClubMetaForm } from "./club-meta-form";
import type { AvailableClub, MetaGroupData } from "./rateio-utils";
import { formatNumber } from "./rateio-utils";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

interface ClubMetasSectionProps {
  availableClubs: AvailableClub[];
  defaultWeekYear?: number;
  defaultWeekNumber?: number;
  metaGroups?: MetaGroupData[];
  usingFallback?: boolean;
  overlayTotal?: number;
}

export function ClubMetasSection({
  availableClubs,
  defaultWeekYear,
  defaultWeekNumber,
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

  // Organize available clubs by meta group (for fallback display)
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

  // Initialize equal distribution when clubsByGroup changes
  const initialPercents = useMemo(() => {
    const percents: Record<string, number> = {};
    if (!clubsByGroup) return percents;
    for (const { clubs } of clubsByGroup.groups) {
      if (clubs.length === 0) continue;
      const equal = Math.round((100 / clubs.length) * 10) / 10;
      for (const c of clubs) {
        percents[`${c.ligaId}-${c.clubeId}`] = equal;
      }
    }
    return percents;
  }, [clubsByGroup]);

  // Merge: local edits override initial values
  const effectivePercents = useMemo(() => {
    return { ...initialPercents, ...clubPercents };
  }, [initialPercents, clubPercents]);

  const handlePercentChange = useCallback(
    (key: string, value: number) => {
      setClubPercents((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Collapse state per group – SA starts collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (metaGroups) {
      for (const g of metaGroups) {
        if (g.name.toUpperCase() === "SA") {
          init[g.id] = true;
        }
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

      {!isLoading &&
        Object.keys(grouped).length === 0 &&
        clubsByGroup &&
        usingFallback && (
          <>
            {clubsByGroup.groups.map(({ group, clubs }) => {
              const groupOverlay =
                (group.metaPercent / 100) * overlayTotal;
              const groupPercentSum = clubs.reduce(
                (sum, c) =>
                  sum +
                  (effectivePercents[`${c.ligaId}-${c.clubeId}`] ?? 0),
                0,
              );
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
                    <span className="text-xs font-medium">{group.name}</span>
                    <Badge
                      variant="outline"
                      className="text-[9px] border-amber-500/30 text-amber-500"
                    >
                      Fallback
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {clubs.length} clubes
                    </span>
                    {overlayTotal > 0 && (
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {group.metaPercent}% → {formatNumber(groupOverlay)}
                      </span>
                    )}
                  </button>
                  {!isCollapsed && clubs.length > 0 ? (
                    <div className="space-y-1">
                      {clubs.map((c) => {
                        const key = `${c.ligaId}-${c.clubeId}`;
                        const pct = effectivePercents[key] ?? 0;
                        const clubOverlay = (pct / 100) * groupOverlay;
                        return (
                          <div
                            key={key}
                            className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-muted/30"
                          >
                            <span className="font-medium">{c.clubeNome}</span>
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
                            Soma: {groupPercentSum.toFixed(1)}%
                          </span>
                          <span>|</span>
                          <span>
                            {formatNumber(
                              (groupPercentSum / 100) * groupOverlay,
                            )}
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
            })}
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
