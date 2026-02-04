"use client";

import type { LeagueImportValidationModalProps } from "@/lib/league/types";
import {
  isBrazilianLeague,
  parseSpreadsheetFileName,
} from "@/lib/poker/spreadsheet-types";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@midpoker/ui/dialog";
import { Icons } from "@midpoker/ui/icons";
import { Spinner } from "@midpoker/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useCallback, useMemo, useState } from "react";

import {
  LeagueGeralPPSRTab,
  LeagueGeralPPSTTab,
  LeagueJogosPPSRTab,
  LeagueJogosPPSTTab,
  LeagueOverviewTab,
  LeagueRateioTab,
  LeagueValidationTab,
} from "./validation-tabs";

// Storage key for SU validation data (used by Painel SU)
const SU_VALIDATION_STORAGE_KEY = "su-validation-data";

// Helper to check if a liga is Brazilian (uses centralized KNOWN_LEAGUE_IDS)
function isBrasileiraLiga(tipo: string, id: string): boolean {
  return tipo === "Liga" && isBrazilianLeague(id);
}

// Column counts per tab (from spreadsheet mapping)
const TAB_COLUMNS: Record<string, { name: string; cols: number }> = {
  overview: { name: "Resumo", cols: 0 },
  "geral-ppst": { name: "Geral PPST", cols: 15 },
  "jogos-ppst": { name: "Jogos PPST", cols: 14 },
  "geral-ppsr": { name: "Geral PPSR", cols: 13 },
  "jogos-ppsr": { name: "Jogos PPSR", cols: 18 },
  rateio: { name: "Rateio", cols: 0 },
  validation: { name: "Validação", cols: 0 },
};

