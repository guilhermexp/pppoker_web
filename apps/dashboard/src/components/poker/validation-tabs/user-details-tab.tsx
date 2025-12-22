"use client";

import type { ParsedPlayer } from "@/lib/poker/types";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

type UserDetailsTabProps = {
  players: ParsedPlayer[];
};

// Colunas resumidas (mais importantes)
const SUMMARY_COLUMNS = [
  { key: "lastActiveAt", label: "Última conexão", type: "datetime" },
  { key: "ppPokerId", label: "ID", type: "id" },
  { key: "nickname", label: "Apelido", type: "text" },
  { key: "agentNickname", label: "Agente", type: "text" },
  { key: "chipBalance", label: "Saldo Fichas", type: "currency" },
  { key: "agentCreditBalance", label: "Créd. Agente", type: "currency" },
] as const;

// Todas as colunas (12 campos - A até L)
const ALL_COLUMNS = [
  // Identificação (A-E)
  { key: "lastActiveAt", label: "Última conexão", type: "datetime", group: "Identificação" },
  { key: "ppPokerId", label: "ID", type: "id", group: "Identificação" },
  { key: "country", label: "País", type: "text", group: "Identificação" },
  { key: "nickname", label: "Apelido", type: "text", group: "Identificação" },
  { key: "memoName", label: "Memorando", type: "text", group: "Identificação" },
  // Saldo (F)
  { key: "chipBalance", label: "Saldo Fichas", type: "currency", group: "Saldo" },
  // Agente (G-I)
  { key: "agentNickname", label: "Agente", type: "text", group: "Agente" },
  { key: "agentPpPokerId", label: "ID Agente", type: "id", group: "Agente" },
  { key: "agentCreditBalance", label: "Crédito Agente", type: "currency", group: "Agente" },
  // Superagente (J-L)
  { key: "superAgentNickname", label: "Superagente", type: "text", group: "Superagente" },
  { key: "superAgentPpPokerId", label: "ID Super", type: "id", group: "Superagente" },
  { key: "superAgentCreditBalance", label: "Crédito Super", type: "currency", group: "Superagente" },
] as const;

export function UserDetailsTab({ players }: UserDetailsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (cardId: string) => {
    setExpandedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const filteredData = players.filter((p) => {
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

  // Helper to check if ID is valid (not "(none)" or empty)
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

  if (players.length === 0) {
    return (
      <p className="text-center text-[#878787] py-8">
        Nenhum dado encontrado na aba Detalhes do usuário
      </p>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 border rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground">Total Jogadores</p>
          <p className="text-lg font-semibold">{totalPlayers}</p>
          <p className="text-[9px] text-muted-foreground mt-1">
            Saldo total: <span className={`font-mono ${totalChipBalance >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
              {totalChipBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </p>
        </div>
        <div
          className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCard("comAgente")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Com Agente</p>
            <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.comAgente ? "rotate-180" : ""}`} />
          </div>
          <p className="text-lg font-semibold">{playersWithAgent.length}</p>
          {expandedCards.comAgente ? (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Agentes únicos</span>
                <span className="font-mono">{uniqueAgents.size}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Saldo fichas (F)</span>
                <span className={`font-mono ${chipBalanceWithAgent >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {chipBalanceWithAgent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Crédito agentes (I)</span>
                <span className={`font-mono ${agentCreditWithAgent >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {agentCreditWithAgent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[9px] text-muted-foreground mt-0.5">Clique para ver detalhes</p>
          )}
        </div>
        <div
          className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCard("semAgente")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Sem Agente</p>
            <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.semAgente ? "rotate-180" : ""}`} />
          </div>
          <p className="text-lg font-semibold">{playersWithoutAgent.length}</p>
          {expandedCards.semAgente ? (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Saldo fichas (F)</span>
                <span className={`font-mono ${chipBalanceWithoutAgent >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {chipBalanceWithoutAgent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[9px] text-muted-foreground mt-0.5">Clique para ver detalhes</p>
          )}
        </div>
        <div
          className="p-3 border rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => toggleCard("superAgente")}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Superagentes</p>
            <Icons.ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expandedCards.superAgente ? "rotate-180" : ""}`} />
          </div>
          <p className="text-lg font-semibold">{uniqueSuperAgents.size}</p>
          {expandedCards.superAgente ? (
            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-muted-foreground">Crédito super (L)</span>
                <span className={`font-mono ${superAgentCreditBalance >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
                  {superAgentCreditBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[9px] text-muted-foreground mt-0.5">Clique para ver detalhes</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-[#878787]">{players.length} registros</p>
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

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full text-xs ${expanded ? "min-w-[1400px]" : "min-w-[800px]"}`}>
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
                          : col.type === "datetime"
                          ? "text-[#878787]"
                          : ""
                      }`}
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
