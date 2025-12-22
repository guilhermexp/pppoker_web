"use client";

import type { ParsedDetailed, ParsedSummary } from "@/lib/poker/types";
import { Badge } from "@midday/ui/badge";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { useState } from "react";

type DetailedTabProps = {
  detailed: ParsedDetailed[];
  summaries?: ParsedSummary[];
};

// Game type categories with column ranges (organized like spreadsheet)
const GAME_CATEGORIES = [
  {
    name: "NLHoldem",
    colRange: "J-R",
    games: [
      { key: "nlhRegular", label: "Regular", col: "J" },
      { key: "nlhThreeOne", label: "3-1", col: "K" },
      { key: "nlhThreeOneF", label: "3-1F", col: "L" },
      { key: "nlhSixPlus", label: "6+", col: "M" },
      { key: "nlhAof", label: "AOF", col: "N" },
      { key: "nlhSitNGo", label: "SitNGo", col: "O" },
      { key: "nlhSpinUp", label: "SPINUP", col: "P" },
      { key: "nlhMtt", label: "MTT", col: "Q" },
      { key: "nlhMttSixPlus", label: "MTT 6+", col: "R" },
    ],
  },
  {
    name: "PLO",
    colRange: "S-AB",
    games: [
      { key: "plo4", label: "PLO4", col: "S" },
      { key: "plo5", label: "PLO5", col: "T" },
      { key: "plo6", label: "PLO6", col: "U" },
      { key: "plo4Hilo", label: "PLO4 H/L", col: "V" },
      { key: "plo5Hilo", label: "PLO5 H/L", col: "W" },
      { key: "plo6Hilo", label: "PLO6 H/L", col: "X" },
      { key: "ploSitNGo", label: "SitNGo", col: "Y" },
      { key: "ploMttPlo4", label: "MTT PLO4", col: "Z" },
      { key: "ploMttPlo5", label: "MTT PLO5", col: "AA" },
      { key: "ploNlh", label: "PLO NLH", col: "AB" },
    ],
  },
  {
    name: "FLASH",
    colRange: "AC-AD",
    games: [
      { key: "flashPlo4", label: "PLO4", col: "AC" },
      { key: "flashPlo5", label: "PLO5", col: "AD" },
    ],
  },
  {
    name: "Outros",
    colRange: "AE-AF",
    games: [
      { key: "mixedGame", label: "Mixed Game", col: "AE" },
      { key: "ofc", label: "OFC", col: "AF" },
    ],
  },
  {
    name: "SEKA",
    colRange: "AG-AI",
    games: [
      { key: "seka36", label: "36", col: "AG" },
      { key: "seka32", label: "32", col: "AH" },
      { key: "seka21", label: "21", col: "AI" },
    ],
  },
  {
    name: "TEEN PATTI",
    colRange: "AJ-AM",
    games: [
      { key: "teenPattiRegular", label: "Regular", col: "AJ" },
      { key: "teenPattiAk47", label: "AK47", col: "AK" },
      { key: "teenPattiHukam", label: "Hukam", col: "AL" },
      { key: "teenPattiMuflis", label: "Muflis", col: "AM" },
    ],
  },
  {
    name: "Filipinos",
    colRange: "AN-AO",
    games: [
      { key: "tongits", label: "Tongits", col: "AN" },
      { key: "pusoy", label: "Pusoy", col: "AO" },
    ],
  },
  {
    name: "Cassino",
    colRange: "AP-AU",
    games: [
      { key: "caribbean", label: "Caribbean+", col: "AP" },
      { key: "colorGame", label: "Color Game", col: "AQ" },
      { key: "crash", label: "Crash", col: "AR" },
      { key: "luckyDraw", label: "Lucky Draw", col: "AS" },
      { key: "jackpot", label: "Jackpot", col: "AT" },
      { key: "evSplitWinnings", label: "Dividir EV", col: "AU" },
    ],
  },
] as const;

// Flat list for counting (derived from categories)
const GAME_TYPES = GAME_CATEGORIES.flatMap((cat) =>
  cat.games.map((g) => ({ ...g, group: cat.name }))
);

