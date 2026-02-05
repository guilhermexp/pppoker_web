"use client";

import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@midpoker/ui/card";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { AvailableClub, MetaGroupData, OverlaySelectionMap } from "./rateio-utils";
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

  const clubs = data?.clubs ?? [];
  const summary = data?.summary;
  const clubDetails = data?.clubDetails ?? {};

  // Fetch overlay distribution to compute multa per club
  const overlayEnabled = !!(weekYear && weekNumber && weekStart && weekEnd);

  const { data: overlayData } = useQuery(
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

  const { data: savedSelections } = useQuery(
    trpc.su.metas["overlaySelections.get"].queryOptions(
      {
        weekYear: weekYear ?? 0,
        weekNumber: weekNumber ?? 0,
      },
      { enabled: overlayEnabled },
    ),
  );

  // Build multa (charge) per club from overlay distribution
  const multaByClub = useMemo(() => {
    const map = new Map<string, number>();
    if (!overlayData?.tournaments) return map;

    const selections: OverlaySelectionMap = savedSelections ?? {};

    for (const t of overlayData.tournaments) {
      const sel = selections[t.gameId];
      if (sel && !sel.isSelected) continue;

      for (const cd of t.clubDistribution) {
        const key = `${cd.ligaId}-${cd.clubId}`;
        map.set(key, (map.get(key) ?? 0) + cd.charge);
      }
    }

    return map;
  }, [overlayData, savedSelections]);

  const totalMulta = useMemo(() => {
    let sum = 0;
    for (const v of multaByClub.values()) sum += v;
    return Math.round(sum * 100) / 100;
  }, [multaByClub]);

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

      {brClubKeys.size > 0 && (
        <Card className="p-4 space-y-3">
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Arrecadacao Real
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Baseado nos torneios selecionados e metas definidas na aba Overlay Clubes.
            </p>
          </div>

          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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
              {totalMulta > 0 && (
                <Card className="border-0 bg-red-500/5">
                  <CardContent className="p-2.5">
                    <p className="text-[10px] text-muted-foreground">
                      Total Multa
                    </p>
                    <p className="text-base font-bold text-red-500">
                      {formatNumber(totalMulta)}
                    </p>
                  </CardContent>
                </Card>
              )}
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
                  <th className="px-2 py-2 font-medium text-right">
                    Multa
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
                  multaByClub={multaByClub}
                />
                {!collapsedGroups.has("br-with") &&
                  brClubData.withEntries.map((club) => (
                    <ClubRow
                      key={`br-with-${club.ligaId}-${club.clubeId}`}
                      club={club}
                      totalLiquido={brSummary.totalLiquido}
                      multa={multaByClub.get(`${club.ligaId}-${club.clubeId}`) ?? 0}
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
                  multaByClub={multaByClub}
                />
                {!collapsedGroups.has("br-without") &&
                  brClubData.withoutEntries.map((club) => (
                    <ClubRow
                      key={`br-without-${club.ligaId}-${club.clubeId}`}
                      club={club}
                      totalLiquido={brSummary.totalLiquido}
                      multa={multaByClub.get(`${club.ligaId}-${club.clubeId}`) ?? 0}
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
                  <td className="px-2 py-2 text-right font-mono font-bold text-red-500">
                    {totalMulta > 0 ? formatNumber(totalMulta) : "-"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
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
  multa,
  className,
  isExpanded,
  onToggle,
  details,
}: {
  club: ClubData;
  totalLiquido: number;
  multa: number;
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
        <td className="px-2 py-1.5 text-right font-mono">
          {multa > 0 ? (
            <span className="text-red-500">{formatNumber(Math.round(multa * 100) / 100)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/20">
          <td className="px-3 py-2" colSpan={9}>
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
  multaByClub,
}: {
  title: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
  totalLiquido: number;
  clubs: ClubData[];
  multaByClub: Map<string, number>;
}) {
  const groupLiquido = clubs.reduce((s, c) => s + c.liquido, 0);
  const groupPct =
    totalLiquido > 0 ? (groupLiquido / totalLiquido) * 100 : 0;
  const groupMulta = clubs.reduce(
    (s, c) => s + (multaByClub.get(`${c.ligaId}-${c.clubeId}`) ?? 0),
    0,
  );

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
        <td className="px-2 py-2 text-right font-mono font-medium">
          {groupMulta > 0 ? (
            <span className="text-red-500">{formatNumber(Math.round(groupMulta * 100) / 100)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </td>
      </tr>
      {!isCollapsed && (
        <tr>
          <td className="h-2" colSpan={9} />
        </tr>
      )}
    </>
  );
}
