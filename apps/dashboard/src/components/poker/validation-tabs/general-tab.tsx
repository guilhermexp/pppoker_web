"use client";

import type { ParsedSummary } from "@/lib/poker/types";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { useState } from "react";

type GeneralTabProps = {
  summaries: ParsedSummary[];
};

// Colunas resumidas - mesmas da planilha (B até AC)
const SUMMARY_COLUMNS = [
  { key: "ppPokerId", label: "ID (B)", type: "id" },
  { key: "country", label: "País (C)", type: "text" },
  { key: "nickname", label: "Apelido (D)", type: "text" },
  { key: "memoName", label: "Memorando (E)", type: "text" },
  { key: "agentNickname", label: "Agente (F)", type: "text" },
  { key: "agentPpPokerId", label: "ID Agente (G)", type: "id" },
  { key: "superAgentNickname", label: "Superagente (H)", type: "text" },
  { key: "superAgentPpPokerId", label: "ID Super (I)", type: "id" },
  { key: "playerWinningsTotal", label: "Ganhos+Eventos (J)", type: "currency" },
  { key: "generalTotal", label: "Geral (O)", type: "currency" },
  { key: "feeGeneral", label: "Taxa Geral (AB)", type: "currency" },
  { key: "fee", label: "Taxa (AC)", type: "currency" },
] as const;

// Todas as colunas (48 campos - A até AV)
const ALL_COLUMNS = [
  // Identificação (A-I)
  { key: "ppPokerId", label: "ID", type: "id", group: "Identificação" },
  { key: "country", label: "País", type: "text", group: "Identificação" },
  { key: "nickname", label: "Apelido", type: "text", group: "Identificação" },
  { key: "memoName", label: "Memorando", type: "text", group: "Identificação" },
  { key: "agentNickname", label: "Agente", type: "text", group: "Identificação" },
  { key: "agentPpPokerId", label: "ID Agente", type: "id", group: "Identificação" },
  { key: "superAgentNickname", label: "Superagente", type: "text", group: "Identificação" },
  { key: "superAgentPpPokerId", label: "ID Super", type: "id", group: "Identificação" },
  // Classificações (J-N)
  { key: "playerWinningsTotal", label: "Ganhos+Eventos", type: "currency", group: "Classificações" },
  { key: "classificationPpsr", label: "PPSR", type: "number", group: "Classificações" },
  { key: "classificationRing", label: "Ring", type: "number", group: "Classificações" },
  { key: "classificationCustomRing", label: "RG Pers.", type: "number", group: "Classificações" },
  { key: "classificationMtt", label: "MTT", type: "number", group: "Classificações" },
  // Ganhos do Jogador (O-X)
  { key: "generalTotal", label: "Geral", type: "currency", group: "Ganhos" },
  { key: "ringGamesTotal", label: "Ring Games", type: "currency", group: "Ganhos" },
  { key: "mttSitNGoTotal", label: "MTT/SitNGo", type: "currency", group: "Ganhos" },
  { key: "spinUpTotal", label: "SPINUP", type: "currency", group: "Ganhos" },
  { key: "caribbeanTotal", label: "Caribbean+", type: "currency", group: "Ganhos" },
  { key: "colorGameTotal", label: "COLOR GAME", type: "currency", group: "Ganhos" },
  { key: "crashTotal", label: "CRASH", type: "currency", group: "Ganhos" },
  { key: "luckyDrawTotal", label: "LUCKY DRAW", type: "currency", group: "Ganhos" },
  { key: "jackpotTotal", label: "Jackpot", type: "currency", group: "Ganhos" },
  { key: "evSplitTotal", label: "Dividir EV", type: "currency", group: "Ganhos" },
  // Tickets (Y-AA)
  { key: "ticketValueWon", label: "Ticket Ganho", type: "currency", group: "Tickets" },
  { key: "ticketBuyIn", label: "Ticket Buy-in", type: "currency", group: "Tickets" },
  { key: "customPrizeValue", label: "Prêmio Pers.", type: "currency", group: "Tickets" },
  // Taxas (AB-AG)
  { key: "feeGeneral", label: "Taxa Geral", type: "currency", group: "Taxas" },
  { key: "fee", label: "Taxa", type: "currency", group: "Taxas" },
  { key: "feePpst", label: "Taxa PPST", type: "currency", group: "Taxas" },
  { key: "feeNonPpst", label: "Taxa não-PPST", type: "currency", group: "Taxas" },
  { key: "feePpsr", label: "Taxa PPSR", type: "currency", group: "Taxas" },
  { key: "feeNonPpsr", label: "Taxa não-PPSR", type: "currency", group: "Taxas" },
  // SPINUP & Caribbean (AH-AK)
  { key: "spinUpBuyIn", label: "SPINUP Buy-in", type: "currency", group: "SPINUP/Caribbean" },
  { key: "spinUpPrize", label: "SPINUP Prêmio", type: "currency", group: "SPINUP/Caribbean" },
  { key: "caribbeanBets", label: "Caribbean Apostas", type: "currency", group: "SPINUP/Caribbean" },
  { key: "caribbeanPrize", label: "Caribbean Prêmio", type: "currency", group: "SPINUP/Caribbean" },
  // Ganhos do Clube (AL-AQ)
  { key: "colorGameBets", label: "COLOR Apostas", type: "currency", group: "Clube" },
  { key: "colorGamePrize", label: "COLOR Prêmio", type: "currency", group: "Clube" },
  { key: "crashBets", label: "CRASH Apostas", type: "currency", group: "Clube" },
  { key: "crashPrize", label: "CRASH Prêmio", type: "currency", group: "Clube" },
  { key: "luckyDrawBets", label: "LUCKY Apostas", type: "currency", group: "Clube" },
  { key: "luckyDrawPrize", label: "LUCKY Prêmio", type: "currency", group: "Clube" },
  // Jackpot e Finais (AR-AV)
  { key: "jackpotFee", label: "Jackpot Taxa", type: "currency", group: "Jackpot" },
  { key: "jackpotPrize", label: "Jackpot Prêmio", type: "currency", group: "Jackpot" },
  { key: "evSplit", label: "Dividir EV", type: "currency", group: "Jackpot" },
  { key: "ticketDeliveredValue", label: "Ticket Entregue", type: "currency", group: "Jackpot" },
  { key: "ticketDeliveredBuyIn", label: "Ticket Buy-in", type: "currency", group: "Jackpot" },
] as const;

