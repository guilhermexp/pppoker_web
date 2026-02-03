"use client";

import {
  type SAOverlayData,
  parseSAOverlaySpreadsheet,
} from "@/lib/league/overlay-spreadsheet-parser";
import type { StoredRealizedData } from "@/lib/league/tournament-matching";
import { matchTournaments } from "@/lib/league/tournament-matching";
import type { TournamentScheduleData } from "@/lib/league/tournament-schedule";
import { Button } from "@midpoker/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@midpoker/ui/card";
import { Icons } from "@midpoker/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { useToast } from "@midpoker/ui/use-toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StoredTournament } from "./grade-tab";

const SCHEDULE_STORAGE_KEY = "ppst-tournament-schedule";
const REALIZED_TOURNAMENTS_KEY = "ppst-realized-tournaments";
export const SA_OVERLAY_STORAGE_KEY = "sa-overlay-data";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "danger" | "success" | "warning";
}) {
  const styles = {
    default: {
      bg: "dark:bg-[#0c0c0c] border dark:border-[#1d1d1d]",
      icon: "text-muted-foreground",
      value: "",
    },
    danger: {
      bg: "dark:bg-red-500/5 border border-red-500/20",
      icon: "text-red-500",
      value: "text-red-500",
    },
    success: {
      bg: "dark:bg-[#00C969]/5 border border-[#00C969]/20",
      icon: "text-[#00C969]",
      value: "text-[#00C969]",
    },
    warning: {
      bg: "dark:bg-amber-500/5 border border-amber-500/20",
      icon: "text-amber-500",
      value: "text-amber-500",
    },
  };
  const s = styles[variant];

  return (
    <div className={`p-4 rounded-lg ${s.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${s.icon}`} />
        <span className="text-xs text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p className={`text-xl font-mono font-bold ${s.value}`}>{value}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
          {subValue}
        </p>
      )}
    </div>
  );
}

