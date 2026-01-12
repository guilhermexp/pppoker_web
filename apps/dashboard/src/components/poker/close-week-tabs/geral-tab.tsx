"use client";

import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { useState } from "react";

type PlayerSummary = {
  ppPokerId: string;
  nickname: string;
  memoName: string | null;
  country: string | null;
  agentNickname: string | null;
  agentPpPokerId: string | null;
  superAgentNickname: string | null;
  superAgentPpPokerId: string | null;
  playerWinningsTotal: number;
  generalTotal: number;
  ringGamesTotal: number;
  mttTotal: number;
  spinUpTotal: number;
  caribbeanTotal: number;
  fee: number;
  rakeTotal: number;
  rakePpst: number;
  rakePpsr: number;
  clubEarningsGeneral: number;
};

type GeralTabProps = {
  summaries: PlayerSummary[];
};

// Grupos de colunas
const COLUMN_GROUPS = {
  identificacao: {
    label: "Identificação",
    cols: 4,
    bgHeader: "bg-slate-500/10",
    textHeader: "text-slate-600 dark:text-slate-400",
  },
  hierarquia: {
    label: "Hierarquia",
    cols: 4,
    bgHeader: "bg-amber-500/10",
    textHeader: "text-amber-600 dark:text-amber-400",
  },
  ganhos: {
    label: "Ganhos",
    cols: 5,
    bgHeader: "bg-green-500/10",
    textHeader: "text-green-600 dark:text-green-400",
  },
  taxas: {
    label: "Taxas",
    cols: 3,
    bgHeader: "bg-blue-500/10",
    textHeader: "text-blue-600 dark:text-blue-400",
  },
};

// Todas as colunas
const ALL_COLUMNS = [
  // Identificação
  { key: "ppPokerId", label: "ID", type: "id", group: "identificacao" },
  { key: "country", label: "País", type: "text", group: "identificacao" },
  { key: "nickname", label: "Apelido", type: "text", group: "identificacao" },
  { key: "memoName", label: "Memorando", type: "text", group: "identificacao" },
  // Hierarquia
  { key: "agentNickname", label: "Agente", type: "text", group: "hierarquia" },
  {
    key: "agentPpPokerId",
    label: "ID Agente",
    type: "id",
    group: "hierarquia",
  },
  {
    key: "superAgentNickname",
    label: "Superagente",
    type: "text",
    group: "hierarquia",
  },
  {
    key: "superAgentPpPokerId",
    label: "ID Super",
    type: "id",
    group: "hierarquia",
  },
  // Ganhos
  {
    key: "playerWinningsTotal",
    label: "Ganhos Total",
    type: "currency",
    group: "ganhos",
  },
  { key: "generalTotal", label: "Geral", type: "currency", group: "ganhos" },
  {
    key: "ringGamesTotal",
    label: "Ring Games",
    type: "currency",
    group: "ganhos",
  },
  { key: "mttTotal", label: "MTT", type: "currency", group: "ganhos" },
  { key: "spinUpTotal", label: "SPIN", type: "currency", group: "ganhos" },
  // Taxas
  { key: "rakeTotal", label: "Rake Total", type: "currency", group: "taxas" },
  { key: "rakePpst", label: "PPST", type: "currency", group: "taxas" },
  { key: "rakePpsr", label: "PPSR", type: "currency", group: "taxas" },
] as const;

