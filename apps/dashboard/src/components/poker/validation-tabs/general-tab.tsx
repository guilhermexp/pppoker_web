"use client";

import type { ParsedSummary } from "@/lib/poker/types";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midday/ui/table";
import { useState } from "react";

type GeneralTabProps = {
  summaries: ParsedSummary[];
};

// Grupos de colunas com cores (apenas headers coloridos)
// Nota: Coluna A é data/período (célula mesclada), dados começam na coluna B
const COLUMN_GROUPS = {
  identificacao: {
    label: "Identificação",
    cols: 8, // B-I (ID, País, Apelido, Memorando, Agente, ID Agente, Superagente, ID Super)
    bgHeader: "bg-slate-500/10",
    textHeader: "text-slate-600 dark:text-slate-400",
  },
  classificacoes: {
    label: "Classificações",
    cols: 5, // J-N (Ganhos+Eventos, PPSR, Ring, RG Pers., MTT)
    bgHeader: "bg-amber-500/10",
    textHeader: "text-amber-600 dark:text-amber-400",
  },
  ganhosJogador: {
    label: "Ganhos do Jogador",
    cols: 10, // O-X (Geral, Ring Games, MTT/SitNGo, SPINUP, Caribbean+, COLOR, CRASH, LUCKY, Jackpot, Dividir EV)
    bgHeader: "bg-red-500/10",
    textHeader: "text-red-600 dark:text-red-400",
  },
  tickets: {
    label: "Tickets",
    cols: 3, // Y-AA (Ticket Ganho, Ticket Buy-in, Prêmio Pers.)
    bgHeader: "bg-blue-500/10",
    textHeader: "text-blue-600 dark:text-blue-400",
  },
  taxas: {
    label: "Taxas",
    cols: 6, // AB-AG (Taxa Geral, Taxa, Taxa PPST, Taxa não-PPST, Taxa PPSR, Taxa não-PPSR)
    bgHeader: "bg-green-500/10",
    textHeader: "text-green-600 dark:text-green-400",
  },
  spinupCaribbean: {
    label: "SPINUP & Caribbean",
    cols: 4, // AH-AK (SPINUP Buy-in, SPINUP Prêmio, Caribbean Apostas, Caribbean Prêmio)
    bgHeader: "bg-purple-500/10",
    textHeader: "text-purple-600 dark:text-purple-400",
  },
  ganhosClubeJogos: {
    label: "Ganhos Clube (Jogos)",
    cols: 6, // AL-AQ (COLOR Apostas/Prêmio, CRASH Apostas/Prêmio, LUCKY Apostas/Prêmio)
    bgHeader: "bg-cyan-500/10",
    textHeader: "text-cyan-600 dark:text-cyan-400",
  },
  jackpotFinal: {
    label: "Jackpot & Final",
    cols: 5, // AR-AV (Jackpot Taxa, Jackpot Prêmio, Dividir EV, Ticket Entregue, Ticket Buy-in)
    bgHeader: "bg-pink-500/10",
    textHeader: "text-pink-600 dark:text-pink-400",
  },
};

