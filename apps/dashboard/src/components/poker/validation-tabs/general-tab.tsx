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

// Tipos de jogo para exibição com dots coloridos
const GAME_TYPE_CATEGORIES = [
  { key: "nlholdem", label: "NLHoldem", color: "bg-green-500" },
  { key: "plo", label: "PLO", color: "bg-blue-500" },
  { key: "flash", label: "FLASH", color: "bg-yellow-500" },
  { key: "outros", label: "Outros", color: "bg-orange-500" },
  { key: "seka", label: "SEKA", color: "bg-purple-500" },
  { key: "teenPatti", label: "TEEN PATTI", color: "bg-pink-500" },
  { key: "filipinos", label: "Filipinos", color: "bg-cyan-500" },
  { key: "cassino", label: "Cassino", color: "bg-red-500" },
] as const;

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

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function GeneralTab({ summaries }: GeneralTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

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

  // Totais financeiros
  const totalWinnings = summaries.reduce((sum, s) => sum + (s.playerWinningsTotal || 0), 0);
  const totalGeneral = summaries.reduce((sum, s) => sum + (s.generalTotal || 0), 0);
  const totalRingGames = summaries.reduce((sum, s) => sum + (s.ringGamesTotal || 0), 0);
  const totalMttSng = summaries.reduce((sum, s) => sum + (s.mttSitNGoTotal || 0), 0);
  const totalSpinUp = summaries.reduce((sum, s) => sum + (s.spinUpTotal || 0), 0);
  const totalCaribbean = summaries.reduce((sum, s) => sum + (s.caribbeanTotal || 0), 0);
  const totalFeeGeral = summaries.reduce((sum, s) => sum + (s.feeGeneral || 0), 0);
  const totalFeeJogos = summaries.reduce((sum, s) => sum + (s.fee || 0), 0);
  const totalJackpot = summaries.reduce((sum, s) => sum + (s.jackpotTotal || 0), 0);
  const totalEvSplit = summaries.reduce((sum, s) => sum + (s.evSplitTotal || 0), 0);
  const totalMaos = summaries.reduce((sum, s) => sum + (s.handsTotal || 0), 0);

  // Contagem de tipos de jogo ativos (simulado - ajustar conforme dados reais)
  const gameTypeCounts = {
    nlholdem: summaries.filter(s => (s.ringGamesTotal || 0) !== 0).length,
    plo: summaries.filter(s => (s.mttSitNGoTotal || 0) !== 0).length,
    flash: 0,
    outros: 0,
    seka: 0,
    teenPatti: 0,
    filipinos: 0,
    cassino: summaries.filter(s => (s.caribbeanTotal || 0) !== 0).length,
  };

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
    <div className="space-y-3 pb-4">
      {/* Row 1: Contadores simples - estilo minimalista */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm py-2">
        <span className="text-muted-foreground">
          Clubes: <span className="text-foreground font-medium">1</span>
        </span>
        <span className="text-muted-foreground">
          Jogadores (B): <span className="text-foreground font-semibold">{totalPlayers}</span>
        </span>
        <span className="text-muted-foreground">
          Agentes (G): <span className="text-foreground font-semibold">{totalAgents}</span>
        </span>
        <span className="text-muted-foreground">
          Superag. (I): <span className="text-foreground font-semibold">{totalSuperAgents}</span>
        </span>
      </div>

      {/* Separador sutil */}
      <div className="border-t border-border/40" />

      {/* Row 2: Valores financeiros principais */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm py-2">
        <span className="text-muted-foreground">
          Total Ganhos (AV):{" "}
          <span className={`font-semibold ${totalWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {formatCurrency(totalWinnings)}
          </span>
        </span>
        <span className="text-muted-foreground">
          Ganhos+Ev (BA):{" "}
          <span className={`font-semibold ${totalGeneral >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {formatCurrency(totalGeneral)}
          </span>
        </span>
        <span className="text-muted-foreground">
          Jackpot (AT):{" "}
          <span className={`font-semibold ${totalJackpot >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {formatCurrency(totalJackpot)}
          </span>
        </span>
        <span className="text-muted-foreground">
          Dividir EV (AU):{" "}
          <span className={`font-semibold ${totalEvSplit >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {formatCurrency(totalEvSplit)}
          </span>
        </span>
        <span className="text-muted-foreground">
          Taxa (CJ):{" "}
          <span className="text-foreground font-semibold">{formatCurrency(totalFeeGeral)}</span>
        </span>
        <span className="text-muted-foreground">
          Mãos (EG):{" "}
          <span className="text-foreground font-semibold">{totalMaos.toLocaleString("pt-BR")}</span>
        </span>
      </div>

      {/* Separador sutil */}
      <div className="border-t border-border/40" />

      {/* Row 3: Tipos de jogo com dots coloridos */}
      <div className="py-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">TIPOS DE JOGO</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {GAME_TYPE_CATEGORIES.map((cat) => {
            const count = gameTypeCounts[cat.key as keyof typeof gameTypeCounts] || 0;
            return (
              <span key={cat.key} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                <span className="text-muted-foreground">{cat.label}</span>
                <span className="text-foreground font-medium">{count}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Row 4: Detalhado por categoria */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground py-1">
        <span>Detalhado:</span>
        <span>
          NLHoldem/J-R:{" "}
          <span className={`font-mono ${totalRingGames >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {formatCurrency(totalRingGames)}
          </span>
        </span>
        <span>
          PLO/S-AB:{" "}
          <span className={`font-mono ${totalMttSng >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {formatCurrency(totalMttSng)}
          </span>
        </span>
        <span>
          FLASH/AC-AD:{" "}
          <span className={`font-mono ${totalSpinUp >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {formatCurrency(totalSpinUp)}
          </span>
        </span>
        <span>
          Outros/AE-AF:{" "}
          <span className={`font-mono ${totalCaribbean >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {formatCurrency(totalCaribbean)}
          </span>
        </span>
        <span>
          Cassino/AP-AU:{" "}
          <span className={`font-mono ${totalFeeJogos >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
            {formatCurrency(totalFeeJogos)}
          </span>
        </span>
      </div>

      {/* Separador antes da tabela */}
      <div className="border-t border-border/40" />

      {/* Controls */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <p className="text-sm text-[#878787]">{summaries.length} clubes</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <Icons.ChevronLeft className="w-4 h-4 mr-1" />
                Colapsar todos
              </>
            ) : (
              <>
                Expandir colunas
                <Icons.ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
        <div className="relative w-64">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#878787]" />
          <Input
            placeholder="Buscar clube ou jogador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabela */}
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