// Colunas resumidas - principais métricas
const SUMMARY_COLUMNS = [
  { key: "ppPokerId", label: "ID (B)", type: "id" },
  { key: "nickname", label: "Apelido (D)", type: "text" },
  { key: "agentNickname", label: "Agente (F)", type: "text" },
  { key: "totalWinnings", label: "Total (AV)", type: "currency" },
  { key: "generalPlusEvents", label: "Ganhos+Eventos (BA)", type: "currency" },
  { key: "jackpot", label: "Jackpot (AT)", type: "currency" },
  { key: "evSplitWinnings", label: "Dividir EV (AU)", type: "currency" },
  { key: "feeTotal", label: "Taxa Total (CJ)", type: "currency" },
  { key: "handsTotal", label: "Mãos (EG)", type: "number" },
] as const;

// Todas as colunas (137 campos - A até EG)
const ALL_COLUMNS = [
  // Identificação (A-I)
  { key: "date", label: "Data (A)", type: "text", group: "Identificação" },
  { key: "ppPokerId", label: "ID (B)", type: "id", group: "Identificação" },
  { key: "country", label: "País (C)", type: "text", group: "Identificação" },
  { key: "nickname", label: "Apelido (D)", type: "text", group: "Identificação" },
  { key: "memoName", label: "Memorando (E)", type: "text", group: "Identificação" },
  { key: "agentNickname", label: "Agente (F)", type: "text", group: "Identificação" },
  { key: "agentPpPokerId", label: "ID Agente (G)", type: "id", group: "Identificação" },
  { key: "superAgentNickname", label: "Superagente (H)", type: "text", group: "Identificação" },
  { key: "superAgentPpPokerId", label: "ID Super (I)", type: "id", group: "Identificação" },
  // NLH (J-R)
  { key: "nlhRegular", label: "NLH Reg (J)", type: "currency", group: "NLH" },
  { key: "nlhThreeOne", label: "NLH 3-1 (K)", type: "currency", group: "NLH" },
  { key: "nlhThreeOneF", label: "NLH 3-1F (L)", type: "currency", group: "NLH" },
  { key: "nlhSixPlus", label: "NLH 6+ (M)", type: "currency", group: "NLH" },
  { key: "nlhAof", label: "NLH AOF (N)", type: "currency", group: "NLH" },
  { key: "nlhSitNGo", label: "NLH SitNGo (O)", type: "currency", group: "NLH" },
  { key: "nlhSpinUp", label: "NLH SpinUp (P)", type: "currency", group: "NLH" },
  { key: "nlhMtt", label: "NLH MTT (Q)", type: "currency", group: "NLH" },
  { key: "nlhMttSixPlus", label: "NLH MTT 6+ (R)", type: "currency", group: "NLH" },
  // PLO (S-AE)
  { key: "plo4", label: "PLO4 (S)", type: "currency", group: "PLO" },
  { key: "plo5", label: "PLO5 (T)", type: "currency", group: "PLO" },
  { key: "plo6", label: "PLO6 (U)", type: "currency", group: "PLO" },
  { key: "plo4Hilo", label: "PLO4 H/L (V)", type: "currency", group: "PLO" },
  { key: "plo5Hilo", label: "PLO5 H/L (W)", type: "currency", group: "PLO" },
  { key: "plo6Hilo", label: "PLO6 H/L (X)", type: "currency", group: "PLO" },
  { key: "ploSitNGo", label: "PLO SitNGo (Y)", type: "currency", group: "PLO" },
  { key: "ploMttPlo4", label: "MTT PLO4 (Z)", type: "currency", group: "PLO" },
  { key: "ploMttPlo5", label: "MTT PLO5 (AA)", type: "currency", group: "PLO" },
  { key: "ploNlh", label: "PLO NLH (AB)", type: "currency", group: "PLO" },
  { key: "flashPlo4", label: "Flash PLO4 (AC)", type: "currency", group: "PLO" },
  { key: "flashPlo5", label: "Flash PLO5 (AD)", type: "currency", group: "PLO" },
  { key: "mixedGame", label: "Mixed (AE)", type: "currency", group: "PLO" },
  // Outros jogos (AF-AO)
  { key: "ofc", label: "OFC (AF)", type: "currency", group: "Outros" },
  { key: "seka36", label: "36 (AG)", type: "currency", group: "Outros" },
  { key: "seka32", label: "Seka 32 (AH)", type: "currency", group: "Outros" },
  { key: "seka21", label: "Seka 21 (AI)", type: "currency", group: "Outros" },
  { key: "teenPattiRegular", label: "Teen Patti (AJ)", type: "currency", group: "Outros" },
  { key: "teenPattiAk47", label: "AK47 (AK)", type: "currency", group: "Outros" },
  { key: "teenPattiHukam", label: "Hukam (AL)", type: "currency", group: "Outros" },
  { key: "teenPattiMuflis", label: "Muflis (AM)", type: "currency", group: "Outros" },
  { key: "tongits", label: "Tongits (AN)", type: "currency", group: "Outros" },
  { key: "pusoy", label: "Pusoy (AO)", type: "currency", group: "Outros" },
  // Cassino (AP-AU)
  { key: "caribbean", label: "Caribbean (AP)", type: "currency", group: "Cassino" },
  { key: "colorGame", label: "Color (AQ)", type: "currency", group: "Cassino" },
  { key: "crash", label: "Crash (AR)", type: "currency", group: "Cassino" },
  { key: "luckyDraw", label: "Lucky (AS)", type: "currency", group: "Cassino" },
  { key: "jackpot", label: "Jackpot (AT)", type: "currency", group: "Cassino" },
  { key: "evSplitWinnings", label: "EV Split (AU)", type: "currency", group: "Cassino" },
  // Totais (AV)
  { key: "totalWinnings", label: "Total (AV)", type: "currency", group: "Totais" },
  // Classificações (AW-AZ)
  { key: "classificationPpsr", label: "PPSR (AW)", type: "number", group: "Classificações" },
  { key: "classificationRing", label: "Ring (AX)", type: "number", group: "Classificações" },
  { key: "classificationCustomRing", label: "RG Pers. (AY)", type: "number", group: "Classificações" },
  { key: "classificationMtt", label: "MTT (AZ)", type: "number", group: "Classificações" },
  // Valores Gerais (BA-BD)
  { key: "generalPlusEvents", label: "Ganhos+Eventos (BA)", type: "currency", group: "Valores" },
  { key: "ticketValueWon", label: "Ticket Ganho (BB)", type: "currency", group: "Valores" },
  { key: "ticketBuyIn", label: "Ticket Buy-in (BC)", type: "currency", group: "Valores" },
  { key: "customPrizeValue", label: "Prêmio Pers. (BD)", type: "currency", group: "Valores" },
  // Taxa Total (CJ)
  { key: "feeTotal", label: "Taxa Total (CJ)", type: "currency", group: "Taxas" },
  // SPINUP (CK-CL)
  { key: "spinUpBuyIn", label: "SPINUP Buy-in (CK)", type: "currency", group: "SPINUP" },
  { key: "spinUpPrize", label: "SPINUP Prêmio (CL)", type: "currency", group: "SPINUP" },
  // Jackpot (CM-CN)
  { key: "jackpotFee", label: "Jackpot Taxa (CM)", type: "currency", group: "Jackpot" },
  { key: "jackpotPrize", label: "Jackpot Prêmio (CN)", type: "currency", group: "Jackpot" },
  // EV Split (CO-CQ)
  { key: "evSplitNlh", label: "EV NLH (CO)", type: "currency", group: "EV Split" },
  { key: "evSplitPlo", label: "EV PLO (CP)", type: "currency", group: "EV Split" },
  { key: "evSplitTotal", label: "EV Total (CQ)", type: "currency", group: "EV Split" },
  // Fichas (CT, CY)
  { key: "chipSent", label: "Fichas Enviadas (CT)", type: "number", group: "Fichas" },
  { key: "chipRedeemed", label: "Fichas Resgatadas (CY)", type: "number", group: "Fichas" },
  // Crédito (CZ-DB)
  { key: "creditLeftClub", label: "Saiu do Clube (CZ)", type: "currency", group: "Crédito" },
  { key: "creditSent", label: "Crédito Enviado (DA)", type: "currency", group: "Crédito" },
  { key: "creditRedeemed", label: "Crédito Resgatado (DB)", type: "currency", group: "Crédito" },
  // Mãos Total (EG)
  { key: "handsTotal", label: "Total Mãos (EG)", type: "number", group: "Mãos" },
] as const;