// Todas as colunas (47 campos - B até AV, coluna A é data/período)
const ALL_COLUMNS = [
  // Identificação (B-I) - 8 colunas
  { key: "ppPokerId", label: "ID", col: "B", type: "id", group: "identificacao" },
  { key: "country", label: "País", col: "C", type: "text", group: "identificacao" },
  { key: "nickname", label: "Apelido", col: "D", type: "text", group: "identificacao" },
  { key: "memoName", label: "Memorando", col: "E", type: "text", group: "identificacao" },
  { key: "agentNickname", label: "Agente", col: "F", type: "text", group: "identificacao" },
  { key: "agentPpPokerId", label: "ID Agente", col: "G", type: "id", group: "identificacao" },
  { key: "superAgentNickname", label: "Superagente", col: "H", type: "text", group: "identificacao" },
  { key: "superAgentPpPokerId", label: "ID Super", col: "I", type: "id", group: "identificacao" },
  // Classificações (J-N) - 5 colunas
  { key: "playerWinningsTotal", label: "Ganhos+Eventos", col: "J", type: "currency", group: "classificacoes" },
  { key: "classificationPpsr", label: "PPSR", col: "K", type: "currency", group: "classificacoes" },
  { key: "classificationRing", label: "Ring", col: "L", type: "currency", group: "classificacoes" },
  { key: "classificationCustomRing", label: "RG Pers.", col: "M", type: "currency", group: "classificacoes" },
  { key: "classificationMtt", label: "MTT", col: "N", type: "currency", group: "classificacoes" },
  // Ganhos do Jogador (O-X) - 10 colunas
  { key: "generalTotal", label: "Geral", col: "O", type: "currency", group: "ganhosJogador" },
  { key: "ringGamesTotal", label: "Ring Games", col: "P", type: "currency", group: "ganhosJogador" },
  { key: "mttSitNGoTotal", label: "MTT/SitNGo", col: "Q", type: "currency", group: "ganhosJogador" },
  { key: "spinUpTotal", label: "SPINUP", col: "R", type: "currency", group: "ganhosJogador" },
  { key: "caribbeanTotal", label: "Caribbean+", col: "S", type: "currency", group: "ganhosJogador" },
  { key: "colorGameTotal", label: "COLOR", col: "T", type: "currency", group: "ganhosJogador" },
  { key: "crashTotal", label: "CRASH", col: "U", type: "currency", group: "ganhosJogador" },
  { key: "luckyDrawTotal", label: "LUCKY", col: "V", type: "currency", group: "ganhosJogador" },
  { key: "jackpotTotal", label: "Jackpot", col: "W", type: "currency", group: "ganhosJogador" },
  { key: "evSplitTotal", label: "Dividir EV", col: "X", type: "currency", group: "ganhosJogador" },
  // Tickets (Y-AA) - 3 colunas
  { key: "ticketValueWon", label: "Ticket Ganho", col: "Y", type: "currency", group: "tickets" },
  { key: "ticketBuyIn", label: "Ticket Buy-in", col: "Z", type: "currency", group: "tickets" },
  { key: "customPrizeValue", label: "Prêmio Pers.", col: "AA", type: "currency", group: "tickets" },
  // Taxas (AB-AG) - 6 colunas
  { key: "feeGeneral", label: "Taxa Geral", col: "AB", type: "currency", group: "taxas" },
  { key: "fee", label: "Taxa", col: "AC", type: "currency", group: "taxas" },
  { key: "feePpst", label: "Taxa PPST", col: "AD", type: "currency", group: "taxas" },
  { key: "feeNonPpst", label: "Taxa não-PPST", col: "AE", type: "currency", group: "taxas" },
  { key: "feePpsr", label: "Taxa PPSR", col: "AF", type: "currency", group: "taxas" },
  { key: "feeNonPpsr", label: "Taxa não-PPSR", col: "AG", type: "currency", group: "taxas" },
  // SPINUP & Caribbean (AH-AK) - 4 colunas
  { key: "spinUpBuyIn", label: "SPINUP Buy-in", col: "AH", type: "currency", group: "spinupCaribbean" },
  { key: "spinUpPrize", label: "SPINUP Prêmio", col: "AI", type: "currency", group: "spinupCaribbean" },
  { key: "caribbeanBets", label: "Caribbean Apostas", col: "AJ", type: "currency", group: "spinupCaribbean" },
  { key: "caribbeanPrize", label: "Caribbean Prêmio", col: "AK", type: "currency", group: "spinupCaribbean" },
  // Ganhos do Clube - Jogos (AL-AQ) - 6 colunas
  { key: "colorGameBets", label: "COLOR Apostas", col: "AL", type: "currency", group: "ganhosClubeJogos" },
  { key: "colorGamePrize", label: "COLOR Prêmio", col: "AM", type: "currency", group: "ganhosClubeJogos" },
  { key: "crashBets", label: "CRASH Apostas", col: "AN", type: "currency", group: "ganhosClubeJogos" },
  { key: "crashPrize", label: "CRASH Prêmio", col: "AO", type: "currency", group: "ganhosClubeJogos" },
  { key: "luckyDrawBets", label: "LUCKY Apostas", col: "AP", type: "currency", group: "ganhosClubeJogos" },
  { key: "luckyDrawPrize", label: "LUCKY Prêmio", col: "AQ", type: "currency", group: "ganhosClubeJogos" },
  // Jackpot e Finais (AR-AV) - 5 colunas
  { key: "jackpotFee", label: "Jackpot Taxa", col: "AR", type: "currency", group: "jackpotFinal" },
  { key: "jackpotPrize", label: "Jackpot Prêmio", col: "AS", type: "currency", group: "jackpotFinal" },
  { key: "evSplit", label: "Dividir EV", col: "AT", type: "currency", group: "jackpotFinal" },
  { key: "ticketDeliveredValue", label: "Ticket Entregue", col: "AU", type: "currency", group: "jackpotFinal" },
  { key: "ticketDeliveredBuyIn", label: "Ticket Buy-in", col: "AV", type: "currency", group: "jackpotFinal" },
] as const;