export function AnaliseTab() {
  const [saData, setSaData] = useState<SAOverlayData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [scheduleData, setScheduleData] =
    useState<TournamentScheduleData | null>(null);
  const [realizedData, setRealizedData] = useState<StoredRealizedData | null>(
    null,
  );

  useEffect(() => {
    try {
      const storedRealized = localStorage.getItem(REALIZED_TOURNAMENTS_KEY);
      if (storedRealized) setRealizedData(JSON.parse(storedRealized));

      const storedScheduleRaw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (storedScheduleRaw) {
        const parsed = JSON.parse(storedScheduleRaw);
        if (parsed.tournaments) {
          setScheduleData({
            events: parsed.tournaments.map(
              (t: StoredTournament, i: number) => ({
                id: `stored-${i}`,
                day: t.day,
                name: t.name,
                game: t.game,
                gtd: String(t.gtd),
                buyIn: t.buyIn,
                rebuy: "",
                addOn: "",
                stack: "",
                players: "",
                lateReg: "",
                minutes: "",
                structure: "",
                times: { "-3": t.time },
              }),
            ),
            weekInfo: {
              startDate: parsed.weekInfo?.startDate || "",
              endDate: parsed.weekInfo?.endDate || "",
              filename: "",
            },
          });
        }
      }

      const storedSA = localStorage.getItem(SA_OVERLAY_STORAGE_KEY);
      if (storedSA) setSaData(JSON.parse(storedSA));
    } catch {
      /* ignore */
    }
  }, []);

  const totalOverlay = useMemo(() => {
    if (!scheduleData || !realizedData) return 0;
    const scheduleTournaments: StoredTournament[] = scheduleData.events
      .filter(
        (e) => (Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0) > 0,
      )
      .map((e) => ({
        name: e.name.trim().toUpperCase(),
        day: e.day,
        time: e.times["-3"] || "",
        gtd: Number.parseFloat(e.gtd.replace(/[^\d.]/g, "")) || 0,
        buyIn: e.buyIn,
        game: e.game,
      }));
    const result = matchTournaments(
      scheduleTournaments,
      realizedData.tournaments,
    );
    return result.matched
      .filter((p) => p.realized.overlay < 0)
      .reduce((sum, p) => sum + p.realized.overlay, 0);
  }, [scheduleData, realizedData]);

  const hasImportedData = scheduleData && realizedData;

  const handleSAFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      const { dismiss } = toast({
        variant: "spinner",
        title: "Processando planilha...",
        description: file.name,
        duration: Number.POSITIVE_INFINITY,
      });

      try {
        const result = await parseSAOverlaySpreadsheet(file);
        setSaData(result);
        localStorage.setItem(SA_OVERLAY_STORAGE_KEY, JSON.stringify(result));
        dismiss();
      } catch (err) {
        dismiss();
        toast({
          variant: "destructive",
          title: "Erro ao processar",
          description: "Verifique se é um XLSX válido com aba RESUMEN.",
        });
        console.error(err);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [toast],
  );

  const handleClear = useCallback(() => {
    setSaData(null);
    localStorage.removeItem(SA_OVERLAY_STORAGE_KEY);
  }, []);

  const saTotals = useMemo(() => {
    if (!saData?.resumen.length) return null;
    return {
      ppst: saData.resumen.reduce((s, r) => s + r.ppst, 0),
      satLocal: saData.resumen.reduce((s, r) => s + r.satLocal, 0),
      sat: saData.resumen.reduce((s, r) => s + r.sat, 0),
      total: saData.resumen.reduce((s, r) => s + r.total, 0),
      pct: saData.resumen.reduce((s, r) => s + r.percentage, 0),
    };
  }, [saData]);

  return (
    <div className="flex flex-col gap-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleSAFileSelect}
        className="hidden"
      />

      {/* Comparação: nosso overlay vs SA */}
      {hasImportedData && saTotals && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-500/10">
                <Icons.PieChart className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base">
                  Comparação de Overlays
                </CardTitle>
                <CardDescription>
                  Nosso cálculo interno vs planilha sul-americana
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg dark:bg-[#0c0c0c] border dark:border-[#1d1d1d]">
                  <div className="flex items-center gap-2 mb-2">
                    <Icons.PieChart className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Nosso cálculo (interno)
                    </span>
                  </div>
                  <p className="text-xl font-mono font-bold text-red-500">
                    R$ {formatNumber(totalOverlay)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    USD {formatNumber(totalOverlay / 5)}
                  </p>
                </div>
                <div className="p-4 rounded-lg dark:bg-[#0c0c0c] border dark:border-[#1d1d1d]">
                  <div className="flex items-center gap-2 mb-2">
                    <Icons.Import className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Planilha SA (PPST)
                    </span>
                  </div>
                  <p className="text-xl font-mono font-bold">
                    {formatNumber(Math.round(saTotals.ppst * 100) / 100)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    R${" "}
                    {formatNumber(Math.round(saTotals.ppst * 5 * 100) / 100)}
                  </p>
                </div>
              </div>
              {(() => {
                const diff = totalOverlay - saTotals.ppst * 5;
                if (Math.abs(diff) < 1) return null;
                return (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <Icons.AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm text-red-500">
                      Diferença de{" "}
                      <span className="font-mono font-bold">
                        R$ {formatNumber(Math.abs(diff))}
                      </span>{" "}
                      entre nosso cálculo e a planilha SA.
                    </span>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planilha Sul-Americana — resumo */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-500/10">
                <Icons.Import className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">
                  Planilha Sul-Americana
                </CardTitle>
                <CardDescription>
                  Comparação de overlays com o grupo sul-americano
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saData && (
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <Icons.Close className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Icons.Import className="w-4 h-4 mr-2" />
                {isLoading
                  ? "Processando..."
                  : saData
                    ? "Importar Outra"
                    : "Importar XLSX"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {saData ? (
            <div className="space-y-6">
              {/* RESUMEN table */}
              {saData.resumen.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Resumo por Union</h3>
                    <span className="text-xs text-muted-foreground">
                      {saData.filename}
                    </span>
                  </div>
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead>Union ID</TableHead>
                          <TableHead className="w-[60px] text-right">
                            %
                          </TableHead>
                          <TableHead className="w-[110px] text-right">
                            PPST
                          </TableHead>
                          <TableHead className="w-[110px] text-right">
                            SAT Local
                          </TableHead>
                          <TableHead className="w-[110px] text-right">
                            SAT
                          </TableHead>
                          <TableHead className="w-[110px] text-right">
                            TOTAL
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saData.resumen.map((row, i) => (
                          <TableRow key={`res-${i}-${row.unionId}`}>
                            <TableCell className="font-medium text-sm">
                              {row.unionId}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {row.percentage
                                ? `${(row.percentage * 100).toFixed(1)}%`
                                : "-"}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono text-sm ${row.ppst < 0 ? "text-red-500" : ""}`}
                            >
                              {row.ppst
                                ? formatNumber(
                                    Math.round(row.ppst * 100) / 100,
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono text-sm text-muted-foreground ${row.satLocal && row.satLocal < 0 ? "text-red-500" : ""}`}
                            >
                              {row.satLocal
                                ? formatNumber(
                                    Math.round(row.satLocal * 100) / 100,
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono text-sm text-muted-foreground ${row.sat && row.sat < 0 ? "text-red-500" : ""}`}
                            >
                              {row.sat
                                ? formatNumber(
                                    Math.round(row.sat * 100) / 100,
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono text-sm font-medium ${row.total < 0 ? "text-red-500" : ""}`}
                            >
                              {row.total
                                ? formatNumber(
                                    Math.round(row.total * 100) / 100,
                                  )
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                        {saTotals && (
                          <TableRow className="bg-muted/30 font-medium border-t">
                            <TableCell className="text-sm">
                              {saData.tournaments.length} torneios
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-bold">
                              {(saTotals.pct * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono ${saTotals.ppst < 0 ? "text-red-500" : ""}`}
                            >
                              <div className="text-sm font-bold">
                                {formatNumber(
                                  Math.round(saTotals.ppst * 100) / 100,
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                R${" "}
                                {formatNumber(
                                  Math.round(saTotals.ppst * 5 * 100) / 100,
                                )}
                              </div>
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono ${saTotals.satLocal < 0 ? "text-red-500" : ""}`}
                            >
                              {saTotals.satLocal ? (
                                <>
                                  <div className="text-sm font-bold">
                                    {formatNumber(
                                      Math.round(saTotals.satLocal * 100) / 100,
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    R${" "}
                                    {formatNumber(
                                      Math.round(
                                        saTotals.satLocal * 5 * 100,
                                      ) / 100,
                                    )}
                                  </div>
                                </>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono ${saTotals.sat < 0 ? "text-red-500" : ""}`}
                            >
                              {saTotals.sat ? (
                                <>
                                  <div className="text-sm font-bold">
                                    {formatNumber(
                                      Math.round(saTotals.sat * 100) / 100,
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">
                                    R${" "}
                                    {formatNumber(
                                      Math.round(saTotals.sat * 5 * 100) / 100,
                                    )}
                                  </div>
                                </>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono ${saTotals.total < 0 ? "text-red-500" : ""}`}
                            >
                              <div className="text-sm font-bold">
                                {formatNumber(
                                  Math.round(saTotals.total * 100) / 100,
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                R${" "}
                                {formatNumber(
                                  Math.round(saTotals.total * 5 * 100) / 100,
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mx-auto mb-4">
                <Icons.Import className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">Importar Planilha SA</p>
              <p className="text-xs text-muted-foreground mb-4">
                Faça upload do XLSX do grupo sul-americano para comparar
                overlays.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Icons.Import className="w-4 h-4 mr-2" />
                Upload XLSX
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
