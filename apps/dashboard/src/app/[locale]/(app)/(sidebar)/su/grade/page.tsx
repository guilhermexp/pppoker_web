"use client";

import type { SAOverlayData } from "@/lib/league/overlay-spreadsheet-parser";
import type { StoredRealizedData } from "@/lib/league/tournament-matching";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@midpoker/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AnaliseTab } from "./analise-tab";
import { GradeTab } from "./grade-tab";
import { LigasTab } from "./ligas-tab";
import { OverlaysTab } from "./overlays-tab";

// Re-export types for backward compatibility
export type { StoredTournament, StoredScheduleData } from "./grade-tab";

// localStorage keys (schedule + SA overlay are still localStorage-based)
const SCHEDULE_STORAGE_KEY = "ppst-tournament-schedule";
const SA_OVERLAY_STORAGE_KEY = "sa-overlay-data";

// Special value for the "current (unsaved)" option
const CURRENT_WEEK_VALUE = "__current__";

export default function TournamentManagementPage() {
  const [activeTab, setActiveTab] = useState("grade");
  const [selectedWeek, setSelectedWeek] = useState(CURRENT_WEEK_VALUE);
  // Incrementing key forces tab re-renders when loading saved data
  const [tabsKey, setTabsKey] = useState(0);
  // Holds realized data from a saved week (loaded from tournament_analyses)
  const [savedWeekRealizedData, setSavedWeekRealizedData] =
    useState<StoredRealizedData | null>(null);

  // SA overlay data — lifted here so OverlaysTab and AnaliseTab share state
  const [saData, setSaData] = useState<SAOverlayData | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SA_OVERLAY_STORAGE_KEY);
      if (raw) setSaData(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const handleSaDataChange = useCallback((data: SAOverlayData | null) => {
    setSaData(data);
    if (data) {
      localStorage.setItem(SA_OVERLAY_STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(SA_OVERLAY_STORAGE_KEY);
    }
  }, []);

  const { toast } = useToast();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // =========================================================================
  // Queries
  // =========================================================================

  const { data: savedWeeks, isLoading: isLoadingWeeks } = useQuery(
    trpc.su.tournamentAnalyses.list.queryOptions(),
  );

  // Fetch realized tournaments from DB (current open week)
  const { data: dbRealizedData } = useQuery(
    trpc.su.analytics.getRealizedTournaments.queryOptions(undefined),
  );

  // Determine which realized data to use: saved week overrides DB data
  const isSavedWeek = selectedWeek !== CURRENT_WEEK_VALUE;
  const realizedData: StoredRealizedData | null = isSavedWeek
    ? savedWeekRealizedData
    : (dbRealizedData ?? null);

  // =========================================================================
  // Mutations
  // =========================================================================

  const saveMutation = useMutation(
    trpc.su.tournamentAnalyses.save.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.su.tournamentAnalyses.list.queryKey(),
        });
        toast({
          title: "Semana salva",
          description: "Os dados da análise foram salvos com sucesso.",
          variant: "success",
        });
      },
      onError: () => {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível salvar a análise. Tente novamente.",
          variant: "destructive",
        });
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.su.tournamentAnalyses.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.su.tournamentAnalyses.list.queryKey(),
        });
        setSelectedWeek(CURRENT_WEEK_VALUE);
        setSavedWeekRealizedData(null);
        toast({
          title: "Análise removida",
          description: "A análise da semana foi removida.",
        });
      },
    }),
  );

  // =========================================================================
  // Handlers
  // =========================================================================

  const handleSave = useCallback(() => {
    // Read schedule from localStorage (still localStorage-based)
    const scheduleRaw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    const scheduleData = scheduleRaw ? JSON.parse(scheduleRaw) : null;

    // SA overlay data comes from lifted state
    const saOverlayData = saData;

    if (!scheduleData && !realizedData && !saOverlayData) {
      toast({
        title: "Nenhum dado para salvar",
        description:
          "Importe dados na aba Grade ou Análise antes de salvar a semana.",
        variant: "destructive",
      });
      return;
    }

    // Extract week info from scheduleData (primary source)
    const weekNumber =
      scheduleData?.weekNumber ?? realizedData?.weekNumber ?? 0;
    const now = new Date();
    const weekYear = now.getFullYear();
    const weekStart =
      scheduleData?.weekInfo?.startDate ?? realizedData?.period?.start ?? "";
    const weekEnd =
      scheduleData?.weekInfo?.endDate ?? realizedData?.period?.end ?? "";

    if (weekNumber === 0) {
      toast({
        title: "Semana não identificada",
        description:
          "Importe a grade de torneios para identificar a semana antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    // Compute summary metrics
    const scheduleTournamentCount = scheduleData?.totalTournaments ?? 0;
    const scheduleTotalGtdUsd = scheduleData?.totalGTD ?? 0;

    // Count overlays from realized data
    let overlayCount = 0;
    let overlayTotalBrl = 0;
    if (realizedData?.tournaments) {
      for (const t of realizedData.tournaments) {
        if (t.overlay < 0) {
          overlayCount++;
          overlayTotalBrl += Math.abs(t.overlay);
        }
      }
    }

    // SA overlay metrics
    let saPpstUsd = 0;
    let saTotalUsd = 0;
    if (saOverlayData?.resumen) {
      for (const r of saOverlayData.resumen) {
        saPpstUsd += r.ppst ?? 0;
        saTotalUsd += r.total ?? 0;
      }
    }

    saveMutation.mutate({
      weekYear,
      weekNumber,
      weekStart,
      weekEnd,
      scheduleData,
      realizedData,
      saOverlayData,
      scheduleTournamentCount,
      scheduleTotalGtdUsd: scheduleTotalGtdUsd,
      overlayCount,
      overlayTotalBrl,
      saPpstUsd,
      saTotalUsd,
      crossMatchCount: 0,
    });
  }, [saveMutation, toast, realizedData, saData]);

  const handleWeekChange = useCallback(
    async (value: string) => {
      setSelectedWeek(value);

      if (value === CURRENT_WEEK_VALUE) {
        // Switch back to current week: clear saved week data
        setSavedWeekRealizedData(null);
        setTabsKey((k) => k + 1);
        return;
      }

      // Parse "YYYY-WW" format
      const [yearStr, weekStr] = value.split("-");
      const weekYear = Number(yearStr);
      const weekNumber = Number(weekStr);

      try {
        const data = await queryClient.fetchQuery(
          trpc.su.tournamentAnalyses.getByWeek.queryOptions({
            weekYear,
            weekNumber,
          }),
        );

        if (!data) {
          toast({
            title: "Dados não encontrados",
            description: "Nenhum dado encontrado para esta semana.",
            variant: "destructive",
          });
          return;
        }

        // Write schedule and SA data to localStorage (still localStorage-based)
        if (data.schedule_data) {
          localStorage.setItem(
            SCHEDULE_STORAGE_KEY,
            JSON.stringify(data.schedule_data),
          );
        } else {
          localStorage.removeItem(SCHEDULE_STORAGE_KEY);
        }

        // SA overlay data goes through lifted state (also persists to localStorage)
        handleSaDataChange(
          data.sa_overlay_data ? (data.sa_overlay_data as SAOverlayData) : null,
        );

        // Realized data from saved week goes through state (not localStorage)
        setSavedWeekRealizedData(
          (data.realized_data as StoredRealizedData) ?? null,
        );

        // Force tabs to re-render
        setTabsKey((k) => k + 1);

        toast({
          title: "Semana carregada",
          description: `Dados da semana ${weekNumber} carregados.`,
        });
      } catch {
        toast({
          title: "Erro ao carregar",
          description: "Não foi possível carregar os dados da semana.",
          variant: "destructive",
        });
      }
    },
    [queryClient, trpc, toast, handleSaDataChange],
  );

  const handleDelete = useCallback(() => {
    if (selectedWeek === CURRENT_WEEK_VALUE) return;

    const selected = savedWeeks?.find(
      (w) => `${w.week_year}-${w.week_number}` === selectedWeek,
    );
    if (selected) {
      deleteMutation.mutate({ id: selected.id });
    }
  }, [selectedWeek, savedWeeks, deleteMutation]);

  // =========================================================================
  // Derived state
  // =========================================================================

  const selectedSavedWeek = isSavedWeek
    ? savedWeeks?.find(
        (w) => `${w.week_year}-${w.week_number}` === selectedWeek,
      )
    : null;

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="flex flex-col gap-6 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 border">
            <Icons.GridView className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-medium">Gerenciamento de Torneios</h1>
            <p className="text-sm text-muted-foreground">
              Grade semanal, confrontação e análise de overlays
            </p>
          </div>
        </div>

        {/* Week selector + actions */}
        <div className="flex items-center gap-2">
          <Select value={selectedWeek} onValueChange={handleWeekChange}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Selecione a semana" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CURRENT_WEEK_VALUE}>
                Atual (não salva)
              </SelectItem>
              {isLoadingWeeks && (
                <SelectItem value="__loading__" disabled>
                  Carregando...
                </SelectItem>
              )}
              {savedWeeks?.map((w) => (
                <SelectItem
                  key={w.id}
                  value={`${w.week_year}-${w.week_number}`}
                >
                  Sem {w.week_number}
                  {w.week_start && w.week_end
                    ? ` (${w.week_start} - ${w.week_end})`
                    : ""}{" "}
                  - {w.week_year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Icons.Check className="w-4 h-4 mr-1.5" />
            )}
            Salvar Semana
          </Button>

          {isSavedWeek && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-destructive hover:text-destructive"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Icons.Delete className="w-4 h-4 mr-1.5" />
              )}
              Remover
            </Button>
          )}
        </div>
      </div>

      {/* Saved week info badge */}
      {selectedSavedWeek && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-normal">
            {selectedSavedWeek.schedule_tournament_count} torneios
          </Badge>
          {Number(selectedSavedWeek.overlay_count) > 0 && (
            <Badge
              variant="outline"
              className="font-normal text-red-500 border-red-500/30"
            >
              {selectedSavedWeek.overlay_count} overlays
            </Badge>
          )}
          {Number(selectedSavedWeek.schedule_total_gtd_usd) > 0 && (
            <Badge variant="outline" className="font-normal">
              GTD: $
              {Number(selectedSavedWeek.schedule_total_gtd_usd).toLocaleString(
                "en-US",
              )}
            </Badge>
          )}
          <span className="ml-auto">
            Salvo em{" "}
            {new Date(selectedSavedWeek.updated_at).toLocaleString("pt-BR")}
          </span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="grade">
            <Icons.CalendarMonth className="w-4 h-4 mr-1.5" />
            Grade
          </TabsTrigger>
          <TabsTrigger value="overlays">
            <Icons.TrendingDown className="w-4 h-4 mr-1.5" />
            Overlays
          </TabsTrigger>
          <TabsTrigger value="analise">
            <Icons.PieChart className="w-4 h-4 mr-1.5" />
            Análise
          </TabsTrigger>
          <TabsTrigger value="ligas">
            <Icons.Leaderboard className="w-4 h-4 mr-1.5" />
            Ligas
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="grade"
          forceMount
          className={cn("mt-4", activeTab !== "grade" && "hidden")}
        >
          <GradeTab key={`grade-${tabsKey}`} realizedData={realizedData} />
        </TabsContent>
        <TabsContent
          value="overlays"
          forceMount
          className={cn("mt-4", activeTab !== "overlays" && "hidden")}
        >
          <OverlaysTab
            key={`overlays-${tabsKey}`}
            realizedData={realizedData}
            saData={saData}
            onSaDataChange={handleSaDataChange}
          />
        </TabsContent>
        <TabsContent
          value="analise"
          forceMount
          className={cn("mt-4", activeTab !== "analise" && "hidden")}
        >
          <AnaliseTab
            key={`analise-${tabsKey}`}
            realizedData={realizedData}
            saData={saData}
          />
        </TabsContent>
        <TabsContent
          value="ligas"
          forceMount
          className={cn("mt-4", activeTab !== "ligas" && "hidden")}
        >
          <LigasTab key={`ligas-${tabsKey}`} realizedData={realizedData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