export function DetailedTab({ detailed, summaries = [] }: DetailedTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [gameTypesExpanded, setGameTypesExpanded] = useState(false);
  const [showDifference, setShowDifference] = useState(false);

  // Compare IDs between Geral (summaries) and Detalhado (detailed)
  const geralIds = new Set(summaries.map((s) => s.ppPokerId));
  const detailedIds = new Set(detailed.map((d) => d.ppPokerId));

  // Get unique IDs only in Detalhado (not in Geral)
  const onlyInDetailedIds = [...detailedIds].filter((id) => !geralIds.has(id));
  const onlyInDetailed = onlyInDetailedIds.map((id) => {
    const rows = detailed.filter((d) => d.ppPokerId === id);
    // Aggregate totals for the same player across all dates
    const totalWinnings = rows.reduce((sum, r) => sum + (r.totalWinnings || 0), 0);
    return {
      ppPokerId: id,
      nickname: rows[0]?.nickname || "",
      totalWinnings,
    };
  });

  const filteredData = detailed.filter((row) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.nickname.toLowerCase().includes(query) ||
      row.ppPokerId.includes(query) ||
      row.memoName?.toLowerCase().includes(query) ||
      row.agentNickname?.toLowerCase().includes(query)
    );
  });

  const columns = expanded ? ALL_COLUMNS : SUMMARY_COLUMNS;

  // Calculate totals for summary cards
  const totalPlayers = detailed.length;
  const totalWinnings = detailed.reduce((sum, d) => sum + (d.totalWinnings || 0), 0);
  const totalJackpot = detailed.reduce((sum, d) => sum + (d.jackpot || 0), 0);
  const totalEvSplit = detailed.reduce((sum, d) => sum + (d.evSplitWinnings || 0), 0);
  const totalGeneralPlusEvents = detailed.reduce((sum, d) => sum + (d.generalPlusEvents || 0), 0);
  const totalTicketWon = detailed.reduce((sum, d) => sum + (d.ticketValueWon || 0), 0);
  const totalTicketBuyIn = detailed.reduce((sum, d) => sum + (d.ticketBuyIn || 0), 0);
  const totalSpinUpBuyIn = detailed.reduce((sum, d) => sum + (d.spinUpBuyIn || 0), 0);
  const totalSpinUpPrize = detailed.reduce((sum, d) => sum + (d.spinUpPrize || 0), 0);
  const totalJackpotFee = detailed.reduce((sum, d) => sum + (d.jackpotFee || 0), 0);
  const totalJackpotPrize = detailed.reduce((sum, d) => sum + (d.jackpotPrize || 0), 0);
  const totalChipSent = detailed.reduce((sum, d) => sum + (d.chipSent || 0), 0);
  const totalChipRedeemed = detailed.reduce((sum, d) => sum + (d.chipRedeemed || 0), 0);
  const totalCreditLeftClub = detailed.reduce((sum, d) => sum + (d.creditLeftClub || 0), 0);
  const totalCreditSent = detailed.reduce((sum, d) => sum + (d.creditSent || 0), 0);
  const totalCreditRedeemed = detailed.reduce((sum, d) => sum + (d.creditRedeemed || 0), 0);
  const totalHands = detailed.reduce((sum, d) => sum + (d.handsTotal || 0), 0);
  const totalFees = detailed.reduce((sum, d) => sum + (d.feeTotal || 0), 0);

  // Players who left the club with balance (CZ)
  const playersLeftClub = detailed
    .filter((d) => d.creditLeftClub !== 0)
    .map((d) => ({
      id: d.ppPokerId,
      nickname: d.nickname,
      balance: d.creditLeftClub,
    }));

  // Agents who left the club with credits (DC)
  const agentsLeftClub = detailed
    .filter((d) => d.creditLeftClub2 !== 0)
    .map((d) => ({
      id: d.agentPpPokerId || d.ppPokerId,
      nickname: d.agentNickname || d.nickname,
      balance: d.creditLeftClub2,
    }));

  // Total for DC column
  const totalCreditLeftClub2 = detailed.reduce((sum, d) => sum + (d.creditLeftClub2 || 0), 0);

  // Count active game types
  const activeGameTypes = GAME_TYPES.filter((gt) =>
    detailed.some((d) => (d[gt.key as keyof ParsedDetailed] as number) !== 0)
  );

  // Count unique agents and super agents (filter out "(none)" values)
  const isValidId = (id: string | null | undefined) =>
    id && id.trim() !== "" && id.toLowerCase() !== "(none)" && id.toLowerCase() !== "none";
  const uniqueAgents = new Set(
    detailed.map((d) => d.agentPpPokerId).filter(isValidId)
  );
  const uniqueSuperAgents = new Set(
    detailed.map((d) => d.superAgentPpPokerId).filter(isValidId)
  );

  if (detailed.length === 0) {
    return (
      <p className="text-center text-[#878787] py-8">
        Nenhum dado encontrado na aba Detalhado
      </p>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Difference Alert - Show only if there are IDs in Detalhado not in Geral */}
      {onlyInDetailed.length > 0 && (
        <div className="border rounded-lg bg-amber-500/10 border-amber-500/30 p-3">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowDifference(!showDifference)}
          >
            <div className="flex items-center gap-2">
              <Icons.AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-600">
                IDs não encontrados na aba Geral
              </span>
              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600">
                {onlyInDetailed.length} jogador(es)
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Geral: {geralIds.size} | Detalhado: {detailedIds.size} IDs únicos
              </span>
              <Icons.ChevronDown className={`w-4 h-4 text-amber-500 transition-transform ${showDifference ? "rotate-180" : ""}`} />
            </div>
          </div>

          {showDifference && (
            <div className="mt-3 pt-3 border-t border-amber-500/20">
              <div className="border rounded-lg bg-background p-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Estes jogadores aparecem na aba Detalhado mas não na aba Geral:
                </p>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 font-medium">ID</th>
                        <th className="text-left py-1 font-medium">Apelido</th>
                        <th className="text-right py-1 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {onlyInDetailed.map((d, idx) => (
                        <tr key={`${d.ppPokerId}-${idx}`}>
                          <td className="py-1 font-mono text-muted-foreground">{d.ppPokerId}</td>
                          <td className="py-1">{d.nickname}</td>
                          <td className={`py-1 text-right font-mono ${d.totalWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                            {d.totalWinnings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Jogadores (B)</p>
          <p className="text-lg font-semibold">{totalPlayers}</p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Agentes (G)</p>
          <p className="text-lg font-semibold">{uniqueAgents.size}</p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Superagentes (I)</p>
          <p className="text-lg font-semibold">{uniqueSuperAgents.size}</p>
        </div>
        <div
          className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setGameTypesExpanded(!gameTypesExpanded)}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Tipos de Jogos (J-AU)</p>
            <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${gameTypesExpanded ? "rotate-180" : ""}`} />
          </div>
          <p className="text-lg font-semibold">{activeGameTypes.length}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {activeGameTypes.length > 0 ? "Clique para ver detalhes" : "Nenhum tipo ativo"}
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Total Ganhos (AV)</p>
          <p className={`text-lg font-semibold font-mono ${totalWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {totalWinnings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Ganhos+Eventos (BA)</p>
          <p className={`text-lg font-semibold font-mono ${totalGeneralPlusEvents >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {totalGeneralPlusEvents.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Jackpot (AT)</p>
          <p className={`text-lg font-semibold font-mono ${totalJackpot >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {totalJackpot.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Dividir EV (AU)</p>
          <p className={`text-lg font-semibold font-mono ${totalEvSplit >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {totalEvSplit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </div>

      {/* Expanded Game Types Panel */}
      {gameTypesExpanded && (
        <div className="border rounded-lg bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">Ganhos do Jogador por Tipo de Jogo</h4>
              <span className="text-xs text-muted-foreground font-mono">(Colunas J-AU)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGameTypesExpanded(false)}
              className="h-6 px-2"
            >
              <Icons.Close className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {GAME_CATEGORIES.map((category) => {
              const activeInCategory = category.games.filter((g) =>
                detailed.some((d) => (d[g.key as keyof ParsedDetailed] as number) !== 0)
              );
              const categoryTotal = detailed.reduce((sum, d) => {
                return sum + category.games.reduce((gameSum, g) => {
                  return gameSum + ((d[g.key as keyof ParsedDetailed] as number) || 0);
                }, 0);
              }, 0);

              return (
                <div key={category.name} className="border rounded-lg bg-background p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium">{category.name}</p>
                    <span className="text-[9px] text-muted-foreground font-mono">({category.colRange})</span>
                  </div>
                  <p className={`text-sm font-semibold font-mono mb-1.5 ${categoryTotal >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                    {categoryTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <div className="space-y-0.5 max-h-24 overflow-y-auto">
                    {category.games.map((game) => {
                      const gameTotal = detailed.reduce((sum, d) => sum + ((d[game.key as keyof ParsedDetailed] as number) || 0), 0);
                      const isActive = gameTotal !== 0;
                      return (
                        <div
                          key={game.key}
                          className={`flex items-center justify-between text-[9px] gap-1 ${isActive ? "" : "opacity-40"}`}
                        >
                          <span className="text-muted-foreground truncate">
                            <span className="font-mono text-[8px]">({game.col})</span> {game.label}
                          </span>
                          {isActive && (
                            <span className={`font-mono text-[8px] whitespace-nowrap ${gameTotal >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                              {gameTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[8px] text-muted-foreground mt-1 pt-1 border-t border-border/50">
                    {activeInCategory.length}/{category.games.length} ativos
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Taxa Total (CJ)</p>
          <p className="text-lg font-semibold font-mono">
            {totalFees.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">SPINUP (CK+CL)</p>
          <p className="text-lg font-semibold font-mono">
            {(totalSpinUpBuyIn + totalSpinUpPrize).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Buy-in + Premiação
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Jackpot (CM+CN)</p>
          <p className="text-lg font-semibold font-mono">
            {(totalJackpotFee + totalJackpotPrize).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Taxa + Premiação
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Ticket Ganho (BB)</p>
          <p className="text-lg font-semibold font-mono">
            {totalTicketWon.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Ticket Buy-in (BC)</p>
          <p className="text-lg font-semibold font-mono">
            {totalTicketBuyIn.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Mãos Total (EG)</p>
          <p className="text-lg font-semibold font-mono">
            {totalHands.toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Summary Cards - Row 3 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Fichas Enviadas (CT)</p>
          <p className="text-lg font-semibold font-mono">
            {totalChipSent.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Fichas Resgatadas (CY)</p>
          <p className="text-lg font-semibold font-mono">
            {totalChipRedeemed.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Jogadores - Saiu (CZ)</p>
          <p className="text-lg font-semibold font-mono">
            {totalCreditLeftClub.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {playersLeftClub.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-border/50">
              <p className="text-[9px] text-muted-foreground mb-1">{playersLeftClub.length} jogador(es):</p>
              <div className="max-h-16 overflow-y-auto space-y-0.5">
                {playersLeftClub.map((p) => (
                  <p key={p.id} className="text-[9px] text-muted-foreground truncate" title={`${p.id} - ${p.nickname}`}>
                    <span className="font-mono">{p.id}</span> {p.nickname}: <span className="font-mono text-[#FF3638]">{p.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Agentes - Saiu (DC)</p>
          <p className="text-lg font-semibold font-mono">
            {totalCreditLeftClub2.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {agentsLeftClub.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-border/50">
              <p className="text-[9px] text-muted-foreground mb-1">{agentsLeftClub.length} agente(s):</p>
              <div className="max-h-16 overflow-y-auto space-y-0.5">
                {agentsLeftClub.map((a, idx) => (
                  <p key={`${a.id}-${idx}`} className="text-[9px] text-muted-foreground truncate" title={`${a.id} - ${a.nickname}`}>
                    <span className="font-mono">{a.id}</span> {a.nickname}: <span className="font-mono text-[#FF3638]">{a.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Crédito Enviado (DA)</p>
          <p className="text-lg font-semibold font-mono">
            {totalCreditSent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Crédito Resgatado (DB)</p>
          <p className="text-lg font-semibold font-mono">
            {totalCreditRedeemed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-[#878787]">{detailed.length} registros</p>
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
          <table className={`w-full text-xs ${expanded ? "min-w-[4000px]" : "min-w-[1200px]"}`}>
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
                      {formatValue(row[col.key as keyof ParsedDetailed], col.type)}
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
                       filteredData.reduce((sum, row) => sum + ((row[col.key as keyof ParsedDetailed] as number) || 0), 0),
                       "currency"
                     ) :
                     col.type === "number" ? formatValue(
                       filteredData.reduce((sum, row) => sum + ((row[col.key as keyof ParsedDetailed] as number) || 0), 0),
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
