"use client";

import type { ParsedPlayer } from "@/lib/poker/types";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

type LeagueDetalhesDoUsuarioTabProps = {
  players: ParsedPlayer[];
};

// Colunas resumidas (mais importantes)
const SUMMARY_COLUMNS = [
  { key: "lastActiveAt", label: "Ultima conexao", type: "datetime" },
  { key: "ppPokerId", label: "ID", type: "id" },
  { key: "nickname", label: "Apelido", type: "text" },
  { key: "agentNickname", label: "Agente", type: "text" },
  { key: "chipBalance", label: "Saldo Fichas", type: "currency" },
  { key: "agentCreditBalance", label: "Cred. Agente", type: "currency" },
] as const;

// Todas as colunas (12 campos - A ate L)
const ALL_COLUMNS = [
  {
    key: "lastActiveAt",
    label: "Ultima conexao",
    type: "datetime",
    group: "Identificacao",
  },
  { key: "ppPokerId", label: "ID", type: "id", group: "Identificacao" },
  { key: "country", label: "Pais", type: "text", group: "Identificacao" },
  { key: "nickname", label: "Apelido", type: "text", group: "Identificacao" },
  { key: "memoName", label: "Memorando", type: "text", group: "Identificacao" },
  {
    key: "chipBalance",
    label: "Saldo Fichas",
    type: "currency",
    group: "Saldo",
  },
  { key: "agentNickname", label: "Agente", type: "text", group: "Agente" },
  { key: "agentPpPokerId", label: "ID Agente", type: "id", group: "Agente" },
  {
    key: "agentCreditBalance",
    label: "Credito Agente",
    type: "currency",
    group: "Agente",
  },
  {
    key: "superAgentNickname",
    label: "Superagente",
    type: "text",
    group: "Superagente",
  },
  {
    key: "superAgentPpPokerId",
    label: "ID Super",
    type: "id",
    group: "Superagente",
  },
  {
    key: "superAgentCreditBalance",
    label: "Credito Super",
    type: "currency",
    group: "Superagente",
  },
] as const;

export function LeagueDetalhesDoUsuarioTab({
  players,
}: LeagueDetalhesDoUsuarioTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

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
    id &&
    id.trim() !== "" &&
    id.toLowerCase() !== "(none)" &&
    id.toLowerCase() !== "none";

  // Calculate totals
  const totalPlayers = players.length;
  const uniqueAgents = new Set(
    players.map((p) => p.agentPpPokerId).filter(isValidId),
  );
  const uniqueSuperAgents = new Set(
    players.map((p) => p.superAgentPpPokerId).filter(isValidId),
  );

  // Players with/without agent
  const playersWithAgent = players.filter((p) => isValidId(p.agentPpPokerId));
  const playersWithoutAgent = players.filter(
    (p) => !isValidId(p.agentPpPokerId),
  );

  // Chip balance breakdown
  const chipBalanceWithAgent = playersWithAgent.reduce(
    (sum, p) => sum + (p.chipBalance || 0),
    0,
  );
  const chipBalanceWithoutAgent = playersWithoutAgent.reduce(
    (sum, p) => sum + (p.chipBalance || 0),
    0,
  );
  const totalChipBalance = chipBalanceWithAgent + chipBalanceWithoutAgent;

  // Credit balance breakdown
  const agentCreditWithAgent = playersWithAgent.reduce(
    (sum, p) => sum + (p.agentCreditBalance || 0),
    0,
  );
  const superAgentCreditBalance = players.reduce(
    (sum, p) => sum + (p.superAgentCreditBalance || 0),
    0,
  );

  if (players.length === 0) {
    return (
      <p className="text-center text-[#878787] py-8">
        Nenhum dado encontrado na aba Detalhes do usuario
      </p>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Summary Stats */}
      <div className="border rounded-lg bg-muted/20 p-4 space-y-3">
        {/* Row 1: Contagens */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Jogadores:</span>
            <span className="text-sm font-semibold">{totalPlayers}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Com Agente:</span>
            <span className="text-sm font-semibold">
              {playersWithAgent.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Sem Agente:</span>
            <span className="text-sm font-semibold">
              {playersWithoutAgent.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Agentes:</span>
            <span className="text-sm font-semibold">{uniqueAgents.size}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Superagentes:</span>
            <span className="text-sm font-semibold">
              {uniqueSuperAgents.size}
            </span>
          </div>
        </div>

        {/* Row 2: Saldos */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              Saldo Total (F):
            </span>
            <span
              className={`text-sm font-semibold font-mono ${totalChipBalance >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {totalChipBalance.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              Crédito Agentes (I):
            </span>
            <span
              className={`text-sm font-semibold font-mono ${agentCreditWithAgent >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {agentCreditWithAgent.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              Crédito Super (L):
            </span>
            <span
              className={`text-sm font-semibold font-mono ${superAgentCreditBalance >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {superAgentCreditBalance.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>

        {/* Row 3: Detalhado */}
        <div className="pt-3 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            DETALHADO
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              Fichas c/ Agente:{" "}
              <span
                className={`font-mono font-medium ${chipBalanceWithAgent >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
              >
                {chipBalanceWithAgent.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </span>
            <span>
              Fichas s/ Agente:{" "}
              <span
                className={`font-mono font-medium ${chipBalanceWithoutAgent >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
              >
                {chipBalanceWithoutAgent.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </span>
          </div>
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
          <table
            className={`w-full text-xs ${expanded ? "min-w-[1400px]" : "min-w-[800px]"}`}
          >
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
                <tr
                  key={`${row.ppPokerId}-${idx}`}
                  className="hover:bg-muted/30"
                >
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
                      {formatValue(
                        row[col.key as keyof ParsedPlayer],
                        col.type,
                      )}
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
  type: string,
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
