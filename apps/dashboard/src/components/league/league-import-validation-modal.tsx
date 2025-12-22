"use client";

import type { LeagueImportValidationModalProps } from "@/lib/league/types";
import { Badge } from "@midday/ui/badge";
import { Button } from "@midday/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@midday/ui/dialog";
import { Icons } from "@midday/ui/icons";
import { Spinner } from "@midday/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midday/ui/tabs";
import { getWeek, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";

import {
  LeagueGeralPPSTTab,
  LeagueJogosPPSTTab,
  LeagueOverviewTab,
  LeagueValidationTab,
} from "./validation-tabs";

// Helper to get week number from date string (yyyy-MM-dd format)
function getWeekFromDateString(dateStr: string): number | null {
  try {
    // Try yyyy-MM-dd format first
    let date = parse(dateStr, "yyyy-MM-dd", new Date());
    if (Number.isNaN(date.getTime())) {
      // Try dd/MM/yyyy format
      date = parse(dateStr, "dd/MM/yyyy", new Date(), { locale: ptBR });
    }
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return getWeek(date, { weekStartsOn: 0, firstWeekContainsDate: 1 });
  } catch {
    return null;
  }
}

// Column counts per tab (from spreadsheet mapping)
const TAB_COLUMNS: Record<string, { name: string; cols: number }> = {
  overview: { name: "Resumo", cols: 0 },
  "geral-ppst": { name: "Geral PPST", cols: 15 },
  "jogos-ppst": { name: "Jogos PPST", cols: 14 },
  "geral-ppsr": { name: "Geral PPSR", cols: 0 },
  "jogos-ppsr": { name: "Jogos PPSR", cols: 0 },
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
  const { qualityScore, passedChecks, totalChecks, hasBlockingErrors, checks } =
    validationResult;
  const criticalFailed = checks.filter(
    (c) => c.status === "failed" && c.severity === "critical",
  ).length;
  const currentTabInfo = TAB_COLUMNS[activeTab];

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

  // Get counts for tabs
  const geralPPSTCount = validationResult.stats.totalLigasPPST;
  const jogosPPSTCount = validationResult.stats.totalJogosPPST;
  const jogadoresPPSTCount = validationResult.stats.totalJogadoresPPST;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1600px] max-h-[92vh] overflow-hidden flex flex-col p-0 bg-background border border-border shadow-2xl rounded-xl">
        <DialogHeader className="flex-shrink-0 px-6 py-5 border-b border-border">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <DialogTitle className="text-lg font-medium">
                  Validação de Planilha de Liga
                </DialogTitle>
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
                  : "Revise os dados extraídos antes de processar"}
              </DialogDescription>
            </div>

            {/* Quality Score Badge */}
            <div className="flex items-center gap-3">
              <div
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg border
                  ${
                    hasBlockingErrors
                      ? "bg-red-500/10 text-red-500 border-red-500/30"
                      : qualityScore >= 80
                        ? "bg-[#00C969]/10 text-[#00C969] border-[#00C969]/30"
                        : qualityScore >= 50
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                          : "bg-red-500/10 text-red-500 border-red-500/30"
                  }
                `}
              >
                {hasBlockingErrors ? (
                  <>
                    <Icons.AlertCircle className="h-4 w-4" />
                    <span className="font-medium text-sm">
                      {criticalFailed} erro{criticalFailed !== 1 ? "s" : ""}{" "}
                      crítico{criticalFailed !== 1 ? "s" : ""}
                    </span>
                  </>
                ) : (
                  <>
                    <Icons.Check className="h-4 w-4" />
                    <span className="font-medium text-sm">
                      {passedChecks}/{totalChecks} validações
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="border-b border-border px-6">
            <TabsList className="h-12 bg-transparent p-0 gap-1">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-muted data-[state=active]:shadow-none px-4 h-10"
              >
                Resumo
              </TabsTrigger>
              <TabsTrigger
                value="geral-ppst"
                className="data-[state=active]:bg-muted data-[state=active]:shadow-none px-4 h-10"
              >
                Geral PPST ({geralPPSTCount})
              </TabsTrigger>
              <TabsTrigger
                value="jogos-ppst"
                className="data-[state=active]:bg-muted data-[state=active]:shadow-none px-4 h-10"
              >
                Jogos PPST ({jogosPPSTCount})
              </TabsTrigger>
              <TabsTrigger
                value="geral-ppsr"
                className="data-[state=active]:bg-muted data-[state=active]:shadow-none px-4 h-10"
                disabled
              >
                Geral PPSR (-)
              </TabsTrigger>
              <TabsTrigger
                value="jogos-ppsr"
                className="data-[state=active]:bg-muted data-[state=active]:shadow-none px-4 h-10"
                disabled
              >
                Jogos PPSR (-)
              </TabsTrigger>
              <TabsTrigger
                value="validation"
                className={`data-[state=active]:bg-muted data-[state=active]:shadow-none px-4 h-10 ${
                  hasBlockingErrors ? "text-red-500" : ""
                }`}
              >
                Validação ({passedChecks}/{totalChecks})
              </TabsTrigger>
            </TabsList>
          </div>

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
                <LeagueJogosPPSTTab data={parsedData.jogosPPST} />
              )}
            </TabsContent>
            <TabsContent value="geral-ppsr" className="m-0 h-full">
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aba PPSR ainda não implementada
              </div>
            </TabsContent>
            <TabsContent value="jogos-ppsr" className="m-0 h-full">
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aba PPSR ainda não implementada
              </div>
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
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icons.Description className="h-4 w-4" />
            <span>{parsedData.fileName}</span>
            <span className="text-muted-foreground/50">|</span>
            <span>{((parsedData.fileSize ?? 0) / 1024).toFixed(1)} KB</span>
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
              onClick={onApprove}
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
      </DialogContent>
    </Dialog>
  );
}
