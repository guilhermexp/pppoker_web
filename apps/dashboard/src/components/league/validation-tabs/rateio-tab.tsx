"use client";

import type {
  ParsedLeagueGeralPPSTBloco,
  ParsedLeagueJogoPPST,
} from "@/lib/league/types";
import { useTRPC } from "@/trpc/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ClubMetasSection } from "./rateio/club-metas-section";
import { MetaGroupsSection } from "./rateio/meta-groups-section";
import { RateioAnalysis } from "./rateio/rateio-analysis";
import {
  type AvailableClub,
  type AvailableLeague,
  type MetaGroupData,
  FALLBACK_GROUPS,
  formatNumber,
} from "./rateio/rateio-utils";

interface LeagueRateioTabProps {
  geralPPST: ParsedLeagueGeralPPSTBloco[];
  jogosPPST: ParsedLeagueJogoPPST[];
}

export function LeagueRateioTab({
  geralPPST,
  jogosPPST,
}: LeagueRateioTabProps) {
  const [activeSubTab, setActiveSubTab] = useState("analysis");
  const trpc = useTRPC();

  // Fetch meta groups list from backend
  const { data: dbGroups } = useQuery(
    trpc.su.metas["metaGroups.list"].queryOptions({ activeOnly: true }),
  );

  // Build stable list of group IDs for detail queries
  const groupIds = useMemo(
    () => (dbGroups ?? []).map((g: any) => g.id as string),
    [dbGroups],
  );

  // Fetch all group details in parallel using useQueries
  const groupDetailQueries = useQueries({
    queries: groupIds.map((id) =>
      trpc.su.metas["metaGroups.getById"].queryOptions({ id }),
    ),
  });

  // Build enriched meta groups with members + time slots for analysis
  const analysisGroups: MetaGroupData[] = useMemo(() => {
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

  // Compute overlay stats from jogosPPST
  const overlayStats = useMemo(() => {
    let overlayCount = 0;
    let overlayTotal = 0;
    let gtdCount = 0;

    for (const jogo of jogosPPST) {
      const gtd = jogo.metadata?.premiacaoGarantida ?? 0;
      const isPPST =
        jogo.metadata?.tipoJogo?.toUpperCase()?.startsWith("PPST") ?? false;

      if (isPPST && gtd > 0) {
        gtdCount++;
        const jogoBuyin =
          jogo.totalGeral?.buyinFichas ||
          jogo.jogadores?.reduce((s, j) => s + (j.buyinFichas ?? 0), 0) ||
          0;
        const jogoTaxa =
          jogo.totalGeral?.taxa ||
          jogo.jogadores?.reduce((s, j) => s + (j.taxa ?? 0), 0) ||
          0;
        const resultado = jogoBuyin - jogoTaxa - gtd;
        if (resultado < 0) {
          overlayCount++;
          overlayTotal += Math.abs(resultado);
        }
      }
    }

    return { overlayCount, overlayTotal, gtdCount };
  }, [jogosPPST]);

  // Extract available leagues from geralPPST import data
  const availableLeagues: AvailableLeague[] = useMemo(() => {
    const seen = new Map<number, AvailableLeague>();
    for (const bloco of geralPPST) {
      for (const liga of bloco.ligas) {
        if (!seen.has(liga.ligaId)) {
          seen.set(liga.ligaId, {
            ligaId: liga.ligaId,
            ligaNome: liga.ligaNome,
            superUnionId: liga.superUnionId ?? null,
          });
        }
      }
    }
    return Array.from(seen.values());
  }, [geralPPST]);

  // Extract available clubs from jogosPPST import data
  const availableClubs: AvailableClub[] = useMemo(() => {
    const seen = new Map<string, AvailableClub>();
    for (const jogo of jogosPPST) {
      for (const jogador of jogo.jogadores) {
        const key = `${jogador.ligaId}-${jogador.clubeId}`;
        if (!seen.has(key)) {
          // Find the liga name from available leagues
          const liga = availableLeagues.find(
            (l) => l.ligaId === jogador.ligaId,
          );
          seen.set(key, {
            clubeId: jogador.clubeId,
            clubeNome: jogador.clubeNome,
            ligaId: jogador.ligaId,
            ligaNome: liga?.ligaNome ?? `Liga ${jogador.ligaId}`,
            superUnionId: liga?.superUnionId ?? null,
          });
        }
      }
    }
    return Array.from(seen.values());
  }, [jogosPPST, availableLeagues]);

  return (
    <Tabs
      value={activeSubTab}
      onValueChange={setActiveSubTab}
      className="flex flex-col h-full"
    >
      <TabsList className="flex-shrink-0 w-full justify-start border-b border-border bg-transparent h-auto px-0 py-0 gap-0">
        <TabsTrigger
          value="analysis"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-3 py-2 text-xs"
        >
          Analise
        </TabsTrigger>
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
      </TabsList>

      {/* Overlay Stats - visible across all sub-tabs */}
      {overlayStats.gtdCount > 0 && (
        <div className="flex-shrink-0 flex items-center gap-3 px-3 py-2 mt-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Torneios c/ overlay:</span>
            <span className="font-mono font-medium text-red-500">
              {overlayStats.overlayCount}
            </span>
            <span className="text-muted-foreground">
              de {overlayStats.gtdCount} GTD
            </span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Overlay total:</span>
            <span className="font-mono font-medium text-red-500">
              {formatNumber(overlayStats.overlayTotal)}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pt-4">
        <TabsContent value="analysis" className="mt-0">
          <RateioAnalysis
            geralPPST={geralPPST}
            jogosPPST={jogosPPST}
            metaGroups={analysisGroups}
          />
        </TabsContent>

        <TabsContent value="meta-groups" className="mt-0">
          <MetaGroupsSection
            availableLeagues={availableLeagues}
            fallbackGroups={usingFallback ? analysisGroups : undefined}
          />
        </TabsContent>

        <TabsContent value="club-metas" className="mt-0">
          <ClubMetasSection
            availableClubs={availableClubs}
            metaGroups={analysisGroups}
            usingFallback={usingFallback}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
