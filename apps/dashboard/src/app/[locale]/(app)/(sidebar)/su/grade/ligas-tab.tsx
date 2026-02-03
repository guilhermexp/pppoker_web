"use client";

import { ArrecadacaoSection } from "@/components/league/validation-tabs/rateio/arrecadacao-section";
import { ClubMetasSection } from "@/components/league/validation-tabs/rateio/club-metas-section";
import { MetaGroupsSection } from "@/components/league/validation-tabs/rateio/meta-groups-section";
import { OverlayDistributionSection } from "@/components/league/validation-tabs/rateio/overlay-distribution-section";
import {
  type MetaGroupData,
  FALLBACK_GROUPS,
} from "@/components/league/validation-tabs/rateio/rateio-utils";
import { useTRPC } from "@/trpc/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

const SCHEDULE_STORAGE_KEY = "ppst-tournament-schedule";
const REALIZED_TOURNAMENTS_KEY = "ppst-realized-tournaments";

export function LigasTab() {
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

  const metaGroups: MetaGroupData[] = useMemo(() => {
    if (!dbGroups || dbGroups.length === 0) {
      return FALLBACK_GROUPS;
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

    return enriched.length > 0 ? enriched : FALLBACK_GROUPS;
  }, [dbGroups, groupDetailQueries]);

  const usingFallback = !dbGroups || dbGroups.length === 0;

  // ---------------------------------------------------------------------------
  // Read overlay total + week info from localStorage (read-only)
  // ---------------------------------------------------------------------------

  const [overlayTotal, setOverlayTotal] = useState(0);
  const [dataWeekNumber, setDataWeekNumber] = useState<number | undefined>();
  const [dataWeekYear, setDataWeekYear] = useState<number | undefined>();
  const [dataWeekStart, setDataWeekStart] = useState<string | undefined>();
  const [dataWeekEnd, setDataWeekEnd] = useState<string | undefined>();

  useEffect(() => {
    try {
      const scheduleRaw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      const realizedRaw = localStorage.getItem(REALIZED_TOURNAMENTS_KEY);

      const scheduleData = scheduleRaw ? JSON.parse(scheduleRaw) : null;
      const realizedData = realizedRaw ? JSON.parse(realizedRaw) : null;

      // Extract week number from loaded data
      const weekNum =
        scheduleData?.weekNumber ?? realizedData?.weekNumber ?? undefined;
      if (weekNum) {
        setDataWeekNumber(weekNum);
        setDataWeekYear(new Date().getFullYear());
      }

      // Extract period dates (DD/MM format) and convert to YYYY-MM-DD
      const periodStart =
        scheduleData?.weekInfo?.startDate ??
        realizedData?.period?.start ??
        null;
      const periodEnd =
        scheduleData?.weekInfo?.endDate ?? realizedData?.period?.end ?? null;

      if (periodStart && periodEnd) {
        const year = new Date().getFullYear();
        const toISO = (ddmm: string) => {
          const match = ddmm.match(/(\d{1,2})\/(\d{1,2})/);
          if (!match) return undefined;
          const [, d, m] = match;
          return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        };
        setDataWeekStart(toISO(periodStart));
        setDataWeekEnd(toISO(periodEnd));
      }

      // Compute overlay total
      if (realizedData?.tournaments) {
        let total = 0;
        for (const t of realizedData.tournaments) {
          if (t.overlay < 0) {
            total += Math.abs(t.overlay);
          }
        }
        setOverlayTotal(total);
      }
    } catch {
      /* ignore */
    }
  }, []);

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
