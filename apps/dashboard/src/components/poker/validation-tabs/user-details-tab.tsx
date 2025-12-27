"use client";

import type { ParsedPlayer } from "@/lib/poker/types";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { cn } from "@midday/ui/cn";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

type UserDetailsTabProps = {
  players: ParsedPlayer[];
};

// Player categories with colors
const PLAYER_CATEGORIES = [
  { key: "comAgente", name: "Com Agente", color: "#3B82F6" },
  { key: "semAgente", name: "Sem Agente", color: "#6B7280" },
] as const;

// Summary columns
const SUMMARY_COLUMNS = [
  { key: "lastActiveAt", label: "Última conexão", type: "datetime" },
  { key: "ppPokerId", label: "ID", type: "id" },
  { key: "nickname", label: "Apelido", type: "text" },
  { key: "agentNickname", label: "Agente", type: "text" },
  { key: "chipBalance", label: "Saldo Fichas", type: "currency" },
  { key: "agentCreditBalance", label: "Créd. Agente", type: "currency" },
] as const;

// All columns (12 fields)
const ALL_COLUMNS = [
  { key: "lastActiveAt", label: "Última conexão", type: "datetime", group: "Identificação" },
  { key: "ppPokerId", label: "ID", type: "id", group: "Identificação" },
  { key: "country", label: "País", type: "text", group: "Identificação" },
  { key: "nickname", label: "Apelido", type: "text", group: "Identificação" },
  { key: "memoName", label: "Memorando", type: "text", group: "Identificação" },
  { key: "chipBalance", label: "Saldo Fichas", type: "currency", group: "Saldo" },
  { key: "agentNickname", label: "Agente", type: "text", group: "Agente" },
  { key: "agentPpPokerId", label: "ID Agente", type: "id", group: "Agente" },
  { key: "agentCreditBalance", label: "Crédito Agente", type: "currency", group: "Agente" },
  { key: "superAgentNickname", label: "Superagente", type: "text", group: "Superagente" },
  { key: "superAgentPpPokerId", label: "ID Super", type: "id", group: "Superagente" },
  { key: "superAgentCreditBalance", label: "Crédito Super", type: "currency", group: "Superagente" },
] as const;

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

