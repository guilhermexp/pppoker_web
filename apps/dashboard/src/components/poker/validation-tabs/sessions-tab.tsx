"use client";

import type { ParsedSession } from "@/lib/poker/types";
import { Badge } from "@midday/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@midday/ui/collapsible";
import { Icons } from "@midday/ui/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@midday/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ReactNode } from "react";
import { useState } from "react";

type SessionsTabProps = {
  sessions: ParsedSession[];
  period?: {
    start: string;
    end: string;
  };
  utcCount?: number; // Number of UTC markers found in column A (expected matches)
};

type SessionWithIndex = ParsedSession & { numero: number };

export function SessionsTab({ sessions, period, utcCount }: SessionsTabProps) {
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (card: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(card)) {
        next.delete(card);
      } else {
        next.add(card);
      }
      return next;
    });
  };

  const sessionsWithIndex: SessionWithIndex[] = sessions.map((session, index) => ({
    ...session,
    numero: index + 1,
  }));

  // Calculate totals
  const totalCashGames = sessions.filter(
    (s) => formatSessionTypeTag(s.sessionType, s.createdByNickname) === "CASH",
  ).length;
  const totalMTT = sessions.filter(
    (s) => formatSessionTypeTag(s.sessionType, s.createdByNickname) === "MTT",
  ).length;
  const totalSitNG = sessions.filter(
    (s) => formatSessionTypeTag(s.sessionType, s.createdByNickname) === "SITNG",
  ).length;
  const totalSpin = sessions.filter(
    (s) => formatSessionTypeTag(s.sessionType, s.createdByNickname) === "SPIN",
  ).length;
  const totalBuyIn = sessions.reduce((sum, s) => sum + (s.totalBuyIn ?? 0), 0);
  const totalWinnings = sessions.reduce((sum, s) => sum + (s.totalWinnings ?? 0), 0);
  const totalTaxa = sessions.reduce((sum, s) => sum + (s.totalRake ?? 0), 0);
  const totalHands = sessions.reduce((sum, s) => sum + (s.handsPlayed ?? 0), 0);
  const totalPlayers = sessions.reduce((sum, s) => sum + (s.playerCount ?? 0), 0);

  // Calculate by organizer: PPST, PPSR, Liga
  const ppstSessions = sessions.filter((s) => s.createdByNickname === "PPST");
  const ppsrSessions = sessions.filter((s) => s.createdByNickname === "PPSR");
  const ligaSessions = sessions.filter((s) => s.createdByNickname === "Liga");

  const totalPPST = ppstSessions.length;
  const totalPPSR = ppsrSessions.length;
  const totalLiga = ligaSessions.length;

  // PPST breakdown by type (já filtrado por PPST, usar organizador)
  const ppstMTT = ppstSessions.filter((s) => formatSessionTypeTag(s.sessionType, "PPST") === "MTT").length;
  const ppstSitNG = ppstSessions.filter((s) => formatSessionTypeTag(s.sessionType, "PPST") === "SITNG").length;
  const ppstSpin = ppstSessions.filter((s) => formatSessionTypeTag(s.sessionType, "PPST") === "SPIN").length;

  // Liga breakdown by type (pode ter Ring Games e Torneios)
  const ligaMTT = ligaSessions.filter((s) => formatSessionTypeTag(s.sessionType, "Liga") === "MTT").length;
  const ligaSitNG = ligaSessions.filter((s) => formatSessionTypeTag(s.sessionType, "Liga") === "SITNG").length;
  const ligaSpin = ligaSessions.filter((s) => formatSessionTypeTag(s.sessionType, "Liga") === "SPIN").length;
  const ligaCash = ligaSessions.filter((s) => formatSessionTypeTag(s.sessionType, "Liga") === "CASH").length;

  // Buy-in by organizer
  const ppstBuyIn = ppstSessions.reduce((sum, s) => sum + (s.totalBuyIn ?? 0), 0);
  const ppsrBuyIn = ppsrSessions.reduce((sum, s) => sum + (s.totalBuyIn ?? 0), 0);
  const ligaTorneioBuyIn = ligaSessions
    .filter((s) => formatSessionTypeTag(s.sessionType, "Liga") !== "CASH")
    .reduce((sum, s) => sum + (s.totalBuyIn ?? 0), 0);
  const ligaRingBuyIn = ligaSessions
    .filter((s) => formatSessionTypeTag(s.sessionType, "Liga") === "CASH")
    .reduce((sum, s) => sum + (s.totalBuyIn ?? 0), 0);

  // Taxa by organizer
  const ppstTaxa = ppstSessions.reduce((sum, s) => sum + (s.totalRake ?? 0), 0);
  const ppsrTaxa = ppsrSessions.reduce((sum, s) => sum + (s.totalRake ?? 0), 0);
  const ligaTorneioTaxa = ligaSessions
    .filter((s) => formatSessionTypeTag(s.sessionType, "Liga") !== "CASH")
    .reduce((sum, s) => sum + (s.totalRake ?? 0), 0);
  const ligaRingTaxa = ligaSessions
    .filter((s) => formatSessionTypeTag(s.sessionType, "Liga") === "CASH")
    .reduce((sum, s) => sum + (s.totalRake ?? 0), 0);

  // Mãos by organizer (only Cash Games have hands)
  const ppsrHands = ppsrSessions.reduce((sum, s) => sum + (s.handsPlayed ?? 0), 0);
  const ligaRingHands = ligaSessions
    .filter((s) => formatSessionTypeTag(s.sessionType, "Liga") === "CASH")
    .reduce((sum, s) => sum + (s.handsPlayed ?? 0), 0);

  // GTD (Premiação Garantida) - apenas torneios MTT e SITNG (não SPIN)
  const tournamentsWithGTD = sessions.filter((s) => {
    const type = formatSessionTypeTag(s.sessionType, s.createdByNickname);
    return (type === "MTT" || type === "SITNG") && (s.guaranteedPrize ?? 0) > 0;
  });
  const totalGTD = tournamentsWithGTD.reduce((sum, s) => sum + (s.guaranteedPrize ?? 0), 0);
  const gtdCount = tournamentsWithGTD.length;

  // Calculate unique table names with counts (remove ? from emoji artifacts)
  const cleanTableName = (name: string | null) => {
    if (!name) return "Sem nome";
    return name.replace(/\(\?\)/g, "").replace(/\?/g, "").trim() || "Sem nome";
  };
  const tableNameCounts = sessions.reduce((acc, s) => {
    const name = cleanTableName(s.tableName);
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const uniqueTableNames = Object.entries(tableNameCounts).sort((a, b) => b[1] - a[1]);

  // HU (Heads Up) tables - identified by "HU" in table name
  const huSessions = sessions.filter((s) =>
    s.tableName?.toUpperCase().includes("HU") ||
    s.tableName?.toLowerCase().includes("heads up")
  );
  const huTableNames = huSessions.reduce((acc, s) => {
    const name = cleanTableName(s.tableName);
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const uniqueHuTables = Object.entries(huTableNames).sort((a, b) => b[1] - a[1]);
  const huBuyIn = huSessions.reduce((sum, s) => sum + (s.totalBuyIn ?? 0), 0);
  const huTaxa = huSessions.reduce((sum, s) => sum + (s.totalRake ?? 0), 0);
  const huHands = huSessions.reduce((sum, s) => sum + (s.handsPlayed ?? 0), 0);

  return (
    <div className="space-y-4 pb-4">
      {/* Section 1: Resumo Geral */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resumo Geral</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-start">
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Partidas</p>
            <p className="text-lg font-semibold">{sessions.length}</p>
            {utcCount !== undefined && (
              <p className={`text-[9px] mt-0.5 ${utcCount === sessions.length ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                UTC na planilha: {utcCount}
              </p>
            )}
          </div>
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Jogadores</p>
            <p className="text-lg font-semibold">{totalPlayers}</p>
          </div>
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Total Ganhos</p>
            <p className={`text-lg font-semibold font-mono ${totalWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
              {totalWinnings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Buy-in Total</p>
            <p className="text-lg font-semibold font-mono">
              {totalBuyIn.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Taxa Total</p>
            <p className="text-lg font-semibold font-mono">
              {totalTaxa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Por Tipo de Jogo */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Por Tipo de Jogo</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-start">
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Cash Games</p>
            <p className="text-lg font-semibold">{totalCashGames}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              PPSR: {totalPPSR} · Liga: {ligaCash}
            </p>
          </div>
          <div className="p-3 border rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground">Torneios</p>
            <p className="text-lg font-semibold">{totalMTT + totalSitNG + totalSpin}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              MTT: {totalMTT} · SNG: {totalSitNG} · SPIN: {totalSpin}
            </p>
          </div>
          <div
            className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleCard("maos")}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Mãos Jogadas</p>
              <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.has("maos") ? "rotate-180" : ""}`} />
            </div>
            <p className="text-lg font-semibold font-mono">{totalHands.toLocaleString("pt-BR")}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Somente Cash Games
            </p>
            {expandedCards.has("maos") && (
              <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">PPSR</span>
                  <span className="font-medium font-mono">{ppsrHands.toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Liga Ring</span>
                  <span className="font-medium font-mono">{ligaRingHands.toLocaleString("pt-BR")}</span>
                </div>
                {huHands > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">HU (incluso)</span>
                    <span className="font-medium font-mono">{huHands.toLocaleString("pt-BR")}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          {totalGTD > 0 && (
            <div className="p-3 border rounded-lg bg-amber-500/10 border-amber-500/30">
              <p className="text-xs text-amber-600">GTD Total</p>
              <p className="text-lg font-semibold font-mono text-amber-500">
                {totalGTD.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <p className="text-[9px] text-amber-600/70 mt-0.5">
                {gtdCount} torneio{gtdCount !== 1 ? "s" : ""} garantidos
              </p>
            </div>
          )}
          <div
            className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleCard("hu")}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Mesas HU</p>
              <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.has("hu") ? "rotate-180" : ""}`} />
            </div>
            <p className="text-lg font-semibold">{huSessions.length}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Heads Up
            </p>
          </div>
        </div>
      </div>

      {/* Expanded HU Panel */}
      {expandedCards.has("hu") && (
        <div className="border rounded-lg bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">Mesas Heads Up (HU)</h4>
              <span className="text-xs text-muted-foreground">
                Buy-in: {huBuyIn.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ·
                Taxa: {huTaxa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleCard("hu")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icons.Close className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {uniqueHuTables.map(([name, count]) => (
              <div key={name} className="border rounded-lg bg-background p-2">
                <p className="text-xs text-muted-foreground truncate" title={name}>{name}</p>
                <p className="text-sm font-semibold">{count} partida{count !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Por Organizador */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Por Organizador</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-start">
          <div
            className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleCard("ppst")}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">PPST</p>
              <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.has("ppst") ? "rotate-180" : ""}`} />
            </div>
            <p className="text-lg font-semibold">{totalPPST}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Torneios Oficiais</p>
            {expandedCards.has("ppst") && (
              <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">MTT</span>
                  <span className="font-medium">{ppstMTT}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Sit&Go</span>
                  <span className="font-medium">{ppstSitNG}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">SPIN</span>
                  <span className="font-medium">{ppstSpin}</span>
                </div>
                <div className="border-t border-border/30 pt-1 mt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Buy-in</span>
                    <span className="font-medium font-mono">{ppstBuyIn.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Taxa</span>
                    <span className="font-medium font-mono">{ppstTaxa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div
            className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleCard("ppsr")}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">PPSR</p>
              <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.has("ppsr") ? "rotate-180" : ""}`} />
            </div>
            <p className="text-lg font-semibold">{totalPPSR}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Ring Games Oficiais</p>
            {expandedCards.has("ppsr") && (
              <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cash Games</span>
                  <span className="font-medium">{totalPPSR}</span>
                </div>
                <div className="border-t border-border/30 pt-1 mt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Buy-in</span>
                    <span className="font-medium font-mono">{ppsrBuyIn.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Taxa</span>
                    <span className="font-medium font-mono">{ppsrTaxa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div
            className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleCard("ligaTorneios")}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Liga Torneios</p>
              <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.has("ligaTorneios") ? "rotate-180" : ""}`} />
            </div>
            <p className="text-lg font-semibold">{ligaMTT + ligaSitNG + ligaSpin}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Torneios Internos</p>
            {expandedCards.has("ligaTorneios") && (
              <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                {ligaMTT > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">MTT</span>
                    <span className="font-medium">{ligaMTT}</span>
                  </div>
                )}
                {ligaSitNG > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Sit&Go</span>
                    <span className="font-medium">{ligaSitNG}</span>
                  </div>
                )}
                {ligaSpin > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">SPIN</span>
                    <span className="font-medium">{ligaSpin}</span>
                  </div>
                )}
                <div className="border-t border-border/30 pt-1 mt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Buy-in</span>
                    <span className="font-medium font-mono">{ligaTorneioBuyIn.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Taxa</span>
                    <span className="font-medium font-mono">{ligaTorneioTaxa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div
            className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => toggleCard("ligaRing")}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Liga Ring</p>
              <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.has("ligaRing") ? "rotate-180" : ""}`} />
            </div>
            <p className="text-lg font-semibold">{ligaCash}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Cash Games Internos</p>
            {expandedCards.has("ligaRing") && (
              <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cash Games</span>
                  <span className="font-medium">{ligaCash}</span>
                </div>
                <div className="border-t border-border/30 pt-1 mt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Buy-in</span>
                    <span className="font-medium font-mono">{ligaRingBuyIn.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Taxa</span>
                    <span className="font-medium font-mono">{ligaRingTaxa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 4: Tipos de Mesas */}
      <div className="space-y-2">
        <div
          className="flex items-center justify-between cursor-pointer hover:opacity-80"
          onClick={() => toggleCard("mesas")}
        >
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tipos de Mesas ({uniqueTableNames.length})
          </h3>
          <Icons.ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedCards.has("mesas") ? "rotate-180" : ""}`} />
        </div>
        {expandedCards.has("mesas") && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {uniqueTableNames.map(([name, count]) => (
              <div key={name} className="border rounded-lg bg-muted/30 p-2">
                <p className="text-xs text-muted-foreground truncate" title={name}>{name}</p>
                <p className="text-sm font-semibold">{count} partida{count !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {sessionsWithIndex.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-[#878787]">
            Nenhuma partida encontrada
          </div>
        ) : null}
        {sessionsWithIndex.map((session) => {
          const sessionKey = session.externalId || String(session.numero);
          const isExpanded = expandedMatches.has(sessionKey);
          const playerCount = session.playerCount ?? session.players?.length ?? 0;

          const handsPlayed = session.handsPlayed ?? session.players?.reduce(
            (sum, player) => sum + (player.hands ?? 0),
            0,
          );

          return (
            <Collapsible
              key={sessionKey}
              open={isExpanded}
              onOpenChange={(open) => {
                setExpandedMatches((prev) => {
                  const next = new Set(prev);
                  if (open) {
                    next.add(sessionKey);
                  } else {
                    next.delete(sessionKey);
                  }
                  return next;
                });
              }}
              className="border rounded-lg overflow-hidden"
            >
              <CollapsibleTrigger className="w-full text-left">
                <div className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Icons.ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">#{session.numero}</span>
                      </div>
                      <Badge variant="secondary">
                        {formatSessionTypeTag(session.sessionType, session.createdByNickname)}
                      </Badge>
                      {isHeadsUp(session.tableName) && (
                        <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                          HU
                        </Badge>
                      )}
                      {session.createdByNickname || session.createdByPpPokerId ? (
                        <span className="text-sm text-muted-foreground">
                          Organizador: {session.createdByNickname || `pp${session.createdByPpPokerId}`}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icons.Customers className="h-4 w-4" />
                      {playerCount} jogadores
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Mesa:</span> {session.tableName || "Sem nome"}
                      {session.blinds ? ` · Blinds: ${session.blinds}` : ""}
                      {session.gameVariant
                        ? ` · ${session.gameVariant.toUpperCase()}`
                        : ""}
                      {session.rakePercent ? ` · Taxa: ${session.rakePercent}%` : ""}
                      {session.rakeCap ? ` Cap: ${session.rakeCap}` : ""}
                      {session.timeLimit ? ` · Tempo: ${session.timeLimit}` : ""}
                    </div>
                    {session.externalId && !session.externalId.startsWith("match_") && (
                      <div className="text-xs text-muted-foreground/70 font-mono">
                        ID: {session.externalId}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground/70">
                      {session.startedAt ? `Início: ${formatDateTime(session.startedAt)}` : ""}
                      {session.endedAt ? ` · Fim: ${formatDateTime(session.endedAt)}` : ""}
                      {(session.startedAt && session.endedAt) ? ` · Duração: ${formatDuration(session.startedAt, session.endedAt)}` : ""}
                    </div>
                    {(session.buyInAmount || session.guaranteedPrize) && (
                      <div className="text-xs text-muted-foreground/70">
                        {session.buyInAmount ? `Buy-in: ${formatCurrency(session.buyInAmount)}` : ""}
                        {session.guaranteedPrize ? ` · GTD: ${formatCurrency(session.guaranteedPrize)}` : ""}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <StatItem
                      icon={<Icons.Transactions className="h-4 w-4" />}
                      label="Buy-in"
                      value={formatCurrency(session.totalBuyIn ?? 0)}
                    />
                    <StatItem
                      icon={<Icons.Transactions className="h-4 w-4" />}
                      label="Taxa"
                      value={formatCurrency(session.totalRake ?? 0)}
                    />
                    <StatItem
                      icon={<Icons.Customers className="h-4 w-4" />}
                      label="Mãos"
                      value={handsPlayed ? handsPlayed.toLocaleString("pt-BR") : "-"}
                    />
                    <StatItem
                      icon={<Icons.Transactions className="h-4 w-4" />}
                      label="Ganhos"
                      value={formatCurrency(session.totalWinnings ?? 0)}
                      className={(session.totalWinnings ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}
                    />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t bg-muted/20">
                <div className="p-4">
                  {session.players && session.players.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden bg-background overflow-x-auto">
                      {formatSessionTypeTag(session.sessionType, session.createdByNickname) === "CASH" ? (
                        /* CASH/HU Table - All columns */
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">ID</TableHead>
                              <TableHead className="text-xs">Apelido</TableHead>
                              <TableHead className="text-xs">Memorando</TableHead>
                              <TableHead className="text-xs text-right">Buy-in</TableHead>
                              <TableHead className="text-xs text-right">Mãos</TableHead>
                              <TableHead className="text-xs text-right text-emerald-600" colSpan={4}>Ganhos do Jogador</TableHead>
                              <TableHead className="text-xs text-right text-rose-500" colSpan={5}>Ganhos do Clube</TableHead>
                            </TableRow>
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-[10px]" />
                              <TableHead className="text-[10px]" />
                              <TableHead className="text-[10px]" />
                              <TableHead className="text-[10px]" />
                              <TableHead className="text-[10px]" />
                              <TableHead className="text-[10px] text-right">Geral</TableHead>
                              <TableHead className="text-[10px] text-right">Adversários</TableHead>
                              <TableHead className="text-[10px] text-right">Jackpot</TableHead>
                              <TableHead className="text-[10px] text-right">Dividir EV</TableHead>
                              <TableHead className="text-[10px] text-right">Geral</TableHead>
                              <TableHead className="text-[10px] text-right">Taxa</TableHead>
                              <TableHead className="text-[10px] text-right">Taxa Jackpot</TableHead>
                              <TableHead className="text-[10px] text-right">Prêmios Jackpot</TableHead>
                              <TableHead className="text-[10px] text-right">Dividir EV</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {session.players.map((player, index) => (
                              <TableRow key={`${sessionKey}-${player.ppPokerId}-${index}`}>
                                <TableCell className="font-mono text-xs">{player.ppPokerId}</TableCell>
                                <TableCell className="text-xs">{player.nickname}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{player.memoName || "-"}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCurrency(player.buyIn ?? 0)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{player.hands ?? 0}</TableCell>
                                {/* Ganhos do Jogador */}
                                <TableCell className={`text-xs text-right font-mono ${(player.winningsGeneral ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                                  {formatCurrency(player.winningsGeneral ?? 0)}
                                </TableCell>
                                <TableCell className={`text-xs text-right font-mono ${(player.winningsOpponents ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                                  {formatCurrency(player.winningsOpponents ?? 0)}
                                </TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCurrency(player.winningsJackpot ?? 0)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCurrency(player.winningsEvSplit ?? 0)}</TableCell>
                                {/* Ganhos do Clube */}
                                <TableCell className="text-xs text-right font-mono">{formatCurrency(player.clubWinningsGeneral ?? 0)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCurrency(player.clubWinningsFee ?? 0)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCurrency(player.clubWinningsJackpotFee ?? 0)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCurrency(player.clubWinningsJackpotPrize ?? 0)}</TableCell>
                                <TableCell className="text-xs text-right font-mono">{formatCurrency(player.clubWinningsEvSplit ?? 0)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : formatSessionTypeTag(session.sessionType, session.createdByNickname) === "SPIN" ? (
                        /* SPIN Table - Ranking, Buy-in, Prêmio, Ganhos (sem Taxa) */
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">ID</TableHead>
                              <TableHead className="text-xs">Apelido</TableHead>
                              <TableHead className="text-xs">Memorando</TableHead>
                              <TableHead className="text-right">Ranking</TableHead>
                              <TableHead className="text-right">Buy-in Fichas</TableHead>
                              <TableHead className="text-right">Prêmio</TableHead>
                              <TableHead className="text-right">Ganhos</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {session.players.map((player, index) => (
                              <TableRow key={`${sessionKey}-${player.ppPokerId}-${index}`}>
                                <TableCell className="font-mono text-xs">{player.ppPokerId}</TableCell>
                                <TableCell className="text-xs">{player.nickname}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{player.memoName || "-"}</TableCell>
                                <TableCell className="text-right font-mono text-xs">
                                  {player.ranking ? `#${player.ranking}` : "-"}
                                </TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(player.buyInChips ?? player.buyIn ?? 0)}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(player.prize ?? 0)}</TableCell>
                                <TableCell className={`text-right font-mono ${(player.winnings ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                                  {formatCurrency(player.winnings ?? 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        /* MTT/SITNG Table - Ranking, Buy-in Fichas, Buy-in Ticket, Ganhos, Taxa */
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">ID</TableHead>
                              <TableHead className="text-xs">Apelido</TableHead>
                              <TableHead className="text-xs">Memorando</TableHead>
                              <TableHead className="text-right">Ranking</TableHead>
                              <TableHead className="text-right">Buy-in Fichas</TableHead>
                              <TableHead className="text-right">Buy-in Ticket</TableHead>
                              <TableHead className="text-right">Ganhos</TableHead>
                              <TableHead className="text-right">Taxa</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {session.players.map((player, index) => (
                              <TableRow key={`${sessionKey}-${player.ppPokerId}-${index}`}>
                                <TableCell className="font-mono text-xs">{player.ppPokerId}</TableCell>
                                <TableCell className="text-xs">{player.nickname}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{player.memoName || "-"}</TableCell>
                                <TableCell className="text-right font-mono text-xs">
                                  {player.ranking ? `#${player.ranking}` : "-"}
                                </TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(player.buyInChips ?? player.buyIn ?? 0)}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(player.buyInTicket ?? 0)}</TableCell>
                                <TableCell className={`text-right font-mono ${(player.winnings ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                                  {formatCurrency(player.winnings ?? 0)}
                                </TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(player.rake ?? 0)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum jogador encontrado nesta partida.
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

function formatSessionType(type: string): string {
  const types: Record<string, string> = {
    cash_game: "Cash",
    ring: "Cash",
    cash: "Cash",
    mtt: "MTT",
    tournament: "MTT",
    sit_n_go: "Sit&Go",
    sng: "Sit&Go",
    spin: "SPIN",
    spinup: "SPIN",
  };
  return types[type.toLowerCase()] || type;
}

function formatSessionTypeTag(type: string, organizador?: string | null): "CASH" | "MTT" | "SITNG" | "SPIN" {
  const normalized = formatSessionType(type).toLowerCase();

  // Se o organizador é PPST, é torneio (nunca CASH)
  if (organizador === "PPST") {
    if (normalized.includes("spin")) return "SPIN";
    if (normalized.includes("sit")) return "SITNG";
    return "MTT"; // Default para PPST é MTT
  }

  // Se o organizador é PPSR, é sempre CASH
  if (organizador === "PPSR") {
    return "CASH";
  }

  // Liga ou outros - usar o tipo
  if (normalized.includes("spin")) return "SPIN";
  if (normalized.includes("mtt")) return "MTT";
  if (normalized.includes("sit")) return "SITNG";
  return "CASH";
}

function isHeadsUp(tableName: string | null): boolean {
  if (!tableName) return false;
  const name = tableName.toUpperCase();
  return name.includes(" HU") || name.includes("HU ") || name.endsWith("HU") || name.includes("HEADS UP");
}

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, "dd/MM HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
}


function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "-";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!totalMinutes) return "-";
  if (hours === 0) return `${minutes}m`;
  return `${hours}h${minutes.toString().padStart(2, "0")}m`;
}

function StatItem({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium ${className || ""}`}>{value}</p>
      </div>
    </div>
  );
}