// Colunas resumidas para modo compacto
const SUMMARY_COLUMNS = ALL_COLUMNS.filter((col) =>
  ["ppPokerId", "nickname", "memoName", "agentNickname", "playerWinningsTotal", "generalTotal", "feeGeneral", "fee"].includes(col.key)
);

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
  // Totais por grupo
  const totalWinnings = summaries.reduce((sum, s) => sum + (s.playerWinningsTotal || 0), 0);
  const totalGeneral = summaries.reduce((sum, s) => sum + (s.generalTotal || 0), 0);
  const totalRingGames = summaries.reduce((sum, s) => sum + (s.ringGamesTotal || 0), 0);
  const totalMttSng = summaries.reduce((sum, s) => sum + (s.mttSitNGoTotal || 0), 0);
  const totalFeeGeral = summaries.reduce((sum, s) => sum + (s.feeGeneral || 0), 0);
  const totalFeeJogos = summaries.reduce((sum, s) => sum + (s.fee || 0), 0);

  if (summaries.length === 0) {
    return (
      <p className="text-center text-[#878787] py-8">
        Nenhum dado encontrado na aba Geral
      </p>
    );
  }

  // Agrupar colunas para header com merge (apenas quando expandido)
  const groupOrder = ["identificacao", "classificacoes", "ganhosJogador", "tickets", "taxas", "spinupCaribbean", "ganhosClubeJogos", "jackpotFinal"] as const;

  return (
    <div className="space-y-4 pb-4">
      {/* Row 1: Cards simples */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Jogadores</p>
          <p className="text-lg font-semibold">{totalPlayers}</p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Agentes</p>
          <p className="text-lg font-semibold">{totalAgents}</p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Superagentes</p>
          <p className="text-lg font-semibold">{totalSuperAgents}</p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Ring Games</p>
          <p className={`text-lg font-semibold font-mono ${totalRingGames >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {totalRingGames.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">MTT/SitNGo</p>
          <p className={`text-lg font-semibold font-mono ${totalMttSng >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {totalMttSng.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      </div>

      {/* Row 2: Cards expansíveis */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-start">
        <div
          className="p-3 border rounded-lg bg-amber-500/10 border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
          onClick={() => toggleCard("eventos")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-600 dark:text-amber-400">Ganhos + Eventos (I)</p>
            <Icons.ChevronDown className={`w-3 h-3 text-amber-600 transition-transform ${expandedCards.eventos ? "rotate-180" : ""}`} />
          </div>
          <p className={`text-lg font-semibold font-mono ${totalWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {totalWinnings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {expandedCards.eventos && (
            <div className="mt-2 pt-2 border-t border-amber-500/30 space-y-1 text-[9px]">
              <p className="text-muted-foreground">Soma das classificações (J-M) + Geral (N)</p>
            </div>
          )}
        </div>

        <div
          className="p-3 border rounded-lg bg-red-500/10 border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors"
          onClick={() => toggleCard("geral")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-red-600 dark:text-red-400">Geral - Jogador (N)</p>
            <Icons.ChevronDown className={`w-3 h-3 text-red-600 transition-transform ${expandedCards.geral ? "rotate-180" : ""}`} />
          </div>
          <p className={`text-lg font-semibold font-mono ${totalGeneral >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {totalGeneral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {expandedCards.geral && (
            <div className="mt-2 pt-2 border-t border-red-500/30 space-y-1 text-[9px]">
              <p className="text-muted-foreground">Soma de Ring, MTT, SPINUP, Caribbean, etc. (O-W)</p>
            </div>
          )}
        </div>

        <div
          className="p-3 border rounded-lg bg-green-500/10 border-green-500/20 cursor-pointer hover:bg-green-500/20 transition-colors"
          onClick={() => toggleCard("taxaGeral")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-green-600 dark:text-green-400">Taxa Geral (AA)</p>
            <Icons.ChevronDown className={`w-3 h-3 text-green-600 transition-transform ${expandedCards.taxaGeral ? "rotate-180" : ""}`} />
          </div>
          <p className="text-lg font-semibold font-mono text-green-600">
            {totalFeeGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {expandedCards.taxaGeral && (
            <div className="mt-2 pt-2 border-t border-green-500/30 space-y-1 text-[9px]">
              <p className="text-muted-foreground">Soma de todas as taxas (AC-AF)</p>
            </div>
          )}
        </div>

        <div
          className="p-3 border rounded-lg bg-green-500/10 border-green-500/20 cursor-pointer hover:bg-green-500/20 transition-colors"
          onClick={() => toggleCard("taxaJogos")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-green-600 dark:text-green-400">Taxa Jogos (AB)</p>
            <Icons.ChevronDown className={`w-3 h-3 text-green-600 transition-transform ${expandedCards.taxaJogos ? "rotate-180" : ""}`} />
          </div>
          <p className="text-lg font-semibold font-mono text-green-600">
            {totalFeeJogos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {expandedCards.taxaJogos && (
            <div className="mt-2 pt-2 border-t border-green-500/30 space-y-1 text-[9px]">
              <p className="text-muted-foreground">Taxa PPST + não-PPST + PPSR + não-PPSR</p>
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
          <Table className={expanded ? "min-w-[4000px]" : "min-w-[1000px]"}>
            <TableHeader>
              {/* Primeira linha - headers de grupo (apenas quando expandido) */}
              {expanded && (
                <TableRow>
                  {groupOrder.map((groupKey) => {
                    const group = COLUMN_GROUPS[groupKey];
                    return (
                      <TableHead
                        key={groupKey}
                        colSpan={group.cols}
                        className={`text-center border-b-0 ${group.bgHeader} ${group.textHeader} font-semibold`}
                      >
                        {group.label}
                      </TableHead>
                    );
                  })}
                </TableRow>
              )}
              {/* Segunda linha - sub-headers das colunas */}
              <TableRow className="border-b bg-muted/50">
                {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={`p-2 font-medium whitespace-nowrap text-xs ${
                        col.type === "currency" || col.type === "number"
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      <div className="text-[9px] text-muted-foreground">{col.col}</div>
                      {col.label}
                    </TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, idx) => (
                <TableRow key={`${row.ppPokerId}-${idx}`} className="hover:bg-muted/30">
                  {columns.map((col) => {
                    const value = row[col.key as keyof ParsedSummary];
                    const numValue = typeof value === "number" ? value : 0;
                    const isNegative = col.type === "currency" && numValue < 0;

                    return (
                      <TableCell
                        key={col.key}
                        className={`p-2 whitespace-nowrap text-xs ${
                          col.type === "currency" || col.type === "number"
                            ? "text-right font-mono"
                            : col.type === "id"
                            ? "font-mono text-[#878787]"
                            : ""
                        } ${isNegative ? "text-red-600" : ""}`}
                      >
                        {formatValue(value, col.type)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
            <tfoot>
              <TableRow className="border-t-2 bg-muted/50 font-semibold">
                {columns.map((col) => {
                  const total = filteredData.reduce((sum, row) => sum + ((row[col.key as keyof ParsedSummary] as number) || 0), 0);
                  const isNegative = col.type === "currency" && total < 0;

                  return (
                    <TableCell
                      key={col.key}
                      className={`p-2 whitespace-nowrap text-xs ${
                        col.type === "currency" || col.type === "number"
                          ? "text-right font-mono"
                          : ""
                      } ${isNegative ? "text-red-600" : ""}`}
                    >
                      {col.key === "ppPokerId" ? "TOTAL" :
                       col.key === "nickname" ? `${filteredData.length} jogadores` :
                       col.type === "currency" ? formatValue(total, "currency") :
                       col.type === "number" ? formatValue(total, "number") : ""}
                    </TableCell>
                  );
                })}
              </TableRow>
            </tfoot>
          </Table>
        </div>
      </div>
    </div>
  );
}
