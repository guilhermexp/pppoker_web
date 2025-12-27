"use client";

import type { ImportValidationModalProps } from "@/lib/poker/types";
import { parseSpreadsheetFileName } from "@/lib/poker/spreadsheet-types";
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
  ResumoTab,
  GeneralTab,
  DetailedTab,
  SessionsTab,
  TransactionsTab,
  DemonstrativoTab,
  UserDetailsTab,
  RakebackTab,
  ValidationTab,
  CadastroTab,
} from "./validation-tabs";

// Helper to get week number from date string (dd/MM/yyyy format)
function getWeekFromDateString(dateStr: string): number | null {
  try {
    // Try dd/MM/yyyy format first
    let date = parse(dateStr, "dd/MM/yyyy", new Date(), { locale: ptBR });
    if (Number.isNaN(date.getTime())) {
      // Try yyyy-MM-dd format
      date = parse(dateStr, "yyyy-MM-dd", new Date());
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
  resumo: { name: "Resumo", cols: 0 },
  general: { name: "Geral", cols: 48 },
  detailed: { name: "Detalhado", cols: 137 },
  sessions: { name: "Partidas", cols: 12 },
  transactions: { name: "Transações", cols: 21 },
  demonstrativo: { name: "Demonstrativo", cols: 8 },
  "user-details": { name: "Detalhes do usuário", cols: 12 },
  rakeback: { name: "Retorno de taxa", cols: 7 },
  cadastro: { name: "Cadastro", cols: 0 },
  validation: { name: "Validação", cols: 0 },
};

export function ImportValidationModal({
  open,
  onOpenChange,
  parsedData,
  validationResult,
  onApprove,
  onReject,
  isProcessing = false,
}: ImportValidationModalProps) {
  const [activeTab, setActiveTab] = useState("resumo");
  const { qualityScore, passedChecks, totalChecks, hasBlockingErrors, checks } =
    validationResult;
  const criticalFailed = checks.filter(
    (c) => c.status === "failed" && c.severity === "critical",
  ).length;
  const currentTabInfo = TAB_COLUMNS[activeTab];

  // Extract club ID from transactions
  const clubId =
    parsedData.transactions?.find((t) => t.senderClubId)?.senderClubId || null;

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

    // Use the start week, or end week if start is not available
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
                  Validação dos Dados
                </DialogTitle>
                {clubId && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md font-mono">
                    Clube {clubId}
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

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="flex-shrink-0 w-full justify-start border-b border-border bg-transparent h-auto px-4 py-3 gap-1">
            <TabsTrigger
              value="resumo"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              <Icons.Overview className="w-3.5 h-3.5 mr-1" />
              Resumo
            </TabsTrigger>
            <TabsTrigger
              value="general"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Geral ({parsedData.summaries?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="detailed"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Detalhado ({parsedData.detailed?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Partidas ({parsedData.sessions?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Transações ({parsedData.transactions?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="demonstrativo"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Demonstrativo ({parsedData.demonstrativo?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="user-details"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Detalhes do usuário ({parsedData.players?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="rakeback"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              Retorno de taxa ({parsedData.rakebacks?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="cadastro"
              className="rounded-md data-[state=active]:bg-muted/50 px-3 py-2"
            >
              <Icons.Add className="w-3.5 h-3.5 mr-1" />
              Cadastro
            </TabsTrigger>
            <TabsTrigger
              value="validation"
              className={`rounded-md data-[state=active]:bg-muted/50 px-3 py-2 ${
                hasBlockingErrors ? "text-[#FF3638]" : ""
              }`}
            >
              {hasBlockingErrors && (
                <Icons.AlertCircle className="w-3.5 h-3.5 mr-1" />
              )}
              Validação ({passedChecks}/{totalChecks})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden px-6 py-4 bg-muted/20 min-h-[500px]">
            <TabsContent
              value="resumo"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <ResumoTab
                summaries={parsedData.summaries || []}
                sessions={parsedData.sessions || []}
                checks={checks}
                clubId={clubId}
                period={validationResult.period}
                weekInfo={weekInfo}
              />
            </TabsContent>

            <TabsContent
              value="general"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <GeneralTab summaries={parsedData.summaries || []} />
            </TabsContent>

            <TabsContent
              value="detailed"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <DetailedTab
                detailed={parsedData.detailed || []}
                summaries={parsedData.summaries || []}
              />
            </TabsContent>

            <TabsContent
              value="sessions"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <SessionsTab
                sessions={parsedData.sessions || []}
                period={validationResult.period}
                utcCount={parsedData.sessionsUtcCount}
              />
            </TabsContent>

            <TabsContent
              value="transactions"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <TransactionsTab transactions={parsedData.transactions || []} />
            </TabsContent>

            <TabsContent
              value="demonstrativo"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <DemonstrativoTab
                demonstrativo={parsedData.demonstrativo || []}
              />
            </TabsContent>

            <TabsContent
              value="user-details"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <UserDetailsTab players={parsedData.players || []} />
            </TabsContent>

            <TabsContent
              value="rakeback"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <RakebackTab rakebacks={parsedData.rakebacks || []} />
            </TabsContent>

            <TabsContent
              value="cadastro"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <CadastroTab summaries={parsedData.summaries || []} />
            </TabsContent>

            <TabsContent
              value="validation"
              className="mt-0 h-full min-h-[460px] rounded-lg bg-background p-4 pb-24 shadow-sm overflow-y-auto max-h-[calc(92vh-240px)]"
            >
              <ValidationTab checks={checks} />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border">
          {/* Spreadsheet Info Bar */}
          {parsedData.fileName &&
            (() => {
              const metadata = parseSpreadsheetFileName(
                parsedData.fileName || "",
              );

              // No validador de clubes:
              // - 2 IDs = clube em liga (primaryId=liga, secondaryId=clube)
              // - 1 ID = clube privado sem liga
              const isClubInLeague =
                metadata.parsed && metadata.secondaryId !== null;
              const clubeId = isClubInLeague
                ? metadata.secondaryId
                : metadata.primaryId;
              const ligaId = isClubInLeague ? metadata.primaryId : null;

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
              if (metadata.dateStartFormatted && metadata.dateEndFormatted) {
                const startDate = parse(
                  metadata.dateStartFormatted,
                  "dd/MM/yyyy",
                  new Date(),
                  { locale: ptBR },
                );
                const endDate = parse(
                  metadata.dateEndFormatted,
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
                        Clube
                      </Badge>
                    </div>

                    {/* IDs */}
                    {metadata.parsed && (
                      <>
                        {isClubInLeague && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Liga:</span>
                            <span className="font-mono font-medium">
                              {ligaId}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Clube:</span>
                          <span className="font-mono font-medium">
                            {clubeId}
                          </span>
                        </div>
                      </>
                    )}

                    {/* File info */}
                    <div className="flex-1" />
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
                  </div>
                  {/* Description */}
                  <div className="text-muted-foreground/70 text-[10px] italic mt-1">
                    {isClubInLeague
                      ? "Dados do clube pertencente a uma liga"
                      : "Dados do clube privado (sem liga)"}
                    {metadata.dateStartFormatted &&
                      metadata.dateEndFormatted && (
                        <span className="ml-1">
                          — Período: {metadata.dateStartFormatted} a{" "}
                          {metadata.dateEndFormatted}
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
