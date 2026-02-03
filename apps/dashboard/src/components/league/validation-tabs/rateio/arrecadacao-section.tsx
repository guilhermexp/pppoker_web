"use client";

import { Card, CardContent } from "@midpoker/ui/card";
import { useEffect, useMemo, useState } from "react";
import type { MetaGroupData } from "./rateio-utils";
import { formatNumber } from "./rateio-utils";

const OVERLAY_CLUBS_STORAGE_KEY = "ppst-overlay-clubs";

interface ClubData {
  clubeId: number;
  clubeNome: string;
  ligaId: number;
  superUnionId: number | null;
  totalBuyin: number;
  totalTaxa: number;
  liquido: number;
  overlayGameCount: number;
}

interface OverlayClubsData {
  clubs: ClubData[];
  summary: {
    totalOverlayGames: number;
    totalOverlayAmount: number;
    totalBuyin: number;
    totalTaxa: number;
    totalLiquido: number;
    totalClubs: number;
  };
  weekNumber: number;
  period: { start: string; end: string };
  savedAt: string;
}

interface ArrecadacaoSectionProps {
  metaGroups?: MetaGroupData[];
}

export function ArrecadacaoSection({ metaGroups }: ArrecadacaoSectionProps) {
  const [data, setData] = useState<OverlayClubsData | null>(null);

  // Read per-club overlay data from localStorage (same source as Overlays Internos)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(OVERLAY_CLUBS_STORAGE_KEY);
      if (stored) {
        setData(JSON.parse(stored));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const clubs = data?.clubs ?? [];
  const summary = data?.summary;

  // Group clubs by meta group for visual grouping
  const clubsByGroup = useMemo(() => {
    if (!metaGroups || metaGroups.length === 0 || clubs.length === 0) {
      return null;
    }

    const memberSuToGroup = new Map<number, MetaGroupData>();
    for (const group of metaGroups) {
      for (const m of group.members) {
        memberSuToGroup.set(m.superUnionId, group);
      }
    }

    const grouped = new Map<
      string,
      { group: MetaGroupData; clubs: ClubData[] }
    >();
    const unassigned: ClubData[] = [];

    for (const club of clubs) {
      const group = memberSuToGroup.get(club.ligaId);
      if (group) {
        const existing = grouped.get(group.id);
        if (existing) {
          existing.clubs.push(club);
        } else {
          grouped.set(group.id, { group, clubs: [club] });
        }
      } else {
        unassigned.push(club);
      }
    }

    return {
      groups: Array.from(grouped.values()),
      unassigned,
    };
  }, [metaGroups, clubs]);

  const totalLiquido = summary?.totalLiquido ?? 0;

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

      {/* Summary cards */}
      {summary && clubs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">
                Torneios c/ Overlay
              </p>
              <p className="text-lg font-bold">{summary.totalOverlayGames}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Total Overlay</p>
              <p className="text-lg font-bold text-red-500">
                {formatNumber(summary.totalOverlayAmount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">
                Arrecadado Liquido
              </p>
              <p className="text-lg font-bold">
                {formatNumber(summary.totalLiquido)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">
                Clubes Participantes
              </p>
              <p className="text-lg font-bold">{summary.totalClubs}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {clubs.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
          Nenhum dado de overlay disponivel. Importe e valide dados na aba de importacao.
        </div>
      )}

      {/* Table by club */}
      {clubs.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Clube</th>
                <th className="px-3 py-2 font-medium">Liga</th>
                <th className="px-3 py-2 font-medium text-right">Buyin</th>
                <th className="px-3 py-2 font-medium text-right">Taxa</th>
                <th className="px-3 py-2 font-medium text-right">Liquido</th>
                <th className="px-3 py-2 font-medium text-right">Torneios</th>
                <th className="px-3 py-2 font-medium text-right">% Total</th>
              </tr>
            </thead>
            <tbody>
              {clubsByGroup
                ? renderGroupedRows(clubsByGroup, totalLiquido)
                : clubs.map((club) => (
                    <ClubRow
                      key={`${club.ligaId}-${club.clubeId}`}
                      club={club}
                      totalLiquido={totalLiquido}
                    />
                  ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-medium">
                <td className="px-3 py-2" colSpan={2}>
                  Total ({summary?.totalClubs ?? 0} clubes)
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {formatNumber(summary?.totalBuyin ?? 0)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {formatNumber(summary?.totalTaxa ?? 0)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {formatNumber(summary?.totalLiquido ?? 0)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {summary?.totalOverlayGames ?? 0}
                </td>
                <td className="px-3 py-2 text-right font-mono">100%</td>
              </tr>
            </tfoot>
          </table>
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
}: {
  club: ClubData;
  totalLiquido: number;
  className?: string;
}) {
  const pct = totalLiquido > 0 ? (club.liquido / totalLiquido) * 100 : 0;
  return (
    <tr className={className ?? "border-t border-border/50"}>
      <td className="px-3 py-1.5">
        <span className="font-medium">{club.clubeNome}</span>
        <span className="text-muted-foreground ml-1 text-[9px]">
          ({club.clubeId})
        </span>
      </td>
      <td className="px-3 py-1.5 text-muted-foreground">{club.ligaId}</td>
      <td className="px-3 py-1.5 text-right font-mono">
        {formatNumber(club.totalBuyin)}
      </td>
      <td className="px-3 py-1.5 text-right font-mono">
        {formatNumber(club.totalTaxa)}
      </td>
      <td className="px-3 py-1.5 text-right font-mono">
        {formatNumber(club.liquido)}
      </td>
      <td className="px-3 py-1.5 text-right font-mono">
        {club.overlayGameCount}
      </td>
      <td className="px-3 py-1.5 text-right font-mono">{pct.toFixed(1)}%</td>
    </tr>
  );
}

function renderGroupedRows(
  groupedData: {
    groups: { group: MetaGroupData; clubs: ClubData[] }[];
    unassigned: ClubData[];
  },
  totalLiquido: number,
) {
  const rows: React.ReactNode[] = [];

  for (const { group, clubs: groupClubs } of groupedData.groups) {
    const groupLiquido = groupClubs.reduce((s, c) => s + c.liquido, 0);
    const groupPct =
      totalLiquido > 0 ? (groupLiquido / totalLiquido) * 100 : 0;

    rows.push(
      <tr
        key={`group-${group.id}`}
        className="bg-muted/40 border-t border-border"
      >
        <td className="px-3 py-1.5 font-medium" colSpan={4}>
          {group.name}
          <span className="text-muted-foreground ml-2 font-normal">
            ({groupClubs.length} clubes)
          </span>
        </td>
        <td className="px-3 py-1.5 text-right font-mono font-medium">
          {formatNumber(groupLiquido)}
        </td>
        <td className="px-3 py-1.5" />
        <td className="px-3 py-1.5 text-right font-mono font-medium">
          {groupPct.toFixed(1)}%
        </td>
      </tr>,
    );

    for (const club of groupClubs) {
      rows.push(
        <ClubRow
          key={`${club.ligaId}-${club.clubeId}`}
          club={club}
          totalLiquido={totalLiquido}
          className="border-t border-border/30"
        />,
      );
    }
  }

  if (groupedData.unassigned.length > 0) {
    rows.push(
      <tr
        key="group-unassigned"
        className="bg-muted/40 border-t border-border"
      >
        <td className="px-3 py-1.5 font-medium" colSpan={7}>
          Sem Grupo
          <span className="text-muted-foreground ml-2 font-normal">
            ({groupedData.unassigned.length} clubes)
          </span>
        </td>
      </tr>,
    );

    for (const club of groupedData.unassigned) {
      rows.push(
        <ClubRow
          key={`unassigned-${club.ligaId}-${club.clubeId}`}
          club={club}
          totalLiquido={totalLiquido}
          className="border-t border-border/30"
        />,
      );
    }
  }

  return rows;
}
