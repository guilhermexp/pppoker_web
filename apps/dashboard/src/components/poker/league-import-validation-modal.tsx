"use client";

import { getWeekFromDateString } from "@/lib/poker/date-utils";
import type { LeagueImportValidationModalProps } from "@/lib/poker/league-types";
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
import { getWeek, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";

// Import league validation tabs
import {
  LeagueDemonstrativoTab,
  LeagueDetalhesDeClubeTab,
  LeagueDetalhesDoUsuarioTab,
  LeagueGeralDaLigaTab,
  LeagueGeralDeClubeTab,
  LeaguePartidasTab,
  LeagueRetornoDeTaxaTab,
  LeagueTransacoesTab,
} from "./league-validation-tabs";

// Column counts per tab
const TAB_COLUMNS: Record<string, { name: string; cols: number }> = {
  "geral-liga": { name: "Geral da Liga", cols: 42 }, // A-AP (42 columns)
  "geral-clube": { name: "Geral de Clube", cols: 48 },
  "detalhes-clube": { name: "Detalhes de Clube", cols: 51 },
  partidas: { name: "Partidas", cols: 12 },
  transacoes: { name: "Transacoes", cols: 21 },
  demonstrativo: { name: "Demonstrativo", cols: 8 },
  "detalhes-usuario": { name: "Detalhes do usuario", cols: 12 },
  "retorno-taxa": { name: "Retorno de taxa", cols: 7 },
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
  const [activeTab, setActiveTab] = useState("geral-liga");
  const { qualityScore, passedChecks, totalChecks, hasBlockingErrors, checks } =
    validationResult;
  const criticalFailed = checks.filter(
    (c) => c.status === "failed" && c.severity === "critical",
  ).length;
  const currentTabInfo = TAB_COLUMNS[activeTab];

  // Extract league ID from data
  const leagueId = parsedData.leagueId || null;

  // Calculate week numbers
  const weekInfo = useMemo(() => {
    const currentWeek = getWeek(new Date(), {
      weekStartsOn: 0,
      firstWeekContainsDate: 1,
    });

    let importWeekStart: number | null = null;
    let importWeekEnd: number | null = null;

    if (validationResult.period.start) {
      importWeekStart = getWeekFromDateString(validationResult.period.start);
    }
    if (validationResult.period.end) {
      importWeekEnd = getWeekFromDateString(validationResult.period.end);
    }

    const importWeek = importWeekStart ?? importWeekEnd;

    return {
      currentWeek,
      importWeek,
      isSameWeek: importWeek === currentWeek,
    };
  }, [validationResult.period.start, validationResult.period.end]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1600px] max-h-[92vh] overflow-hidden flex flex-col p-0 bg-background border border-border shadow-2xl rounded-xl">
        <DialogHeader className="flex-shrink-0 px-6 py-5 border-b border-border">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-lg font-medium">
                  Validacao de Liga
                </DialogTitle>
                {leagueId && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md font-mono">
                    Liga {leagueId}
                  </span>
                )}
                {validationResult.period.start &&
                  validationResult.period.end && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md font-mono">
                      {validationResult.period.start} -{" "}
                      {validationResult.period.end}
                    </span>
                  )}
                {weekInfo.importWeek && (
                  <span
                    className={`text-xs px-2 py-1 rounded-md font-medium ${
                      weekInfo.isSameWeek
                        ? "bg-[#00C969]/10 text-[#00C969] border border-[#00C969]/30"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                    }`}
                  >
                    Semana {weekInfo.importWeek}
                    {!weekInfo.isSameWeek && weekInfo.currentWeek && (
                      <span className="text-[10px] ml-1 opacity-70">
                        (atual: {weekInfo.currentWeek})
                      </span>
                    )}
                  </span>
                )}
                {currentTabInfo && currentTabInfo.cols > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    {currentTabInfo.cols} colunas
                  </span>
                )}
              </div>
              <DialogDescription className="text-muted-foreground text-sm mt-1">
                {hasBlockingErrors
                  ? "Corrija os erros antes de prosseguir"
                  : "Revise os dados extraidos antes de processar"}
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
                  {qualityScore}% valido
                </Badge>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                {hasBlockingErrors
                  ? `${criticalFailed} verificacao(oes) critica(s)`
                  : `${passedChecks}/${totalChecks} verificacoes`}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="flex-shrink-0 w-full justify-start border-b border-border bg-transparent h-auto px-4 py-3 gap-1 overflow-x-auto">
            <TabsTrigger
              value="geral-liga"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              <Icons.Overview className="w-3.5 h-3.5 mr-1" />
              Resumo
            </TabsTrigger>
            <TabsTrigger
              value="geral-clube"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Geral de Clube ({parsedData.clubSummaries?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="detalhes-clube"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Detalhes de Clube ({parsedData.clubDetailed?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="partidas"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Partidas ({parsedData.sessions?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="transacoes"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Transacoes ({parsedData.transactions?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="demonstrativo"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Demonstrativo ({parsedData.demonstrativo?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="detalhes-usuario"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Detalhes do Usuario ({parsedData.players?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="retorno-taxa"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Retorno de Taxa ({parsedData.rakebacks?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden px-6 py-4 bg-muted/20 min-h-[500px]">
            <TabsContent
              value="geral-liga"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <LeagueGeralDaLigaTab
                leagueId={leagueId}
                leagueSummary={parsedData.leagueSummary}
                stats={validationResult.stats}
                period={validationResult.period}
                weekInfo={weekInfo}
                checks={checks}
              />
            </TabsContent>

            <TabsContent
              value="geral-clube"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <LeagueGeralDeClubeTab
                summaries={parsedData.clubSummaries || []}
              />
            </TabsContent>

            <TabsContent
              value="detalhes-clube"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <LeagueDetalhesDeClubeTab
                detailed={parsedData.clubDetailed || []}
                summaries={parsedData.clubSummaries || []}
              />
            </TabsContent>

            <TabsContent
              value="partidas"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <LeaguePartidasTab
                sessions={parsedData.sessions || []}
                period={validationResult.period}
              />
            </TabsContent>

            <TabsContent
              value="transacoes"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <LeagueTransacoesTab
                transactions={parsedData.transactions || []}
              />
            </TabsContent>

            <TabsContent
              value="demonstrativo"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <LeagueDemonstrativoTab
                demonstrativo={parsedData.demonstrativo || []}
              />
            </TabsContent>

            <TabsContent
              value="detalhes-usuario"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <LeagueDetalhesDoUsuarioTab players={parsedData.players || []} />
            </TabsContent>

            <TabsContent
              value="retorno-taxa"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <LeagueRetornoDeTaxaTab rakebacks={parsedData.rakebacks || []} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border">
          {/* Spreadsheet Info Bar */}
          {(() => {
            // Calcular dias da semana
            const dayNames = [
              "Domingo",
              "Segunda",
              "Terça",
              "Quarta",
              "Quinta",
              "Sexta",
              "Sábado",
            ];
            let periodDays = "";
            if (validationResult.period.start && validationResult.period.end) {
              const startDate = parse(
                validationResult.period.start,
                "dd/MM/yyyy",
                new Date(),
                { locale: ptBR },
              );
              const endDate = parse(
                validationResult.period.end,
                "dd/MM/yyyy",
                new Date(),
                { locale: ptBR },
              );
              if (
                !Number.isNaN(startDate.getTime()) &&
                !Number.isNaN(endDate.getTime())
              ) {
                periodDays = `${dayNames[startDate.getDay()]} a ${dayNames[endDate.getDay()]}`;
              }
            }

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
                      Liga
                    </Badge>
                  </div>

                  {/* Liga ID */}
                  {leagueId && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Liga:</span>
                      <span className="font-mono font-medium">{leagueId}</span>
                    </div>
                  )}

                  {/* File info */}
                  <div className="flex-1" />
                  {parsedData.fileName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Icons.Description className="h-3 w-3" />
                      <span className="font-mono text-[10px]">
                        {parsedData.fileName}
                      </span>
                      {parsedData.fileSize && (
                        <>
                          <span className="text-muted-foreground/50">|</span>
                          <span className="text-[10px]">
                            {(parsedData.fileSize / 1024).toFixed(1)} KB
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {/* Description */}
                <div className="text-muted-foreground/70 text-[10px] italic mt-1">
                  Dados da liga completa
                  {validationResult.period.start &&
                    validationResult.period.end && (
                      <span className="ml-1">
                        — Período: {validationResult.period.start} a{" "}
                        {validationResult.period.end}
                        {periodDays && ` (${periodDays})`}
                      </span>
                    )}
                </div>
              </div>
            );
          })()}

          {/* Actions Bar */}
          <div className="flex items-center justify-between px-6 py-3">
            <Button
              variant="outline"
              onClick={onReject}
              disabled={isProcessing}
            >
              Cancelar
            </Button>

            <Button
              onClick={onApprove}
              disabled={hasBlockingErrors || isProcessing}
              variant={hasBlockingErrors ? "outline" : "default"}
            >
              {isProcessing ? (
                <>
                  <Spinner size={16} className="mr-2" />
                  Processando...
                </>
              ) : hasBlockingErrors ? (
                <>
                  <Icons.Close className="w-4 h-4 mr-2" />
                  Bloqueado - Corrija os erros
                </>
              ) : (
                <>
                  <Icons.Check className="w-4 h-4 mr-2" />
                  Aprovar e Processar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
