"use client";

import type {
  ParsedLeagueGeralPPSTBloco,
  ParsedLeagueJogoPPST,
} from "@/lib/league/types";
import { useTRPC } from "@/trpc/client";
import { Button } from "@midpoker/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@midpoker/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getWeek, getYear } from "date-fns";
import { Code, Download, FileText, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useRef, useState } from "react";
import { ClubMetasSection } from "./rateio/club-metas-section";
import { InteractiveMetasTable } from "./rateio/interactive-metas-table";
import { MetaGroupsSection } from "./rateio/meta-groups-section";
import { RateioAnalysis } from "./rateio/rateio-analysis";
import {
  type AvailableClub,
  type AvailableLeague,
  FALLBACK_GROUPS,
  type MetaGroupData,
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
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const trpc = useTRPC();

  const loadPdfModules = useCallback(async () => {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    return { html2canvas, jsPDF };
  }, []);

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

  // Extract available leagues from geralPPST import data (moved up for fallback)
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

  // Build dynamic fallback groups: BR has fixed members, SA gets all remaining leagues
  const dynamicFallbackGroups: MetaGroupData[] = useMemo(() => {
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

  // Build enriched meta groups with members + time slots for analysis
  const analysisGroups: MetaGroupData[] = useMemo(() => {
    if (!dbGroups || dbGroups.length === 0) {
      return dynamicFallbackGroups;
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

    return enriched.length > 0 ? enriched : dynamicFallbackGroups;
  }, [dbGroups, groupDetailQueries, dynamicFallbackGroups]);

  const usingFallback = !dbGroups || dbGroups.length === 0;

  // Compute overlay stats from jogosPPST (same formula as jogos-ppst-tab)
  const overlayStats = useMemo(() => {
    let overlayCount = 0;
    let overlayTotal = 0;
    let gtdCount = 0;

    for (const jogo of jogosPPST) {
      const gtd = jogo.metadata?.premiacaoGarantida ?? 0;

      if (gtd > 0) {
        gtdCount++;
        const jogoBuyinFichas =
          jogo.jogadores?.reduce((s, j) => s + (j.buyinFichas ?? 0), 0) ?? 0;
        const jogoBuyinTicket =
          jogo.jogadores?.reduce((s, j) => s + (j.buyinTicket ?? 0), 0) ?? 0;
        const jogoTaxa =
          jogo.jogadores?.reduce((s, j) => s + (j.taxa ?? 0), 0) ?? 0;
        const buyinLiquido = jogoBuyinFichas + jogoBuyinTicket - jogoTaxa;
        const resultado = buyinLiquido - gtd;
        if (resultado < 0) {
          overlayCount++;
          overlayTotal += Math.abs(resultado);
        }
      }
    }

    return { overlayCount, overlayTotal, gtdCount };
  }, [jogosPPST]);

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

  // Extract week number from spreadsheet data (first game date)
  // dataInicio is in YYYY/MM/DD format
  const spreadsheetWeek = useMemo(() => {
    for (const jogo of jogosPPST) {
      const dateStr = jogo.metadata?.dataInicio;
      if (dateStr) {
        const date = new Date(dateStr.replace(/\//g, "-"));
        if (!Number.isNaN(date.getTime())) {
          return {
            weekYear: getYear(date),
            weekNumber: getWeek(date, {
              weekStartsOn: 0,
              firstWeekContainsDate: 1,
            }),
          };
        }
      }
    }
    return null;
  }, [jogosPPST]);

  const todayStr = new Date().toISOString().slice(0, 10);

  /** Prepare cloned document for export (hide buttons, disable animations) */
  const prepareCloneForExport = (doc: Document) => {
    // Hide export button
    const hideEls = doc.querySelectorAll('[data-hide-in-pdf="true"]');
    for (const el of hideEls) {
      (el as HTMLElement).style.display = "none";
    }
    // Disable animations
    const allEls = doc.querySelectorAll("*");
    for (const el of allEls) {
      const htmlEl = el as HTMLElement;
      htmlEl.style.animation = "none";
      htmlEl.style.transition = "none";
    }
  };

  const handleExportPdf = useCallback(async () => {
    const container = contentRef.current;
    if (!container || isExporting) return;
    setIsExporting(true);

    try {
      const { html2canvas, jsPDF } = await loadPdfModules();
      const backgroundColor = theme === "dark" ? "#0c0c0c" : "#ffffff";
      const backgroundRgb =
        theme === "dark" ? { r: 12, g: 12, b: 12 } : { r: 255, g: 255, b: 255 };

      const canvas = await html2canvas(container, {
        scale: 4,
        backgroundColor,
        useCORS: true,
        allowTaint: true,
        logging: false,
        removeContainer: true,
        imageTimeout: 0,
        height: container.scrollHeight + 100,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: false,
        onclone: (clonedDoc) => {
          const clonedContainer = clonedDoc.querySelector(
            "[data-canvas-content]",
          ) as HTMLElement | null;
          if (clonedContainer) {
            clonedContainer.style.backgroundColor = backgroundColor;
            clonedContainer.style.overflow = "visible";
            clonedContainer.style.height = "auto";
            clonedContainer.style.maxHeight = "none";
          }
          prepareCloneForExport(clonedDoc);
        },
      });

      // Build PDF
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const a4Width = 210;
      const padding = 10;
      const scale = (a4Width - padding * 2) / canvas.width;
      const scaledWidth = canvas.width * scale;
      const scaledHeight = canvas.height * scale;
      const pdfHeight = Math.max(scaledHeight + padding * 2, 297);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [a4Width, pdfHeight],
      });
      pdf.setFillColor(backgroundRgb.r, backgroundRgb.g, backgroundRgb.b);
      pdf.rect(0, 0, a4Width, pdfHeight, "F");
      pdf.addImage(
        imgData,
        "JPEG",
        padding,
        padding,
        scaledWidth,
        scaledHeight,
      );
      pdf.setProperties({
        title: "Rateio Report",
        subject: "Generated from Mid Dashboard",
        creator: "Mid Dashboard",
      });
      pdf.save(`rateio-${todayStr}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setIsExporting(false);
    }
  }, [theme, isExporting, todayStr, loadPdfModules]);

  const handleExportHtml = useCallback(async () => {
    const container = contentRef.current;
    if (!container || isExporting) return;
    setIsExporting(true);

    try {
      // Collect all stylesheets
      const styles: string[] = [];
      for (const sheet of document.querySelectorAll(
        'style, link[rel="stylesheet"]',
      )) {
        if (sheet.tagName === "STYLE") {
          styles.push(sheet.outerHTML);
        } else {
          // Inline link stylesheets as <style> for standalone HTML
          try {
            const link = sheet as HTMLLinkElement;
            const resp = await fetch(link.href);
            if (resp.ok) {
              const css = await resp.text();
              styles.push(`<style>${css}</style>`);
            }
          } catch {
            // Skip inaccessible stylesheets
            styles.push(sheet.outerHTML);
          }
        }
      }

      // Clone content
      const clone = container.cloneNode(true) as HTMLElement;

      // Remove export button from clone
      const hideEls = clone.querySelectorAll('[data-hide-in-pdf="true"]');
      for (const el of hideEls) {
        el.remove();
      }

      const isDark = theme === "dark";
      const bgColor = isDark ? "#0c0c0c" : "#ffffff";
      const textColor = isDark ? "#fafafa" : "#0c0c0c";

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rateio - ${todayStr}</title>
  ${styles.join("\n")}
  <style>
    body { background: ${bgColor}; color: ${textColor}; padding: 24px; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rateio-${todayStr}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating HTML:", err);
    } finally {
      setIsExporting(false);
    }
  }, [theme, isExporting, todayStr]);

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

        <div className="ml-auto flex items-center" data-hide-in-pdf="true">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs px-2"
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleExportPdf}
                className="text-xs"
                disabled={isExporting}
              >
                <FileText className="h-3.5 w-3.5 mr-2" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportHtml}
                className="text-xs"
                disabled={isExporting}
              >
                <Code className="h-3.5 w-3.5 mr-2" />
                HTML
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TabsList>

      <div ref={contentRef} data-canvas-content>
        {/* Overlay Stats - visible across all sub-tabs */}
        {overlayStats.gtdCount > 0 && (
          <div className="flex-shrink-0 flex items-center gap-3 px-3 py-2 mt-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">
                Torneios c/ overlay:
              </span>
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
            <InteractiveMetasTable
              metaGroups={analysisGroups}
              jogosPPST={jogosPPST}
              overlayTotal={overlayStats.overlayTotal}
            />
            <div className="mt-6 pt-6 border-t border-border">
              <MetaGroupsSection
                availableLeagues={availableLeagues}
                fallbackGroups={usingFallback ? analysisGroups : undefined}
                overlayTotal={overlayStats.overlayTotal}
              />
            </div>
          </TabsContent>

          <TabsContent value="club-metas" className="mt-0">
            <ClubMetasSection
              availableClubs={availableClubs}
              defaultWeekYear={spreadsheetWeek?.weekYear}
              defaultWeekNumber={spreadsheetWeek?.weekNumber}
            />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