export function UserDetailsTab({ players }: UserDetailsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAgentsDetail, setShowAgentsDetail] = useState(false);

  // Helper to check if ID is valid
  const isValidId = (id: string | null | undefined) =>
    id && id.trim() !== "" && id.toLowerCase() !== "(none)" && id.toLowerCase() !== "none";

  // Calculate totals
  const totalPlayers = players.length;
  const uniqueAgents = new Set(players.map((p) => p.agentPpPokerId).filter(isValidId));
  const uniqueSuperAgents = new Set(players.map((p) => p.superAgentPpPokerId).filter(isValidId));

  // Players with/without agent
  const playersWithAgent = players.filter((p) => isValidId(p.agentPpPokerId));
  const playersWithoutAgent = players.filter((p) => !isValidId(p.agentPpPokerId));

  // Chip balance breakdown
  const chipBalanceWithAgent = playersWithAgent.reduce((sum, p) => sum + (p.chipBalance || 0), 0);
  const chipBalanceWithoutAgent = playersWithoutAgent.reduce((sum, p) => sum + (p.chipBalance || 0), 0);
  const totalChipBalance = chipBalanceWithAgent + chipBalanceWithoutAgent;

  // Credit balance breakdown
  const agentCreditWithAgent = playersWithAgent.reduce((sum, p) => sum + (p.agentCreditBalance || 0), 0);
  const superAgentCreditBalance = players.reduce((sum, p) => sum + (p.superAgentCreditBalance || 0), 0);

  const filteredData = players.filter((p) => {
    // Filter by category
    if (selectedCategory === "comAgente" && !isValidId(p.agentPpPokerId)) return false;
    if (selectedCategory === "semAgente" && isValidId(p.agentPpPokerId)) return false;

    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.nickname.toLowerCase().includes(query) ||
      p.ppPokerId.includes(query) ||
      p.memoName?.toLowerCase().includes(query) ||
      p.agentNickname?.toLowerCase().includes(query)
    );
  });

  const columns = expanded ? ALL_COLUMNS : SUMMARY_COLUMNS;

  if (players.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhum dado encontrado na aba Detalhes do usuário
      </p>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* Row 1: Counters */}
      <div className="flex items-center gap-4 text-xs py-2">
        <span className="text-muted-foreground">
          Jogadores <span className="text-foreground font-medium">{totalPlayers}</span>
        </span>
        <span className="text-border/60">·</span>
        <button
          type="button"
          onClick={() => setShowAgentsDetail(!showAgentsDetail)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Agentes <span className="text-foreground font-medium">{uniqueAgents.size}</span>
          <Icons.ChevronDown className={cn("w-3 h-3 inline ml-1 transition-transform", showAgentsDetail && "rotate-180")} />
        </button>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Superagentes <span className="text-foreground font-medium">{uniqueSuperAgents.size}</span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Saldo Total{" "}
          <span className={cn("font-mono font-medium", totalChipBalance >= 0 ? "text-[#00C969]" : "text-[#FF3638]")}>
            {formatCurrency(totalChipBalance)}
          </span>
        </span>
      </div>

      {/* Expanded agents detail */}
      {showAgentsDetail && (
        <div className="border-t border-border/40 py-2">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <span className="text-muted-foreground text-[10px] font-medium">Créditos:</span>
            <span className="text-muted-foreground">
              Agentes (I){" "}
              <span className={cn("font-mono font-medium", agentCreditWithAgent >= 0 ? "text-[#00C969]" : "text-[#FF3638]")}>
                {formatCurrency(agentCreditWithAgent)}
              </span>
            </span>
            <span className="text-border/60">·</span>
            <span className="text-muted-foreground">
              Superagentes (L){" "}
              <span className={cn("font-mono font-medium", superAgentCreditBalance >= 0 ? "text-[#00C969]" : "text-[#FF3638]")}>
                {formatCurrency(superAgentCreditBalance)}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Row 2: Categories with colored dots */}
      <div className="border-t border-border/40 py-2">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Com Agente */}
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === "comAgente" ? null : "comAgente")}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-muted/50",
              selectedCategory === "comAgente" && "bg-muted/50"
            )}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#3B82F6" }} />
            <span className="text-muted-foreground">Com Agente</span>
            <span className="text-foreground font-medium">{playersWithAgent.length}</span>
            <span className={cn("font-mono text-[10px]", chipBalanceWithAgent >= 0 ? "text-[#00C969]" : "text-[#FF3638]")}>
              ({formatCurrency(chipBalanceWithAgent)})
            </span>
          </button>

          {/* Sem Agente */}
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === "semAgente" ? null : "semAgente")}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded transition-colors hover:bg-muted/50",
              selectedCategory === "semAgente" && "bg-muted/50"
            )}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#6B7280" }} />
            <span className="text-muted-foreground">Sem Agente</span>
            <span className="text-foreground font-medium">{playersWithoutAgent.length}</span>
            <span className={cn("font-mono text-[10px]", chipBalanceWithoutAgent >= 0 ? "text-[#00C969]" : "text-[#FF3638]")}>
              ({formatCurrency(chipBalanceWithoutAgent)})
            </span>
          </button>
        </div>
      </div>

      {/* Search and controls */}
      <div className="border-t border-border/40 flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {filteredData.length} registros
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="ml-2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                (limpar filtro)
              </button>
            )}
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
          <table className={cn("w-full text-xs", expanded ? "min-w-[1400px]" : "min-w-[700px]")}>
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "py-1.5 px-2 font-medium whitespace-nowrap",
                      (col.type === "currency" || col.type === "number") ? "text-right" : "text-left"
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredData.map((row, idx) => (
                <tr key={`${row.ppPokerId}-${idx}`} className="hover:bg-muted/30">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "py-1.5 px-2 whitespace-nowrap",
                        (col.type === "currency" || col.type === "number") ? "text-right font-mono" : "",
                        col.type === "id" && "font-mono text-muted-foreground text-[10px]",
                        col.type === "datetime" && "text-muted-foreground"
                      )}
                    >
                      {formatValue(row[col.key as keyof ParsedPlayer], col.type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
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
    case "datetime":
      try {
        const date = new Date(String(value));
        return format(date, "dd/MM HH:mm", { locale: ptBR });
      } catch {
        return String(value);
      }
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