export function GeneralTab({ summaries }: GeneralTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (cardId: string) => {
    setExpandedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const filteredData = summaries.filter((s) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.nickname.toLowerCase().includes(query) ||
      s.ppPokerId.includes(query) ||
      s.memoName?.toLowerCase().includes(query) ||
      s.agentNickname?.toLowerCase().includes(query)
    );
  });

  const columns = expanded ? ALL_COLUMNS : SUMMARY_COLUMNS;

  // Calculate totals
  const totalPlayers = summaries.length;
  const isValidId = (id: string | null | undefined) => id && id.trim() !== "" && id.toLowerCase() !== "(none)" && id.toLowerCase() !== "none";
  const uniqueAgents = new Set(summaries.map((s) => s.agentPpPokerId).filter(isValidId));
  const totalAgents = uniqueAgents.size;
  const uniqueSuperAgents = new Set(summaries.map((s) => s.superAgentPpPokerId).filter(isValidId));
  const totalSuperAgents = uniqueSuperAgents.size;
  // J = Ganhos + Eventos (soma de K até O, ou seja: classificações + geral)
  const totalWinnings = summaries.reduce((sum, s) => sum + (s.playerWinningsTotal || 0), 0);
  // Classificações (K-N)
  const totalClassPpsr = summaries.reduce((sum, s) => sum + (s.classificationPpsr || 0), 0);
  const totalClassRing = summaries.reduce((sum, s) => sum + (s.classificationRing || 0), 0);
  const totalClassCustomRing = summaries.reduce((sum, s) => sum + (s.classificationCustomRing || 0), 0);
  const totalClassMtt = summaries.reduce((sum, s) => sum + (s.classificationMtt || 0), 0);
  // O = Geral (soma de P até X: Ring Games, MTT/SitNGo, SPINUP, Caribbean, etc)
  const totalGeneral = summaries.reduce((sum, s) => sum + (s.generalTotal || 0), 0);
  const totalRingGames = summaries.reduce((sum, s) => sum + (s.ringGamesTotal || 0), 0);
  const totalMttSng = summaries.reduce((sum, s) => sum + (s.mttSitNGoTotal || 0), 0);
  const totalSpinUp = summaries.reduce((sum, s) => sum + (s.spinUpTotal || 0), 0);
  const totalCaribbean = summaries.reduce((sum, s) => sum + (s.caribbeanTotal || 0), 0);
  const totalColorGame = summaries.reduce((sum, s) => sum + (s.colorGameTotal || 0), 0);
  const totalCrash = summaries.reduce((sum, s) => sum + (s.crashTotal || 0), 0);
  const totalLuckyDraw = summaries.reduce((sum, s) => sum + (s.luckyDrawTotal || 0), 0);
  const totalJackpot = summaries.reduce((sum, s) => sum + (s.jackpotTotal || 0), 0);
  const totalEvSplit = summaries.reduce((sum, s) => sum + (s.evSplitTotal || 0), 0);
  // Taxa Geral (AB) = soma de AD até AT
  const totalFeeGeral = summaries.reduce((sum, s) => sum + (s.feeGeneral || 0), 0);
  // Taxa Jogos (AC) = soma de feePpst + feeNonPpst + feePpsr + feeNonPpsr
  const totalFeeJogos = summaries.reduce((sum, s) => sum + (s.fee || 0), 0);
  const totalFeePpst = summaries.reduce((sum, s) => sum + (s.feePpst || 0), 0);
  const totalFeeNonPpst = summaries.reduce((sum, s) => sum + (s.feeNonPpst || 0), 0);
  const totalFeePpsr = summaries.reduce((sum, s) => sum + (s.feePpsr || 0), 0);
  const totalFeeNonPpsr = summaries.reduce((sum, s) => sum + (s.feeNonPpsr || 0), 0);

  if (summaries.length === 0) {
    return (
      <p className="text-center text-[#878787] py-8">
        Nenhum dado encontrado na aba Geral
      </p>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Row 1: Cards simples (sem legenda) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Jogadores (B)</p>
          <p className="text-lg font-semibold">{totalPlayers}</p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Agentes (G)</p>
          <p className="text-lg font-semibold">{totalAgents}</p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Superagentes (I)</p>
          <p className="text-lg font-semibold">{totalSuperAgents}</p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Ring Games (P)</p>
          <p className={`text-lg font-semibold font-mono ${totalRingGames >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {totalRingGames.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">MTT/SitNGo (Q)</p>
          <p className={`text-lg font-semibold font-mono ${totalMttSng >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {totalMttSng.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </div>

      {/* Row 2: Cards expansíveis (com legenda) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-start">
        <div
          className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCard("eventos")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Ganhos + Eventos (J)</p>
            <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.eventos ? "rotate-180" : ""}`} />
          </div>
          <p className={`text-lg font-semibold font-mono ${totalWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {totalWinnings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {expandedCards.eventos && (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Classificação PPSR (K)</span>
                <span className={`font-mono ${totalClassPpsr >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalClassPpsr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Classificação Ring Game (L)</span>
                <span className={`font-mono ${totalClassRing >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalClassRing.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Classificação RG Pers. (M)</span>
                <span className={`font-mono ${totalClassCustomRing >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalClassCustomRing.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Classificação MTT (N)</span>
                <span className={`font-mono ${totalClassMtt >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalClassMtt.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>
          )}
        </div>
        <div
          className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCard("geral")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Geral (O)</p>
            <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.geral ? "rotate-180" : ""}`} />
          </div>
          <p className={`text-lg font-semibold font-mono ${totalGeneral >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {totalGeneral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {expandedCards.geral && (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Ring Games (P)</span>
                <span className={`font-mono ${totalRingGames >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalRingGames.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">MTT, SitNGo (Q)</span>
                <span className={`font-mono ${totalMttSng >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalMttSng.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">SPINUP (R)</span>
                <span className={`font-mono ${totalSpinUp >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalSpinUp.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Caribbean+ Poker (S)</span>
                <span className={`font-mono ${totalCaribbean >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalCaribbean.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">COLOR GAME (T)</span>
                <span className={`font-mono ${totalColorGame >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalColorGame.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">CRASH (U)</span>
                <span className={`font-mono ${totalCrash >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalCrash.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">LUCKY DRAW (V)</span>
                <span className={`font-mono ${totalLuckyDraw >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalLuckyDraw.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Jackpot (W)</span>
                <span className={`font-mono ${totalJackpot >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalJackpot.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Dividir EV (X)</span>
                <span className={`font-mono ${totalEvSplit >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {totalEvSplit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>
          )}
        </div>
        <div
          className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCard("taxaGeral")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Taxa Geral (AB)</p>
            <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.taxaGeral ? "rotate-180" : ""}`} />
          </div>
          <p className="text-lg font-semibold font-mono">
            {totalFeeGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {expandedCards.taxaGeral && (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Taxa PPST (AD)</span>
                <span className="font-mono">{totalFeePpst.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Taxa não-PPST (AE)</span>
                <span className="font-mono">{totalFeeNonPpst.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Taxa PPSR (AF)</span>
                <span className="font-mono">{totalFeePpsr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Taxa não-PPSR (AG)</span>
                <span className="font-mono">{totalFeeNonPpsr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            </div>
          )}
        </div>
        <div
          className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCard("taxaJogos")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Taxa Jogos (AC)</p>
            <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.taxaJogos ? "rotate-180" : ""}`} />
          </div>
          <p className="text-lg font-semibold font-mono">
            {totalFeeJogos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {expandedCards.taxaJogos && (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Taxa PPST</span>
                <span className="font-mono">{totalFeePpst.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Taxa não-PPST</span>
                <span className="font-mono">{totalFeeNonPpst.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Taxa PPSR</span>
                <span className="font-mono">{totalFeePpsr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Taxa não-PPSR</span>
                <span className="font-mono">{totalFeeNonPpsr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-[#878787]">{summaries.length} registros</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <Icons.ChevronLeft className="w-4 h-4 mr-1" />
                Resumido ({SUMMARY_COLUMNS.length} cols)
              </>
            ) : (
              <>
                Expandir ({ALL_COLUMNS.length} cols)
                <Icons.ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
        <div className="relative w-64">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#878787]" />
          <Input
            placeholder="Buscar jogador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden pb-2">
        <div className="overflow-x-auto">
          <table className={`w-full text-xs ${expanded ? "min-w-[3000px]" : "min-w-[1400px]"}`}>
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`p-2 font-medium whitespace-nowrap ${
                      col.type === "currency" || col.type === "number"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData.map((row, idx) => (
                <tr key={`${row.ppPokerId}-${idx}`} className="hover:bg-muted/30">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`p-2 whitespace-nowrap ${
                        col.type === "currency" || col.type === "number"
                          ? "text-right font-mono"
                          : col.type === "id"
                          ? "font-mono text-[#878787]"
                          : ""
                      }`}
                    >
                      {formatValue(row[col.key as keyof ParsedSummary], col.type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/50 font-semibold">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`p-2 whitespace-nowrap ${
                      col.type === "currency" || col.type === "number"
                        ? "text-right font-mono"
                        : ""
                    }`}
                  >
                    {col.key === "ppPokerId" ? "TOTAL" :
                     col.key === "nickname" ? `${filteredData.length} jogadores` :
                     col.type === "currency" ? formatValue(
                       filteredData.reduce((sum, row) => sum + ((row[col.key as keyof ParsedSummary] as number) || 0), 0),
                       "currency"
                     ) :
                     col.type === "number" ? formatValue(
                       filteredData.reduce((sum, row) => sum + ((row[col.key as keyof ParsedSummary] as number) || 0), 0),
                       "number"
                     ) : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatValue(
  value: string | number | null | undefined,
  type: string
): string {
  if (value === null || value === undefined) return "-";

  switch (type) {
    case "currency":
      return typeof value === "number"
        ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "-";
    case "number":
      return typeof value === "number" ? value.toLocaleString("pt-BR") : "-";
    case "id":
      return String(value);
    default:
      return String(value) || "-";
  }
}
