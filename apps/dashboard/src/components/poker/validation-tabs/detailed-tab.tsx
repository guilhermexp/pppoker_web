"use client";

import type { ParsedDetailed, ParsedSummary } from "@/lib/poker/types";
import { Badge } from "@midday/ui/badge";
import { Button } from "@midday/ui/button";
import { cn } from "@midday/ui/cn";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { useState } from "react";

type DetailedTabProps = {
  detailed: ParsedDetailed[];
  summaries?: ParsedSummary[];
};

// Game type categories with column ranges
const GAME_CATEGORIES = [
  {
    name: "NLHoldem",
    colRange: "J-R",
    color: "#3B82F6",
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
    color: "#8B5CF6",
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
    color: "#F59E0B",
    games: [
      { key: "flashPlo4", label: "PLO4", col: "AC" },
      { key: "flashPlo5", label: "PLO5", col: "AD" },
    ],
  },
  {
    name: "Outros",
    colRange: "AE-AF",
    color: "#6B7280",
    games: [
      { key: "mixedGame", label: "Mixed Game", col: "AE" },
      { key: "ofc", label: "OFC", col: "AF" },
    ],
  },
  {
    name: "SEKA",
    colRange: "AG-AI",
    color: "#EC4899",
    games: [
      { key: "seka36", label: "36", col: "AG" },
      { key: "seka32", label: "32", col: "AH" },
      { key: "seka21", label: "21", col: "AI" },
    ],
  },
  {
    name: "TEEN PATTI",
    colRange: "AJ-AM",
    color: "#14B8A6",
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
    color: "#EF4444",
    games: [
      { key: "tongits", label: "Tongits", col: "AN" },
      { key: "pusoy", label: "Pusoy", col: "AO" },
    ],
  },
  {
    name: "Cassino",
    colRange: "AP-AU",
    color: "#10B981",
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

// Flat list for counting
const GAME_TYPES = GAME_CATEGORIES.flatMap((cat) =>
  cat.games.map((g) => ({ ...g, group: cat.name, color: cat.color })),
);

// Summary columns
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

// All columns (137 fields)
const ALL_COLUMNS = [
  { key: "date", label: "Data (A)", type: "text", group: "Identificação" },
  { key: "ppPokerId", label: "ID (B)", type: "id", group: "Identificação" },
  { key: "country", label: "País (C)", type: "text", group: "Identificação" },
  {
    key: "nickname",
    label: "Apelido (D)",
    type: "text",
    group: "Identificação",
  },
  {
    key: "memoName",
    label: "Memorando (E)",
    type: "text",
    group: "Identificação",
  },
  {
    key: "agentNickname",
    label: "Agente (F)",
    type: "text",
    group: "Identificação",
  },
  {
    key: "agentPpPokerId",
    label: "ID Agente (G)",
    type: "id",
    group: "Identificação",
  },
  {
    key: "superAgentNickname",
    label: "Superagente (H)",
    type: "text",
    group: "Identificação",
  },
  {
    key: "superAgentPpPokerId",
    label: "ID Super (I)",
    type: "id",
    group: "Identificação",
  },
  { key: "nlhRegular", label: "NLH Reg (J)", type: "currency", group: "NLH" },
  { key: "nlhThreeOne", label: "NLH 3-1 (K)", type: "currency", group: "NLH" },
  {
    key: "nlhThreeOneF",
    label: "NLH 3-1F (L)",
    type: "currency",
    group: "NLH",
  },
  { key: "nlhSixPlus", label: "NLH 6+ (M)", type: "currency", group: "NLH" },
  { key: "nlhAof", label: "NLH AOF (N)", type: "currency", group: "NLH" },
  { key: "nlhSitNGo", label: "NLH SitNGo (O)", type: "currency", group: "NLH" },
  { key: "nlhSpinUp", label: "NLH SpinUp (P)", type: "currency", group: "NLH" },
  { key: "nlhMtt", label: "NLH MTT (Q)", type: "currency", group: "NLH" },
  {
    key: "nlhMttSixPlus",
    label: "NLH MTT 6+ (R)",
    type: "currency",
    group: "NLH",
  },
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
  {
    key: "flashPlo4",
    label: "Flash PLO4 (AC)",
    type: "currency",
    group: "PLO",
  },
  {
    key: "flashPlo5",
    label: "Flash PLO5 (AD)",
    type: "currency",
    group: "PLO",
  },
  { key: "mixedGame", label: "Mixed (AE)", type: "currency", group: "PLO" },
  { key: "ofc", label: "OFC (AF)", type: "currency", group: "Outros" },
  { key: "seka36", label: "36 (AG)", type: "currency", group: "Outros" },
  { key: "seka32", label: "Seka 32 (AH)", type: "currency", group: "Outros" },
  { key: "seka21", label: "Seka 21 (AI)", type: "currency", group: "Outros" },
  {
    key: "teenPattiRegular",
    label: "Teen Patti (AJ)",
    type: "currency",
    group: "Outros",
  },
  {
    key: "teenPattiAk47",
    label: "AK47 (AK)",
    type: "currency",
    group: "Outros",
  },
  {
    key: "teenPattiHukam",
    label: "Hukam (AL)",
    type: "currency",
    group: "Outros",
  },
  {
    key: "teenPattiMuflis",
    label: "Muflis (AM)",
    type: "currency",
    group: "Outros",
  },
  { key: "tongits", label: "Tongits (AN)", type: "currency", group: "Outros" },
  { key: "pusoy", label: "Pusoy (AO)", type: "currency", group: "Outros" },
  {
    key: "caribbean",
    label: "Caribbean (AP)",
    type: "currency",
    group: "Cassino",
  },
  { key: "colorGame", label: "Color (AQ)", type: "currency", group: "Cassino" },
  { key: "crash", label: "Crash (AR)", type: "currency", group: "Cassino" },
  { key: "luckyDraw", label: "Lucky (AS)", type: "currency", group: "Cassino" },
  { key: "jackpot", label: "Jackpot (AT)", type: "currency", group: "Cassino" },
  {
    key: "evSplitWinnings",
    label: "EV Split (AU)",
    type: "currency",
    group: "Cassino",
  },
  {
    key: "totalWinnings",
    label: "Total (AV)",
    type: "currency",
    group: "Totais",
  },
  {
    key: "classificationPpsr",
    label: "PPSR (AW)",
    type: "number",
    group: "Classificações",
  },
  {
    key: "classificationRing",
    label: "Ring (AX)",
    type: "number",
    group: "Classificações",
  },
  {
    key: "classificationCustomRing",
    label: "RG Pers. (AY)",
    type: "number",
    group: "Classificações",
  },
  {
    key: "classificationMtt",
    label: "MTT (AZ)",
    type: "number",
    group: "Classificações",
  },
  {
    key: "generalPlusEvents",
    label: "Ganhos+Eventos (BA)",
    type: "currency",
    group: "Valores",
  },
  {
    key: "ticketValueWon",
    label: "Ticket Ganho (BB)",
    type: "currency",
    group: "Valores",
  },
  {
    key: "ticketBuyIn",
    label: "Ticket Buy-in (BC)",
    type: "currency",
    group: "Valores",
  },
  {
    key: "customPrizeValue",
    label: "Prêmio Pers. (BD)",
    type: "currency",
    group: "Valores",
  },
  {
    key: "feeTotal",
    label: "Taxa Total (CJ)",
    type: "currency",
    group: "Taxas",
  },
  {
    key: "spinUpBuyIn",
    label: "SPINUP Buy-in (CK)",
    type: "currency",
    group: "SPINUP",
  },
  {
    key: "spinUpPrize",
    label: "SPINUP Prêmio (CL)",
    type: "currency",
    group: "SPINUP",
  },
  {
    key: "jackpotFee",
    label: "Jackpot Taxa (CM)",
    type: "currency",
    group: "Jackpot",
  },
  {
    key: "jackpotPrize",
    label: "Jackpot Prêmio (CN)",
    type: "currency",
    group: "Jackpot",
  },
  {
    key: "evSplitNlh",
    label: "EV NLH (CO)",
    type: "currency",
    group: "EV Split",
  },
  {
    key: "evSplitPlo",
    label: "EV PLO (CP)",
    type: "currency",
    group: "EV Split",
  },
  {
    key: "evSplitTotal",
    label: "EV Total (CQ)",
    type: "currency",
    group: "EV Split",
  },
  {
    key: "chipSent",
    label: "Fichas Enviadas (CT)",
    type: "number",
    group: "Fichas",
  },
  {
    key: "chipRedeemed",
    label: "Fichas Resgatadas (CY)",
    type: "number",
    group: "Fichas",
  },
  {
    key: "creditLeftClub",
    label: "Saiu do Clube (CZ)",
    type: "currency",
    group: "Crédito",
  },
  {
    key: "creditSent",
    label: "Crédito Enviado (DA)",
    type: "currency",
    group: "Crédito",
  },
  {
    key: "creditRedeemed",
    label: "Crédito Resgatado (DB)",
    type: "currency",
    group: "Crédito",
  },
  {
    key: "handsTotal",
    label: "Total Mãos (EG)",
    type: "number",
    group: "Mãos",
  },
] as const;

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

export function DetailedTab({ detailed, summaries = [] }: DetailedTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [gameTypesExpanded, setGameTypesExpanded] = useState(false);
  const [showDifference, setShowDifference] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Compare IDs between Geral and Detalhado
  const geralIds = new Set(summaries.map((s) => s.ppPokerId));
  const detailedIds = new Set(detailed.map((d) => d.ppPokerId));
  const onlyInDetailedIds = [...detailedIds].filter((id) => !geralIds.has(id));
  const onlyInDetailed = onlyInDetailedIds.map((id) => {
    const rows = detailed.filter((d) => d.ppPokerId === id);
    const totalWinnings = rows.reduce(
      (sum, r) => sum + (r.totalWinnings || 0),
      0,
    );
    return { ppPokerId: id, nickname: rows[0]?.nickname || "", totalWinnings };
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

  // Calculate totals
  const totalPlayers = detailed.length;
  const totalWinnings = detailed.reduce(
    (sum, d) => sum + (d.totalWinnings || 0),
    0,
  );
  const totalJackpot = detailed.reduce((sum, d) => sum + (d.jackpot || 0), 0);
  const totalEvSplit = detailed.reduce(
    (sum, d) => sum + (d.evSplitWinnings || 0),
    0,
  );
  const totalGeneralPlusEvents = detailed.reduce(
    (sum, d) => sum + (d.generalPlusEvents || 0),
    0,
  );
  const totalTicketWon = detailed.reduce(
    (sum, d) => sum + (d.ticketValueWon || 0),
    0,
  );
  const totalTicketBuyIn = detailed.reduce(
    (sum, d) => sum + (d.ticketBuyIn || 0),
    0,
  );
  const totalSpinUpBuyIn = detailed.reduce(
    (sum, d) => sum + (d.spinUpBuyIn || 0),
    0,
  );
  const totalSpinUpPrize = detailed.reduce(
    (sum, d) => sum + (d.spinUpPrize || 0),
    0,
  );
  const totalJackpotFee = detailed.reduce(
    (sum, d) => sum + (d.jackpotFee || 0),
    0,
  );
  const totalJackpotPrize = detailed.reduce(
    (sum, d) => sum + (d.jackpotPrize || 0),
    0,
  );
  const totalChipSent = detailed.reduce((sum, d) => sum + (d.chipSent || 0), 0);
  const totalChipRedeemed = detailed.reduce(
    (sum, d) => sum + (d.chipRedeemed || 0),
    0,
  );
  const totalCreditLeftClub = detailed.reduce(
    (sum, d) => sum + (d.creditLeftClub || 0),
    0,
  );
  const totalCreditSent = detailed.reduce(
    (sum, d) => sum + (d.creditSent || 0),
    0,
  );
  const totalCreditRedeemed = detailed.reduce(
    (sum, d) => sum + (d.creditRedeemed || 0),
    0,
  );
  const totalHands = detailed.reduce((sum, d) => sum + (d.handsTotal || 0), 0);
  const totalFees = detailed.reduce((sum, d) => sum + (d.feeTotal || 0), 0);
  const totalCreditLeftClub2 = detailed.reduce(
    (sum, d) => sum + (d.creditLeftClub2 || 0),
    0,
  );

  // Count unique agents and super agents
  const isValidId = (id: string | null | undefined) =>
    id &&
    id.trim() !== "" &&
    id.toLowerCase() !== "(none)" &&
    id.toLowerCase() !== "none";
  const uniqueAgents = new Set(
    detailed.map((d) => d.agentPpPokerId).filter(isValidId),
  );
  const uniqueSuperAgents = new Set(
    detailed.map((d) => d.superAgentPpPokerId).filter(isValidId),
  );

  // Count active game types
  const activeGameTypes = GAME_TYPES.filter((gt) =>
    detailed.some((d) => (d[gt.key as keyof ParsedDetailed] as number) !== 0),
  );

  // Players who left the club
  const playersLeftClub = detailed
    .filter((d) => d.creditLeftClub !== 0)
    .map((d) => ({
      id: d.ppPokerId,
      nickname: d.nickname,
      balance: d.creditLeftClub,
    }));

  // Agents who left the club
  const agentsLeftClub = detailed
    .filter((d) => d.creditLeftClub2 !== 0)
    .map((d) => ({
      id: d.agentPpPokerId || d.ppPokerId,
      nickname: d.agentNickname || d.nickname,
      balance: d.creditLeftClub2,
    }));

  if (detailed.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhum dado encontrado na aba Detalhado
      </p>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* Difference Alert */}
      {onlyInDetailed.length > 0 && (
        <div
          className="flex items-center justify-between py-2 px-1 cursor-pointer hover:bg-muted/30 rounded"
          onClick={() => setShowDifference(!showDifference)}
        >
          <div className="flex items-center gap-2">
            <Icons.AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-amber-600">
              {onlyInDetailed.length} ID(s) não encontrado(s) na aba Geral
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              Geral: {geralIds.size} · Detalhado: {detailedIds.size}
            </span>
            <Icons.ChevronDown
              className={cn(
                "w-3 h-3 text-amber-500 transition-transform",
                showDifference && "rotate-180",
              )}
            />
          </div>
        </div>
      )}

      {showDifference && onlyInDetailed.length > 0 && (
        <div className="border-t border-border/40 pt-2 pb-3">
          <div className="max-h-40 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-1 font-medium">ID</th>
                  <th className="text-left py-1 font-medium">Apelido</th>
                  <th className="text-right py-1 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {onlyInDetailed.map((d, idx) => (
                  <tr key={`${d.ppPokerId}-${idx}`}>
                    <td className="py-1 font-mono text-muted-foreground text-[10px]">
                      {d.ppPokerId}
                    </td>
                    <td className="py-1">{d.nickname}</td>
                    <td
                      className={cn(
                        "py-1 text-right font-mono text-[10px]",
                        d.totalWinnings >= 0
                          ? "text-[#00C969]"
                          : "text-[#FF3638]",
                      )}
                    >
                      {formatCurrency(d.totalWinnings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 1: Counters */}
      <div className="flex items-center gap-4 text-xs py-2">
        <span className="text-muted-foreground">
          Jogadores{" "}
          <span className="text-foreground font-medium">{totalPlayers}</span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Agentes{" "}
          <span className="text-foreground font-medium">
            {uniqueAgents.size}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Superagentes{" "}
          <span className="text-foreground font-medium">
            {uniqueSuperAgents.size}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Mãos{" "}
          <span className="text-foreground font-medium">
            {formatNumber(totalHands)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Tipos Ativos{" "}
          <span className="text-foreground font-medium">
            {activeGameTypes.length}
          </span>
        </span>
      </div>

      {/* Row 2: Financial totals */}
      <div className="border-t border-border/40 flex items-center gap-4 text-xs py-2">
        <span className="text-muted-foreground">
          Total{" "}
          <span
            className={cn(
              "font-mono font-medium",
              totalWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
            )}
          >
            {formatCurrency(totalWinnings)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Ganhos+Eventos{" "}
          <span
            className={cn(
              "font-mono font-medium",
              totalGeneralPlusEvents >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
            )}
          >
            {formatCurrency(totalGeneralPlusEvents)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Taxa{" "}
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(totalFees)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Jackpot{" "}
          <span
            className={cn(
              "font-mono font-medium",
              totalJackpot >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
            )}
          >
            {formatCurrency(totalJackpot)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          EV Split{" "}
          <span
            className={cn(
              "font-mono font-medium",
              totalEvSplit >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
            )}
          >
            {formatCurrency(totalEvSplit)}
          </span>
        </span>
      </div>

      {/* Row 3: Secondary financial */}
      <div className="border-t border-border/40 flex items-center gap-4 text-xs py-2">
        <span className="text-muted-foreground">
          SPINUP{" "}
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(totalSpinUpBuyIn + totalSpinUpPrize)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          JP Taxa+Prêmio{" "}
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(totalJackpotFee + totalJackpotPrize)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Ticket Ganho{" "}
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(totalTicketWon)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Ticket Buy-in{" "}
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(totalTicketBuyIn)}
          </span>
        </span>
      </div>

      {/* Row 4: Chips and Credits */}
      <div className="border-t border-border/40 flex items-center gap-4 text-xs py-2">
        <span className="text-muted-foreground">
          Fichas Env.{" "}
          <span className="font-mono font-medium text-foreground">
            {formatNumber(totalChipSent)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Fichas Resg.{" "}
          <span className="font-mono font-medium text-foreground">
            {formatNumber(totalChipRedeemed)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Crédito Env.{" "}
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(totalCreditSent)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Crédito Resg.{" "}
          <span className="font-mono font-medium text-foreground">
            {formatCurrency(totalCreditRedeemed)}
          </span>
        </span>
        {totalCreditLeftClub !== 0 && (
          <>
            <span className="text-border/60">·</span>
            <span className="text-muted-foreground">
              Jog. Saiu{" "}
              <span
                className={cn(
                  "font-mono font-medium",
                  totalCreditLeftClub < 0 ? "text-[#FF3638]" : "text-[#00C969]",
                )}
              >
                {formatCurrency(totalCreditLeftClub)}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">
                ({playersLeftClub.length})
              </span>
            </span>
          </>
        )}
        {totalCreditLeftClub2 !== 0 && (
          <>
            <span className="text-border/60">·</span>
            <span className="text-muted-foreground">
              Ag. Saiu{" "}
              <span
                className={cn(
                  "font-mono font-medium",
                  totalCreditLeftClub2 < 0
                    ? "text-[#FF3638]"
                    : "text-[#00C969]",
                )}
              >
                {formatCurrency(totalCreditLeftClub2)}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">
                ({agentsLeftClub.length})
              </span>
            </span>
          </>
        )}
      </div>

      {/* Row 5: Game categories with colored dots */}
      <div className="border-t border-border/40 py-2">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {GAME_CATEGORIES.map((category) => {
            const categoryTotal = detailed.reduce((sum, d) => {
              return (
                sum +
                category.games.reduce((gameSum, g) => {
                  return (
                    gameSum +
                    ((d[g.key as keyof ParsedDetailed] as number) || 0)
                  );
                }, 0)
              );
            }, 0);
            const activeInCategory = category.games.filter((g) =>
              detailed.some(
                (d) => (d[g.key as keyof ParsedDetailed] as number) !== 0,
              ),
            );
            const isActive = categoryTotal !== 0;
            const isSelected = selectedCategory === category.name;

            return (
              <button
                key={category.name}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedCategory(null);
                    setGameTypesExpanded(false);
                  } else {
                    setSelectedCategory(category.name);
                    setGameTypesExpanded(true);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded transition-colors",
                  isActive ? "hover:bg-muted/50" : "opacity-40",
                  isSelected && "bg-muted/50",
                )}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-muted-foreground">{category.name}</span>
                <span
                  className={cn(
                    "font-mono",
                    categoryTotal >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
                  )}
                >
                  {formatCurrency(categoryTotal)}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  ({activeInCategory.length}/{category.games.length})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded game types detail */}
      {gameTypesExpanded && selectedCategory && (
        <div className="border-t border-border/40 py-2">
          {GAME_CATEGORIES.filter((c) => c.name === selectedCategory).map(
            (category) => (
              <div
                key={category.name}
                className="flex items-center gap-4 flex-wrap text-xs"
              >
                <span className="text-muted-foreground text-[10px] font-medium">
                  {category.name} ({category.colRange}):
                </span>
                {category.games.map((game) => {
                  const gameTotal = detailed.reduce(
                    (sum, d) =>
                      sum +
                      ((d[game.key as keyof ParsedDetailed] as number) || 0),
                    0,
                  );
                  const isActive = gameTotal !== 0;
                  return (
                    <span
                      key={game.key}
                      className={cn(
                        "text-muted-foreground",
                        !isActive && "opacity-40",
                      )}
                    >
                      <span className="text-[9px] font-mono">({game.col})</span>{" "}
                      {game.label}{" "}
                      {isActive && (
                        <span
                          className={cn(
                            "font-mono",
                            gameTotal >= 0
                              ? "text-[#00C969]"
                              : "text-[#FF3638]",
                          )}
                        >
                          {formatCurrency(gameTotal)}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            ),
          )}
        </div>
      )}

      {/* Search and controls */}
      <div className="border-t border-border/40 flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {detailed.length} registros
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 px-2 text-xs"
          >
            {expanded ? (
              <>
                <Icons.ChevronLeft className="w-3 h-3 mr-1" />
                Resumido ({SUMMARY_COLUMNS.length})
              </>
            ) : (
              <>
                Expandir ({ALL_COLUMNS.length})
                <Icons.ChevronRight className="w-3 h-3 ml-1" />
              </>
            )}
          </Button>
        </div>
        <div className="relative w-48">
          <Icons.Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar jogador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
      </div>

      {/* Data table */}
      <div className="border-t border-border/40 pt-2 pb-4">
        <div className="overflow-x-auto">
          <table
            className={cn(
              "w-full text-xs",
              expanded ? "min-w-[4000px]" : "min-w-[1000px]",
            )}
          >
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "py-1.5 px-2 font-medium whitespace-nowrap",
                      col.type === "currency" || col.type === "number"
                        ? "text-right"
                        : "text-left",
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredData.map((row, idx) => (
                <tr
                  key={`${row.ppPokerId}-${idx}`}
                  className="hover:bg-muted/30"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "py-1.5 px-2 whitespace-nowrap",
                        col.type === "currency" || col.type === "number"
                          ? "text-right font-mono"
                          : "",
                        col.type === "id" &&
                          "font-mono text-muted-foreground text-[10px]",
                      )}
                    >
                      {formatValue(
                        row[col.key as keyof ParsedDetailed],
                        col.type,
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-medium bg-muted/30">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "py-1.5 px-2 whitespace-nowrap",
                      col.type === "currency" || col.type === "number"
                        ? "text-right font-mono"
                        : "",
                    )}
                  >
                    {col.key === "ppPokerId"
                      ? "TOTAL"
                      : col.key === "nickname"
                        ? `${filteredData.length} jog.`
                        : col.type === "currency"
                          ? formatValue(
                              filteredData.reduce(
                                (sum, row) =>
                                  sum +
                                  ((row[
                                    col.key as keyof ParsedDetailed
                                  ] as number) || 0),
                                0,
                              ),
                              "currency",
                            )
                          : col.type === "number"
                            ? formatValue(
                                filteredData.reduce(
                                  (sum, row) =>
                                    sum +
                                    ((row[
                                      col.key as keyof ParsedDetailed
                                    ] as number) || 0),
                                  0,
                                ),
                                "number",
                              )
                            : ""}
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
  type: string,
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