// Colunas resumidas para modo compacto
const SUMMARY_COLUMNS = ALL_COLUMNS.filter((col) =>
  [
    "ppPokerId",
    "nickname",
    "memoName",
    "agentNickname",
    "playerWinningsTotal",
    "rakeTotal",
  ].includes(col.key),
);

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

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function GeralTab({ summaries }: GeralTabProps) {
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
  const isValidId = (id: string | null | undefined) =>
    id &&
    id.trim() !== "" &&
    id.toLowerCase() !== "(none)" &&
    id.toLowerCase() !== "none";
  const uniqueAgents = new Set(
    summaries.map((s) => s.agentPpPokerId).filter(isValidId),
  );
  const uniqueSuperAgents = new Set(
    summaries.map((s) => s.superAgentPpPokerId).filter(isValidId),
  );

  // Players with/without agent
  const playersWithAgent = summaries.filter((s) =>
    isValidId(s.agentPpPokerId),
  ).length;

  // Financial totals
  const totalWinnings = summaries.reduce(
    (sum, s) => sum + (s.playerWinningsTotal || 0),
    0,
  );
  const totalRake = summaries.reduce((sum, s) => sum + (s.rakeTotal || 0), 0);
  const totalRingGames = summaries.reduce(
    (sum, s) => sum + (s.ringGamesTotal || 0),
    0,
  );
  const totalMtt = summaries.reduce((sum, s) => sum + (s.mttTotal || 0), 0);
  const totalSpin = summaries.reduce((sum, s) => sum + (s.spinUpTotal || 0), 0);

  // Winners/Losers
  const winners = summaries.filter((s) => s.playerWinningsTotal > 0).length;
  const losers = summaries.filter((s) => s.playerWinningsTotal < 0).length;

  const groupOrder = [
    "identificacao",
    "hierarquia",
    "ganhos",
    "taxas",
  ] as const;

  if (summaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Icons.Inbox className="h-12 w-12 mb-4 opacity-20" />
        <p>Nenhum dado de jogador encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {/* Row 1: Contadores */}
      <div className="flex items-center gap-4 text-xs py-2">
        <span className="text-muted-foreground">
          Jogadores{" "}
          <span className="text-foreground font-semibold">{totalPlayers}</span>
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
          Super Agentes{" "}
          <span className="text-foreground font-medium">
            {uniqueSuperAgents.size}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          C/ Agente{" "}
          <span className="text-foreground font-medium">
            {playersWithAgent}
          </span>
        </span>
      </div>

      {/* Row 2: Totais financeiros */}
      <div className="border-t border-[#1d1d1d]/30 flex items-center gap-4 text-xs py-2 flex-wrap">
        <span className="text-muted-foreground">
          Ganhos{" "}
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
          Rake{" "}
          <span className="font-mono font-medium text-[#00C969]">
            {formatCurrency(totalRake)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Ring{" "}
          <span
            className={cn(
              "font-mono",
              totalRingGames >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
            )}
          >
            {formatCurrency(totalRingGames)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          MTT{" "}
          <span
            className={cn(
              "font-mono",
              totalMtt >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
            )}
          >
            {formatCurrency(totalMtt)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          SPIN{" "}
          <span
            className={cn(
              "font-mono",
              totalSpin >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
            )}
          >
            {formatCurrency(totalSpin)}
          </span>
        </span>
      </div>

      {/* Row 3: Winners/Losers */}
      <div className="border-t border-[#1d1d1d]/30 flex items-center gap-4 text-xs py-2">
        <span className="text-[#00C969]">
          Winners <span className="font-mono font-medium">{winners}</span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-[#FF3638]">
          Losers <span className="font-mono font-medium">{losers}</span>
        </span>
      </div>

      {/* Controls */}
      <div className="border-t border-[#1d1d1d]/30 flex items-center justify-between pt-3">
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            {filteredData.length} registros
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 text-xs"
          >
            {expanded ? (
              <>
                <Icons.ChevronLeft className="w-3 h-3 mr-1" />
                Compactar
              </>
            ) : (
              <>
                Expandir
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

      {/* Tabela */}
      <div className="border-t border-[#1d1d1d]/30 pt-2">
        <div className="overflow-x-auto max-h-[400px]">
          <Table className={expanded ? "min-w-[1400px]" : "min-w-[800px]"}>
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
                        className={`text-center border-b-0 ${group.bgHeader} ${group.textHeader} font-semibold text-xs`}
                      >
                        {group.label}
                      </TableHead>
                    );
                  })}
                </TableRow>
              )}
              {/* Segunda linha - sub-headers das colunas */}
              <TableRow className="sticky top-0 bg-background">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`py-1.5 px-2 font-medium whitespace-nowrap text-xs ${
                      col.type === "currency" || col.type === "number"
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#1d1d1d]/40">
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum dado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((row, idx) => (
                  <TableRow
                    key={`${row.ppPokerId}-${idx}`}
                    className="hover:bg-muted/30"
                  >
                    {columns.map((col) => {
                      const value = row[col.key as keyof PlayerSummary];
                      const numValue = typeof value === "number" ? value : 0;
                      const isNegative =
                        col.type === "currency" && numValue < 0;
                      const isPositive =
                        col.type === "currency" &&
                        numValue > 0 &&
                        col.key !== "rakeTotal" &&
                        col.key !== "rakePpst" &&
                        col.key !== "rakePpsr";

                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            "py-1.5 px-2 whitespace-nowrap text-xs",
                            col.type === "currency" || col.type === "number"
                              ? "text-right font-mono"
                              : col.type === "id"
                                ? "font-mono text-[10px] text-muted-foreground"
                                : "",
                            isPositive && "text-[#00C969]",
                            isNegative && "text-[#FF3638]",
                          )}
                        >
                          {formatValue(
                            value as string | number | null,
                            col.type,
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
            {filteredData.length > 0 && (
              <tfoot>
                <TableRow className="border-t border-[#1d1d1d] font-medium bg-muted/30">
                  {columns.map((col) => {
                    if (col.key === "ppPokerId") {
                      return (
                        <TableCell
                          key={col.key}
                          className="py-1.5 px-2 text-xs"
                        >
                          TOTAL
                        </TableCell>
                      );
                    }
                    if (col.key === "nickname") {
                      return (
                        <TableCell
                          key={col.key}
                          className="py-1.5 px-2 text-xs text-muted-foreground"
                        >
                          {filteredData.length} jogadores
                        </TableCell>
                      );
                    }
                    if (col.type === "currency") {
                      const total = filteredData.reduce(
                        (sum, row) =>
                          sum +
                          ((row[col.key as keyof PlayerSummary] as number) ||
                            0),
                        0,
                      );
                      const isPositive =
                        total > 0 &&
                        col.key !== "rakeTotal" &&
                        col.key !== "rakePpst" &&
                        col.key !== "rakePpsr";
                      const isNegative = total < 0;
                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            "py-1.5 px-2 text-right font-mono text-xs",
                            isPositive && "text-[#00C969]",
                            isNegative && "text-[#FF3638]",
                          )}
                        >
                          {formatCurrency(total)}
                        </TableCell>
                      );
                    }
                    return <TableCell key={col.key} className="py-1.5 px-2" />;
                  })}
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
}
