"use client";

import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@midpoker/ui/card";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { AvailableClub, MetaGroupData } from "./rateio-utils";
import { formatNumber } from "./rateio-utils";

interface ClubData {
  clubeId: number;
  clubeNome: string;
  ligaId: number;
  superUnionId: number | null;
  totalBuyin: number;
  totalTaxa: number;
  totalEntries: number;
  liquido: number;
  overlayGameCount: number;
}
interface ClubTournamentDetail {
  gameId: string;
  gameName: string;
  startedAt: string;
  entries: number;
  totalBuyin: number;
  totalTaxa: number;
  liquido: number;
}

interface ForecastClubData {
  clubeId: number;
  clubeNome: string;
  ligaId: number;
  superUnionId: number | null;
  forecastBuyin: number;
  tournamentsWithMeta: number;
  totalMetaTarget: number;
}

interface ArrecadacaoSectionProps {
  availableClubs: AvailableClub[];
  weekYear?: number;
  weekNumber?: number;
  weekStart?: string;
  weekEnd?: string;
  metaGroups?: MetaGroupData[];
}

export function ArrecadacaoSection({
  availableClubs,
  weekYear,
  weekNumber,
  weekStart,
  weekEnd,
  metaGroups,
}: ArrecadacaoSectionProps) {
  const trpc = useTRPC();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Read per-club overlay data from the database via tRPC
  const { data } = useQuery(
    trpc.su.analytics.getOverlayClubs.queryOptions({
      weekYear,
      weekNumber,
      weekStart,
      weekEnd,
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

  const clubs = data?.clubs ?? [];
  const summary = data?.summary;
  const clubDetails = data?.clubDetails ?? {};

  const brGroup = useMemo(() => {
    if (!metaGroups) return undefined;
    return metaGroups.find((g) => g.name.toUpperCase() === "BR");
  }, [metaGroups]);

  const brLeagueIds = useMemo(() => {
    if (!brGroup) return new Set<number>();
    return new Set(brGroup.members.map((m) => m.superUnionId));
  }, [brGroup]);

  const brClubKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const c of availableClubs) {
      if (brLeagueIds.has(c.ligaId)) {
        keys.add(`${c.ligaId}-${c.clubeId}`);
      }
    }
    return keys;
  }, [availableClubs, brLeagueIds]);

  const brClubData = useMemo(() => {
    const withEntries: ClubData[] = [];
    const withEntriesKey = new Set<string>();

    for (const club of clubs) {
      const key = `${club.ligaId}-${club.clubeId}`;
      if (!brClubKeys.has(key)) continue;
      if ((club.totalEntries ?? 0) > 0) {
        withEntries.push(club);
        withEntriesKey.add(key);
      }
    }

    const withoutEntries: ClubData[] = [];
    for (const c of availableClubs) {
      const key = `${c.ligaId}-${c.clubeId}`;
      if (!brClubKeys.has(key) || withEntriesKey.has(key)) continue;
      withoutEntries.push({
        clubeId: c.clubeId,
        clubeNome: c.clubeNome,
        ligaId: c.ligaId,
        superUnionId: c.superUnionId,
        totalBuyin: 0,
        totalTaxa: 0,
        totalEntries: 0,
        liquido: 0,
        overlayGameCount: 0,
      });
    }

    return {
      withEntries: withEntries.sort((a, b) => b.totalBuyin - a.totalBuyin),
      withoutEntries: withoutEntries.sort((a, b) =>
        a.clubeNome.localeCompare(b.clubeNome),
      ),
    };
  }, [availableClubs, brClubKeys, clubs]);

  const [expandedClubs, setExpandedClubs] = useState<Set<string>>(new Set());
  const toggleClub = (key: string) => {
    setExpandedClubs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const brSummary = useMemo(() => {
    const all = [...brClubData.withEntries, ...brClubData.withoutEntries];
    const totalBuyin = all.reduce((s, c) => s + c.totalBuyin, 0);
    const totalTaxa = all.reduce((s, c) => s + c.totalTaxa, 0);
    const totalLiquido = all.reduce((s, c) => s + c.liquido, 0);
    const totalClubs = all.length;
    return { totalBuyin, totalTaxa, totalLiquido, totalClubs };
  }, [brClubData]);

  // --- Forecast computation ---
  const forecastData = useMemo(() => {
    if (!overlayDistribution || !overlaySelections) {
      return {
        withMetas: [] as ForecastClubData[],
        withoutMetas: [] as ForecastClubData[],
        totalForecast: 0,
        clubsWithMetas: 0,
        selectedTournamentsCount: 0,
      };
    }

    const selections = overlaySelections;
    const clubMap = new Map<string, ForecastClubData>();

    let selectedTournamentsCount = 0;

    for (const t of overlayDistribution.tournaments) {
      const sel = selections[t.gameId];
      if (!sel?.isSelected) continue;
      selectedTournamentsCount++;

      for (const club of t.clubDistribution) {
        const key = `${club.ligaId}-${club.clubId}`;
        if (!brClubKeys.has(key)) continue;

        const existing = clubMap.get(key);
        if (existing) {
          existing.forecastBuyin += club.metaTarget * club.referenceBuyin;
          existing.tournamentsWithMeta++;
          existing.totalMetaTarget += club.metaTarget;
        } else {
          clubMap.set(key, {
            clubeId: club.clubId,
            clubeNome: club.clubName,
            ligaId: club.ligaId,
            superUnionId: club.superUnionId,
            forecastBuyin: club.metaTarget * club.referenceBuyin,
            tournamentsWithMeta: 1,
            totalMetaTarget: club.metaTarget,
          });
        }
      }
    }

    // Add BR clubs that have no metas
    const withMetas: ForecastClubData[] = [];
    const withoutMetas: ForecastClubData[] = [];

    for (const c of availableClubs) {
      const key = `${c.ligaId}-${c.clubeId}`;
      if (!brClubKeys.has(key)) continue;

      const forecast = clubMap.get(key);
      if (forecast && forecast.forecastBuyin > 0) {
        withMetas.push(forecast);
      } else {
        withoutMetas.push({
          clubeId: c.clubeId,
          clubeNome: c.clubeNome,
          ligaId: c.ligaId,
          superUnionId: c.superUnionId,
          forecastBuyin: 0,
          tournamentsWithMeta: 0,
          totalMetaTarget: 0,
        });
      }
    }

    withMetas.sort((a, b) => b.forecastBuyin - a.forecastBuyin);
    withoutMetas.sort((a, b) => a.clubeNome.localeCompare(b.clubeNome));

    const totalForecast = withMetas.reduce(
      (s, c) => s + c.forecastBuyin,
      0,
    );

    return {
      withMetas,
      withoutMetas,
      totalForecast: Math.round(totalForecast * 100) / 100,
      clubsWithMetas: withMetas.length,
      selectedTournamentsCount,
    };
  }, [overlayDistribution, overlaySelections, brClubKeys, availableClubs]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Arrecadacao por Clube (Overlay)
        </span>
        {data && (
          <span className="text-xs text-muted-foreground">
            {data.period.start} a {data.period.end}
          </span>
        )}
      </div>

      {/* Empty state */}
      {brClubKeys.size === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground rounded-lg">
          Nenhum clube do grupo BR encontrado.
        </div>
      )}

      {/* 2-column layout */}
      {brClubKeys.size > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: Arrecadacao Real */}
          <Card className="p-4 space-y-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Arrecadacao Real
            </span>

            {/* Summary cards */}
            {summary && (
              <div className="grid grid-cols-2 gap-2">
                <Card className="border-0 bg-muted/10">
                  <CardContent className="p-2.5">
                    <p className="text-[10px] text-muted-foreground">
                      Torneios c/ Overlay
                    </p>
                    <p className="text-base font-bold">
                      {summary.totalOverlayGames}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-muted/10">
                  <CardContent className="p-2.5">
                    <p className="text-[10px] text-muted-foreground">
                      Total Overlay
                    </p>
                    <p className="text-base font-bold text-red-500">
                      {formatNumber(summary.totalOverlayAmount)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-muted/10">
                  <CardContent className="p-2.5">
                    <p className="text-[10px] text-muted-foreground">
                      Arrecadado Liquido
                    </p>
                    <p className="text-base font-bold">
                      {formatNumber(brSummary.totalLiquido)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-muted/10">
                  <CardContent className="p-2.5">
                    <p className="text-[10px] text-muted-foreground">
                      Clubes Participantes
                    </p>
                    <p className="text-base font-bold">
                      {brSummary.totalClubs}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Real table */}
            <div className="rounded-lg overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-2 py-2 font-medium">Clube</th>
                    <th className="px-2 py-2 font-medium hidden lg:table-cell">Liga</th>
                    <th className="px-2 py-2 font-medium text-right">Buyin</th>
                    <th className="px-2 py-2 font-medium text-right hidden lg:table-cell">Taxa</th>
                    <th className="px-2 py-2 font-medium text-right">
                      Liquido
                    </th>
                    <th className="px-2 py-2 font-medium text-right hidden lg:table-cell">
                      Entradas
                    </th>
                    <th className="px-2 py-2 font-medium text-right hidden lg:table-cell">
                      Torneios
                    </th>
                    <th className="px-2 py-2 font-medium text-right">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <GroupHeader
                    title="BR - Com entradas"
                    count={brClubData.withEntries.length}
                    isCollapsed={collapsedGroups.has("br-with")}
                    onToggle={() => toggleGroup("br-with")}
                    totalLiquido={brSummary.totalLiquido}
                    clubs={brClubData.withEntries}
                  />
                  {!collapsedGroups.has("br-with") &&
                    brClubData.withEntries.map((club) => (
                      <ClubRow
                        key={`br-with-${club.ligaId}-${club.clubeId}`}
                        club={club}
                        totalLiquido={brSummary.totalLiquido}
                        className="border-t border-white/[0.04]"
                        isExpanded={expandedClubs.has(
                          `${club.ligaId}-${club.clubeId}`,
                        )}
                        onToggle={() =>
                          toggleClub(`${club.ligaId}-${club.clubeId}`)
                        }
                        details={
                          clubDetails[`${club.ligaId}-${club.clubeId}`] ?? []
                        }
                      />
                    ))}
                  <GroupHeader
                    title="BR - Sem entradas"
                    count={brClubData.withoutEntries.length}
                    isCollapsed={collapsedGroups.has("br-without")}
                    onToggle={() => toggleGroup("br-without")}
                    totalLiquido={brSummary.totalLiquido}
                    clubs={brClubData.withoutEntries}
                  />
                  {!collapsedGroups.has("br-without") &&
                    brClubData.withoutEntries.map((club) => (
                      <ClubRow
                        key={`br-without-${club.ligaId}-${club.clubeId}`}
                        club={club}
                        totalLiquido={brSummary.totalLiquido}
                        className="border-t border-white/[0.04]"
                        isExpanded={expandedClubs.has(
                          `${club.ligaId}-${club.clubeId}`,
                        )}
                        onToggle={() =>
                          toggleClub(`${club.ligaId}-${club.clubeId}`)
                        }
                        details={
                          clubDetails[`${club.ligaId}-${club.clubeId}`] ?? []
                        }
                      />
                    ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-medium">
                    <td className="px-2 py-2">
                      Total ({brSummary.totalClubs})
                    </td>
                    <td className="px-2 py-2 hidden lg:table-cell" />
                    <td className="px-2 py-2 text-right font-mono">
                      {formatNumber(brSummary.totalBuyin)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono hidden lg:table-cell">
                      {formatNumber(brSummary.totalTaxa)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">
                      {formatNumber(brSummary.totalLiquido)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono hidden lg:table-cell">
                      {brClubData.withEntries.reduce(
                        (s, c) => s + c.totalEntries,
                        0,
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-mono hidden lg:table-cell">
                      {summary?.totalOverlayGames ?? 0}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* RIGHT: Previsao de Arrecadacao */}
          <Card className="p-4 space-y-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Previsao de Arrecadacao
            </span>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="border-0 bg-muted/10">
                <CardContent className="p-2.5">
                  <p className="text-[10px] text-muted-foreground">
                    Previsao Total
                  </p>
                  <p className="text-base font-bold text-blue-500">
                    {formatNumber(forecastData.totalForecast)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-muted/10">
                <CardContent className="p-2.5">
                  <p className="text-[10px] text-muted-foreground">
                    Clubes c/ Metas
                  </p>
                  <p className="text-base font-bold">
                    {forecastData.clubsWithMetas}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-muted/10">
                <CardContent className="p-2.5">
                  <p className="text-[10px] text-muted-foreground">
                    Torneios Selecionados
                  </p>
                  <p className="text-base font-bold">
                    {forecastData.selectedTournamentsCount}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Forecast table */}
            <div className="rounded-lg overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-2 py-2 font-medium">Clube</th>
                    <th className="px-2 py-2 font-medium hidden lg:table-cell">Liga</th>
                    <th className="px-2 py-2 font-medium text-right">
                      Previsao
                    </th>
                    <th className="px-2 py-2 font-medium text-right hidden lg:table-cell">
                      Meta
                    </th>
                    <th className="px-2 py-2 font-medium text-right hidden lg:table-cell">
                      Torneios
                    </th>
                    <th className="px-2 py-2 font-medium text-right">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <ForecastGroupHeader
                    title="BR - Com metas"
                    count={forecastData.withMetas.length}
                    isCollapsed={collapsedGroups.has("fc-with")}
                    onToggle={() => toggleGroup("fc-with")}
                    totalForecast={forecastData.totalForecast}
                    clubs={forecastData.withMetas}
                  />
                  {!collapsedGroups.has("fc-with") &&
                    forecastData.withMetas.map((club) => (
                      <ForecastClubRow
                        key={`fc-with-${club.ligaId}-${club.clubeId}`}
                        club={club}
                        totalForecast={forecastData.totalForecast}
                      />
                    ))}
                  <ForecastGroupHeader
                    title="BR - Sem metas"
                    count={forecastData.withoutMetas.length}
                    isCollapsed={collapsedGroups.has("fc-without")}
                    onToggle={() => toggleGroup("fc-without")}
                    totalForecast={forecastData.totalForecast}
                    clubs={forecastData.withoutMetas}
                  />
                  {!collapsedGroups.has("fc-without") &&
                    forecastData.withoutMetas.map((club) => (
                      <ForecastClubRow
                        key={`fc-without-${club.ligaId}-${club.clubeId}`}
                        club={club}
                        totalForecast={forecastData.totalForecast}
                      />
                    ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-medium">
                    <td className="px-2 py-2">
                      Total (
                      {forecastData.withMetas.length +
                        forecastData.withoutMetas.length}
                      )
                    </td>
                    <td className="px-2 py-2 hidden lg:table-cell" />
                    <td className="px-2 py-2 text-right font-mono">
                      {formatNumber(forecastData.totalForecast)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono hidden lg:table-cell">
                      {forecastData.withMetas.reduce(
                        (s, c) => s + c.totalMetaTarget,
                        0,
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-mono hidden lg:table-cell">
                      {forecastData.selectedTournamentsCount}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ClubRow({
  club,
  totalLiquido,
  className,
  isExpanded,
  onToggle,
  details,
}: {
  club: ClubData;
  totalLiquido: number;
  className?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  details?: ClubTournamentDetail[];
}) {
  const pct = totalLiquido > 0 ? (club.liquido / totalLiquido) * 100 : 0;
  return (
    <>
      <tr
        className={
          className ??
          "border-t border-white/[0.04] hover:bg-muted/30 transition-colors"
        }
      >
        <td className="px-2 py-1.5">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 hover:text-foreground group"
          >
            {onToggle &&
              (isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
              ))}
            <span className="font-semibold text-foreground truncate max-w-[120px] lg:max-w-none">
              {club.clubeNome}
            </span>
            <span className="text-muted-foreground text-[9px] hidden lg:inline">
              ({club.clubeId})
            </span>
          </button>
        </td>
        <td className="px-2 py-1.5 text-muted-foreground hidden lg:table-cell">{club.ligaId}</td>
        <td className="px-2 py-1.5 text-right font-mono">
          <span className="text-blue-500">{formatNumber(club.totalBuyin)}</span>
        </td>
        <td className="px-2 py-1.5 text-right font-mono hidden lg:table-cell">
          <span className="text-green-500">{formatNumber(club.totalTaxa)}</span>
        </td>
        <td className="px-2 py-1.5 text-right font-mono">
          {formatNumber(club.liquido)}
        </td>
        <td className="px-2 py-1.5 text-right font-mono hidden lg:table-cell">
          {club.totalEntries}
        </td>
        <td className="px-2 py-1.5 text-right font-mono hidden lg:table-cell">
          {club.overlayGameCount}
        </td>
        <td className="px-2 py-1.5 text-right font-mono">
          <span className="text-amber-500">{pct.toFixed(1)}%</span>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/20">
          <td className="px-3 py-2" colSpan={8}>
            {details && details.length > 0 ? (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="px-2 py-1 font-normal">Torneio</th>
                    <th className="px-2 py-1 font-normal">Data</th>
                    <th className="px-2 py-1 font-normal text-right">
                      Entradas
                    </th>
                    <th className="px-2 py-1 font-normal text-right">Buyin</th>
                    <th className="px-2 py-1 font-normal text-right">Taxa</th>
                    <th className="px-2 py-1 font-normal text-right">
                      Liquido
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d) => (
                    <tr key={`${club.ligaId}-${club.clubeId}-${d.gameId}`}>
                      <td className="px-2 py-1">{d.gameName}</td>
                      <td className="px-2 py-1 text-muted-foreground">
                        {d.startedAt ? new Date(d.startedAt).toLocaleString("pt-BR") : "-"}
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        {d.entries}
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        <span className="text-blue-500">
                          {formatNumber(d.totalBuyin)}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        <span className="text-green-500">
                          {formatNumber(d.totalTaxa)}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        {formatNumber(d.liquido)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-[11px] text-muted-foreground">
                Nenhuma entrada nos torneios selecionados.
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function GroupHeader({
  title,
  count,
  isCollapsed,
  onToggle,
  totalLiquido,
  clubs,
}: {
  title: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
  totalLiquido: number;
  clubs: ClubData[];
}) {
  const groupLiquido = clubs.reduce((s, c) => s + c.liquido, 0);
  const groupPct =
    totalLiquido > 0 ? (groupLiquido / totalLiquido) * 100 : 0;

  return (
    <>
      <tr
        className="bg-muted/60 cursor-pointer select-none hover:bg-muted/70 border-b border-border/10"
        onClick={onToggle}
      >
        <td className="px-2 py-2 font-medium" colSpan={3}>
          <span className="inline-flex items-center gap-1.5">
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-foreground">{title}</span>
            <span className="text-muted-foreground font-normal">
              ({count})
            </span>
          </span>
        </td>
        <td className="px-2 py-2 hidden lg:table-cell" />
        <td className="px-2 py-2 text-right font-mono font-medium">
          {formatNumber(groupLiquido)}
        </td>
        <td className="px-2 py-2 hidden lg:table-cell" />
        <td className="px-2 py-2 hidden lg:table-cell" />
        <td className="px-2 py-2 text-right font-mono font-medium">
          {groupPct.toFixed(1)}%
        </td>
      </tr>
      {!isCollapsed && (
        <tr>
          <td className="h-2" colSpan={8} />
        </tr>
      )}
    </>
  );
}

function ForecastClubRow({
  club,
  totalForecast,
}: {
  club: ForecastClubData;
  totalForecast: number;
}) {
  const pct =
    totalForecast > 0 ? (club.forecastBuyin / totalForecast) * 100 : 0;
  return (
    <tr className="border-t border-white/[0.04] hover:bg-muted/30 transition-colors">
      <td className="px-2 py-1.5">
        <span className="font-semibold text-foreground truncate max-w-[120px] lg:max-w-none inline-block">
          {club.clubeNome}
        </span>
        <span className="text-muted-foreground text-[9px] ml-1 hidden lg:inline">
          ({club.clubeId})
        </span>
      </td>
      <td className="px-2 py-1.5 text-muted-foreground hidden lg:table-cell">{club.ligaId}</td>
      <td className="px-2 py-1.5 text-right font-mono">
        <span className="text-blue-500">
          {formatNumber(club.forecastBuyin)}
        </span>
      </td>
      <td className="px-2 py-1.5 text-right font-mono hidden lg:table-cell">
        {club.totalMetaTarget}
      </td>
      <td className="px-2 py-1.5 text-right font-mono hidden lg:table-cell">
        {club.tournamentsWithMeta}
      </td>
      <td className="px-2 py-1.5 text-right font-mono">
        <span className="text-amber-500">{pct.toFixed(1)}%</span>
      </td>
    </tr>
  );
}

function ForecastGroupHeader({
  title,
  count,
  isCollapsed,
  onToggle,
  totalForecast,
  clubs,
}: {
  title: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
  totalForecast: number;
  clubs: ForecastClubData[];
}) {
  const groupForecast = clubs.reduce((s, c) => s + c.forecastBuyin, 0);
  const groupPct =
    totalForecast > 0 ? (groupForecast / totalForecast) * 100 : 0;

  return (
    <>
      <tr
        className="bg-muted/60 cursor-pointer select-none hover:bg-muted/70 border-b border-border/10"
        onClick={onToggle}
      >
        <td className="px-2 py-2 font-medium" colSpan={2}>
          <span className="inline-flex items-center gap-1.5">
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-foreground">{title}</span>
            <span className="text-muted-foreground font-normal">
              ({count})
            </span>
          </span>
        </td>
        <td className="px-2 py-2 text-right font-mono font-medium">
          {formatNumber(groupForecast)}
        </td>
        <td className="px-2 py-2 hidden lg:table-cell" />
        <td className="px-2 py-2 hidden lg:table-cell" />
        <td className="px-2 py-2 text-right font-mono font-medium">
          {groupPct.toFixed(1)}%
        </td>
      </tr>
      {!isCollapsed && (
        <tr>
          <td className="h-2" colSpan={6} />
        </tr>
      )}
    </>
  );
}