export function LeagueImportValidationModal({
  open,
  onOpenChange,
  parsedData,
  validationResult,
  onApprove,
  onReject,
  isProcessing = false,
}: LeagueImportValidationModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isExpanded, setIsExpanded] = useState(false);
  const { qualityScore, passedChecks, totalChecks, hasBlockingErrors, checks } =
    validationResult;
  const criticalFailed = checks.filter(
    (c) => c.status === "failed" && c.severity === "critical",
  ).length;
  const currentTabInfo = TAB_COLUMNS[activeTab];

  // Get counts for tabs
  const geralPPSTCount = validationResult.stats.totalLigasPPST;
  const jogosPPSTCount = validationResult.stats.totalJogosPPST;
  const jogadoresPPSTCount = validationResult.stats.totalJogadoresPPST;
  // Use actual parsed data count for Geral PPSR (not jogos-derived stats)
  const geralPPSRCount =
    parsedData.geralPPSR?.reduce((s, b) => s + b.ligas.length, 0) ?? 0;
  const jogosPPSRCount = validationResult.stats.totalJogosPPSR ?? 0;

  // Calculate stats for Painel SU
  const suStats = useMemo(() => {
    // Taxa PPST from Geral PPST
    let totalTaxaPPST = 0;
    let totalGanhosJogador = 0;
    let gapBrasileiro = 0;
    let gapEstrangeiro = 0;

    for (const bloco of parsedData.geralPPST) {
      totalTaxaPPST += bloco.total.ganhosLigaTaxa;
      totalGanhosJogador += bloco.total.ganhosJogador;

      // Separar gap por origem (BR = Ligas 1765, 1675, 2448, 2101)
      const isBrasileiro = isBrasileiraLiga(
        bloco.contexto.entidadeTipo,
        bloco.contexto.entidadeId,
      );
      if (isBrasileiro) {
        gapBrasileiro += bloco.total.gapGarantido;
      } else {
        gapEstrangeiro += bloco.total.gapGarantido;
      }
    }

    // Taxa PPSR from Geral PPSR
    let totalTaxaPPSR = 0;
    for (const bloco of parsedData.geralPPSR ?? []) {
      totalTaxaPPSR += bloco.total.taxaLigaTotal;
    }

    // GTD stats from Jogos PPST
    let totalGTD = 0;
    let totalArrecadacao = 0;
    const gameTypes = { mtt: 0, spin: 0, pko: 0, mko: 0, sat: 0 };

    for (const jogo of parsedData.jogosPPST) {
      // GTD
      if (jogo.metadata?.premiacaoGarantida) {
        totalGTD += jogo.metadata.premiacaoGarantida;
        // Arrecadação = soma dos buy-ins
        totalArrecadacao += jogo.jogadores.reduce(
          (sum, j) => sum + j.buyinFichas,
          0,
        );
      }

      // Game types
      const formato = jogo.metadata?.formatoJogo?.toLowerCase() || "";
      if (formato.includes("spin")) {
        gameTypes.spin++;
      } else if (formato.includes("pko") || formato.includes("progressive")) {
        gameTypes.pko++;
      } else if (formato.includes("mko") || formato.includes("mystery")) {
        gameTypes.mko++;
      } else if (formato.includes("sat") || formato.includes("satellite")) {
        gameTypes.sat++;
      } else {
        gameTypes.mtt++;
      }
    }

    const totalGap = totalGTD - totalArrecadacao;
    const totalGapAbs = Math.abs(gapBrasileiro) + Math.abs(gapEstrangeiro);
    const percBrasileiro =
      totalGapAbs > 0 ? (Math.abs(gapBrasileiro) / totalGapAbs) * 100 : 0;
    const percEstrangeiro =
      totalGapAbs > 0 ? (Math.abs(gapEstrangeiro) / totalGapAbs) * 100 : 0;

    return {
      totalLigas: parsedData.geralPPST.length, // Número de blocos/entidades, não linhas
      totalTorneios: jogosPPSTCount,
      totalJogadores: jogadoresPPSTCount,
      totalTaxaPPST,
      totalTaxaPPSR,
      totalTaxa: totalTaxaPPST + totalTaxaPPSR,
      totalGanhosJogador,
      totalGTD,
      totalArrecadacao,
      totalGap,
      gapBrasileiro,
      gapEstrangeiro,
      percBrasileiro,
      percEstrangeiro,
      gameTypes,
    };
  }, [parsedData, jogosPPSTCount, jogadoresPPSTCount]);

  // Save data to localStorage for Painel SU
  const saveToLocalStorage = useCallback(() => {
    try {
      const data = {
        ...suStats,
        period: {
          start: validationResult.period.start || "",
          end: validationResult.period.end || "",
        },
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(SU_VALIDATION_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save SU data to localStorage:", error);
    }
  }, [suStats, validationResult.period]);

  // Handle approve with save
  const handleApprove = useCallback(() => {
    saveToLocalStorage();
    onApprove();
  }, [saveToLocalStorage, onApprove]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`overflow-hidden flex flex-col p-0 bg-background shadow-2xl ${isExpanded ? "inset-0 translate-x-0 translate-y-0 w-screen max-w-[100vw] h-screen max-h-[100vh] rounded-none border-0" : "max-w-[95vw] w-[1600px] max-h-[92vh] rounded-xl border border-border"}`}
      >
        <DialogHeader className="flex-shrink-0 px-6 py-5 border-b border-border">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-lg font-medium">
                  Validação de Liga
                </DialogTitle>
                {validationResult.period.start &&
                  validationResult.period.end && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-mono">
                      {validationResult.period.start} -{" "}
                      {validationResult.period.end}
                    </span>
                  )}
                {currentTabInfo && currentTabInfo.cols > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    {currentTabInfo.cols} colunas
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setIsExpanded((v) => !v)}
                >
                  {isExpanded ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={14}
                      height={14}
                      fill="currentColor"
                      viewBox="0 -960 960 960"
                    >
                      <path d="M440-200v-160H200v-80h320v240h-80Zm160-320v-240H280v-80h320v240h-80Z" />
                    </svg>
                  ) : (
                    <Icons.ExpandContent className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <DialogDescription className="text-muted-foreground text-sm mt-1">
                {hasBlockingErrors
                  ? "Corrija os erros antes de prosseguir"
                  : "Revise os dados extraídos antes de processar"}
              </DialogDescription>
            </div>
            <div className="text-right mr-6">
              {hasBlockingErrors ? (
                <Badge
                  variant="outline"
                  className="text-xs px-2 py-0.5 gap-1 border-[#FF3638]/30 text-[#FF3638]"
                >
                  <Icons.AlertCircle className="w-3 h-3" />
                  Bloqueado
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs px-2 py-0.5 gap-1 border-[#00C969]/30 text-[#00C969]"
                >
                  <Icons.Check className="w-3 h-3" />
                  {qualityScore}% válido
                </Badge>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                {hasBlockingErrors
                  ? `${criticalFailed} verificação(ões) crítica(s)`
                  : `${passedChecks}/${totalChecks} verificações`}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="flex-shrink-0 w-full justify-start border-b border-border bg-transparent h-auto px-4 py-3 gap-1">
            <TabsTrigger
              value="overview"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              <Icons.Overview className="w-3.5 h-3.5 mr-1" />
              Resumo
            </TabsTrigger>
            <TabsTrigger
              value="geral-ppst"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Geral PPST ({geralPPSTCount})
            </TabsTrigger>
            <TabsTrigger
              value="jogos-ppst"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Jogos PPST ({jogosPPSTCount})
            </TabsTrigger>
            <TabsTrigger
              value="geral-ppsr"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Geral PPSR ({geralPPSRCount})
            </TabsTrigger>
            <TabsTrigger
              value="jogos-ppsr"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
              disabled={jogosPPSRCount === 0}
            >
              Jogos PPSR ({jogosPPSRCount})
            </TabsTrigger>
            <TabsTrigger
              value="rateio"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              <Icons.PieChart className="w-3.5 h-3.5 mr-1" />
              Rateio
            </TabsTrigger>
            <TabsTrigger
              value="validation"
              className={`rounded-md data-[state=active]:bg-muted/50 px-3 py-2 ${
                hasBlockingErrors ? "text-red-500" : ""
              }`}
            >
              Validação ({passedChecks}/{totalChecks})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto p-6">
            <TabsContent value="overview" className="m-0 h-full">
              <LeagueOverviewTab
                parsedData={parsedData}
                validationResult={validationResult}
              />
            </TabsContent>
            <TabsContent value="geral-ppst" className="m-0 h-full">
              {activeTab === "geral-ppst" && (
                <LeagueGeralPPSTTab data={parsedData.geralPPST} />
              )}
            </TabsContent>
            <TabsContent value="jogos-ppst" className="m-0 h-full">
              {activeTab === "jogos-ppst" && (
                <LeagueJogosPPSTTab
                  data={parsedData.jogosPPST}
                  inicioCount={parsedData.jogosPPSTInicioCount}
                  unknownFormatsCount={parsedData.unknownGameFormats?.length}
                  geralTotals={parsedData.geralPPST?.[0]?.total ? {
                    ganhosJogador: parsedData.geralPPST[0].total.ganhosJogador,
                    ganhosLigaTaxa: parsedData.geralPPST[0].total.ganhosLigaTaxa,
                    gapGarantido: parsedData.geralPPST[0].total.gapGarantido,
                  } : undefined}
                />
              )}
            </TabsContent>
            <TabsContent value="geral-ppsr" className="m-0 h-full">
              {activeTab === "geral-ppsr" && (
                <LeagueGeralPPSRTab data={parsedData.geralPPSR} />
              )}
            </TabsContent>
            <TabsContent value="jogos-ppsr" className="m-0 h-full">
              {activeTab === "jogos-ppsr" && (
                <LeagueJogosPPSRTab
                  data={parsedData.jogosPPSR || []}
                  inicioCount={parsedData.jogosPPSRInicioCount}
                  unknownFormatsCount={parsedData.unknownCashFormats?.length}
                />
              )}
            </TabsContent>
            <TabsContent value="rateio" className="m-0 h-full">
              {activeTab === "rateio" && (
                <LeagueRateioTab
                  geralPPST={parsedData.geralPPST}
                  jogosPPST={parsedData.jogosPPST}
                />
              )}
            </TabsContent>
            <TabsContent value="validation" className="m-0 h-full">
              <LeagueValidationTab
                checks={checks}
                warnings={validationResult.warnings}
              />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border bg-muted/30">
          {/* Spreadsheet Info Bar */}
          {(() => {
            const metadata = parseSpreadsheetFileName(
              parsedData.fileName || "",
            );
            return (
              <div className="px-6 py-2 border-b border-border/50 bg-muted/20">
                <div className="flex items-center gap-4 text-xs">
                  {/* Type Badge */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Tipo:</span>
                    <Badge
                      variant="outline"
                      className="px-2 py-0.5 text-[10px] font-medium"
                    >
                      {metadata.typeLabel}
                    </Badge>
                  </div>

                  {/* IDs */}
                  {metadata.parsed && (
                    <>
                      {metadata.type === "super-union" ||
                      metadata.type === "super-union-ppst" ||
                      metadata.type === "super-union-ppsr" ||
                      metadata.type === "league" ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Liga:</span>
                            <span className="font-mono font-medium">
                              {metadata.primaryId}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              Clube Master:
                            </span>
                            <span className="font-mono font-medium">
                              {metadata.secondaryId}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Clube:</span>
                          <span className="font-mono font-medium">
                            {metadata.primaryId}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Description */}
                  <div className="flex-1 text-muted-foreground/70 text-[10px] italic">
                    {metadata.typeDescription}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Actions Bar */}
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icons.Description className="h-4 w-4" />
              <span className="font-mono text-xs">{parsedData.fileName}</span>
              <span className="text-muted-foreground/50">|</span>
              <span className="text-xs">
                {((parsedData.fileSize ?? 0) / 1024).toFixed(1)} KB
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onReject}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleApprove}
                disabled={hasBlockingErrors || isProcessing}
                className={hasBlockingErrors ? "opacity-50" : ""}
              >
                {isProcessing ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Icons.Check className="mr-2 h-4 w-4" />
                    Aprovar e Processar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
