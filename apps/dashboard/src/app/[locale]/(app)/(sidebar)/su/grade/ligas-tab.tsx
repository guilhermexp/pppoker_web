"use client";

import { ArrecadacaoSection } from "@/components/league/validation-tabs/rateio/arrecadacao-section";
import { ClubMetasSection } from "@/components/league/validation-tabs/rateio/club-metas-section";
import { MetaGroupsSection } from "@/components/league/validation-tabs/rateio/meta-groups-section";
import { OverlayDistributionSection } from "@/components/league/validation-tabs/rateio/overlay-distribution-section";
import {
  type MetaGroupData,
  FALLBACK_GROUPS,
} from "@/components/league/validation-tabs/rateio/rateio-utils";
import type { StoredRealizedData } from "@/lib/league/tournament-matching";
import { useTRPC } from "@/trpc/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

const SCHEDULE_STORAGE_KEY = "ppst-tournament-schedule";

export function LigasTab({
  realizedData,
}: {
  realizedData?: StoredRealizedData | null;
}) {
  const [activeSubTab, setActiveSubTab] = useState("meta-groups");
  const trpc = useTRPC();

  // ---------------------------------------------------------------------------
  // Fetch leagues & clubs from DB
  // ---------------------------------------------------------------------------

  const { data: availableLeagues = [] } = useQuery(
    trpc.su.metas["leagues.list"].queryOptions(),
  );

  const { data: availableClubs = [] } = useQuery(
    trpc.su.metas["clubs.list"].queryOptions(),
  );

  // ---------------------------------------------------------------------------
  // Fetch meta groups (same pattern as rateio-tab.tsx)
  // ---------------------------------------------------------------------------

  const { data: dbGroups } = useQuery(
    trpc.su.metas["metaGroups.list"].queryOptions({ activeOnly: true }),
  );

  const groupIds = useMemo(
    () => (dbGroups ?? []).map((g: any) => g.id as string),
    [dbGroups],
  );

  const groupDetailQueries = useQueries({
    queries: groupIds.map((id) =>
      trpc.su.metas["metaGroups.getById"].queryOptions({ id }),
    ),
  });

  // Fallback: BR fixo, SA = todas as ligas do banco que não estão no BR
  const fallbackGroups: MetaGroupData[] = useMemo(() => {
    const brMemberIds = new Set(
      FALLBACK_GROUPS[0].members.map((m) => m.superUnionId),
    );
    const saMembers = availableLeagues
      .filter((l) => !brMemberIds.has(l.ligaId))
      .map((l) => ({
        superUnionId: l.ligaId,
        displayName: l.ligaNome,
      }));

    return [
      { ...FALLBACK_GROUPS[0] },
      { ...FALLBACK_GROUPS[1], members: saMembers },
    ];
  }, [availableLeagues]);

  const metaGroups: MetaGroupData[] = useMemo(() => {
    if (!dbGroups || dbGroups.length === 0) {
      return fallbackGroups;
    }

    const enriched = groupDetailQueries
      .filter((q) => q.data)
      .map((q) => {
        const data = q.data!;
        return {
          id: data.id,
          name: data.name,
          metaPercent: Number(data.meta_percent),
          isActive: data.is_active,
          members: (data.members ?? []).map((m: any) => ({
            superUnionId: m.super_union_id,
            displayName: m.display_name,
          })),
          timeSlots: (data.timeSlots ?? []).map((ts: any) => ({
            id: ts.id,
            name: ts.name,
            hourStart: ts.hour_start,
            hourEnd: ts.hour_end,
            metaPercent: Number(ts.meta_percent ?? ts.metaPercent),
            isActive: ts.is_active,
          })),
        };
      });

    return enriched.length > 0 ? enriched : fallbackGroups;
  }, [dbGroups, groupDetailQueries, fallbackGroups]);

  const usingFallback = !dbGroups || dbGroups.length === 0;

  // ---------------------------------------------------------------------------
  // Week info from realized data (banco)
  // ---------------------------------------------------------------------------

  const dataWeekStart = realizedData?.period?.start ?? undefined;
  const dataWeekEnd = realizedData?.period?.end ?? undefined;

  const dataWeekYear = useMemo(() => {
    if (!dataWeekStart) return undefined;
    const d = new Date(dataWeekStart);
    return d.getFullYear();
  }, [dataWeekStart]);

  const dataWeekNumber = useMemo(() => {
    if (realizedData?.weekNumber) return realizedData.weekNumber;
    if (!dataWeekStart) return undefined;
    const d = new Date(dataWeekStart);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.floor(
      (d.getTime() - startOfYear.getTime()) / 86400000,
    );
    return Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
  }, [realizedData?.weekNumber, dataWeekStart]);

  // Compute overlay total from realized data
  const overlayTotal = useMemo(() => {
    if (!realizedData?.tournaments) return 0;
    let total = 0;
    for (const t of realizedData.tournaments) {
      if (t.overlay < 0) {
        total += Math.abs(t.overlay);
      }
    }
    return total;
  }, [realizedData]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Tabs
      value={activeSubTab}
      onValueChange={setActiveSubTab}
      className="flex flex-col"
    >
      <TabsList className="w-full justify-start border-b border-border bg-transparent h-auto px-0 py-0 gap-0">
        <TabsTrigger
          value="meta-groups"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-3 py-2 text-xs"
        >
          Grupos Meta
        </TabsTrigger>
        <TabsTrigger
          value="club-metas"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-3 py-2 text-xs"
        >
          Metas Clube
        </TabsTrigger>
        <TabsTrigger
          value="arrecadacao"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-3 py-2 text-xs"
        >
          Arrecadacao
        </TabsTrigger>
        <TabsTrigger
          value="overlay-clubes"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-3 py-2 text-xs"
        >
          Overlay Clubes
        </TabsTrigger>
      </TabsList>

      <div className="pt-4">
        <TabsContent value="meta-groups" className="mt-0">
          <MetaGroupsSection
            availableLeagues={availableLeagues}
            fallbackGroups={usingFallback ? metaGroups : undefined}
            overlayTotal={overlayTotal}
          />
        </TabsContent>

        <TabsContent value="club-metas" className="mt-0">
          <ClubMetasSection
            availableClubs={availableClubs}
            defaultWeekYear={dataWeekYear}
            defaultWeekNumber={dataWeekNumber}
            weekStart={dataWeekStart}
            weekEnd={dataWeekEnd}
            metaGroups={metaGroups}
            usingFallback={usingFallback}
            overlayTotal={overlayTotal}
          />
        </TabsContent>

        <TabsContent value="arrecadacao" className="mt-0">
          <ArrecadacaoSection metaGroups={metaGroups} />
        </TabsContent>

        <TabsContent value="overlay-clubes" className="mt-0">
          <OverlayDistributionSection
            weekYear={dataWeekYear}
            weekNumber={dataWeekNumber}
            weekStart={dataWeekStart}
            weekEnd={dataWeekEnd}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
