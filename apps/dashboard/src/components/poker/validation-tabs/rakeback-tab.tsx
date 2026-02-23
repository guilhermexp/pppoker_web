"use client";

import type { ParsedRakeback } from "@/lib/poker/types";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { useState } from "react";

type RakebackTabProps = {
  rakebacks: ParsedRakeback[];
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function RakebackTab({ rakebacks }: RakebackTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showByAgent, setShowByAgent] = useState(false);

  const filteredData = rakebacks.filter((row) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.agentNickname.toLowerCase().includes(query) ||
      row.agentPpPokerId.includes(query) ||
      row.memoName?.toLowerCase().includes(query) ||
      row.superAgentPpPokerId?.includes(query)
    );
  });

  // Calculate totals
  const totalRegistros = rakebacks.length;
  const uniqueAgents = new Set(
    rakebacks.map((r) => r.agentPpPokerId).filter(Boolean),
  );
  const uniqueSuperAgents = new Set(
    rakebacks
      .map((r) => r.superAgentPpPokerId)
      .filter(
        (id) =>
          id && id.toLowerCase() !== "(none)" && id.toLowerCase() !== "none",
      ),
  );
  const totalRt = rakebacks.reduce((sum, r) => sum + (r.totalRt || 0), 0);
  const avgRakeback =
    rakebacks.length > 0
      ? rakebacks.reduce((sum, r) => sum + (r.averageRakebackPercent || 0), 0) /
        rakebacks.length
      : 0;

  // Group by agent for expanded view
  const byAgent = rakebacks.reduce(
    (acc, r) => {
      const id = r.agentPpPokerId;
      if (!acc[id]) {
        acc[id] = {
          id,
          nickname: r.agentNickname,
          totalRt: 0,
          avgPercent: 0,
          count: 0,
        };
      }
      acc[id].totalRt += r.totalRt || 0;
      acc[id].avgPercent += r.averageRakebackPercent || 0;
      acc[id].count += 1;
      return acc;
    },
    {} as Record<
      string,
      {
        id: string;
        nickname: string;
        totalRt: number;
        avgPercent: number;
        count: number;
      }
    >,
  );

  const agentsList = Object.values(byAgent)
    .map((a) => ({ ...a, avgPercent: a.avgPercent / a.count }))
    .sort((a, b) => b.totalRt - a.totalRt);

  if (rakebacks.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Nenhum dado encontrado na aba Retorno de Taxa
      </p>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* Row 1: Counters */}
      <div className="flex items-center gap-4 text-xs py-2">
        <span className="text-muted-foreground">
          Registros{" "}
          <span className="text-foreground font-medium">{totalRegistros}</span>
        </span>
        <span className="text-border/60">·</span>
        <button
          type="button"
          onClick={() => setShowByAgent(!showByAgent)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Agentes{" "}
          <span className="text-foreground font-medium">
            {uniqueAgents.size}
          </span>
          <Icons.ChevronDown
            className={cn(
              "w-3 h-3 inline ml-1 transition-transform",
              showByAgent && "rotate-180",
            )}
          />
        </button>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Superagentes{" "}
          <span className="text-foreground font-medium">
            {uniqueSuperAgents.size}
          </span>
        </span>
      </div>

      {/* Expanded agents list */}
      {showByAgent && agentsList.length > 0 && (
        <div className="border-t border-border/40 py-2">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <span className="text-muted-foreground text-[10px] font-medium">
              Top agentes:
            </span>
            {agentsList.slice(0, 6).map((agent) => (
              <span key={agent.id} className="text-muted-foreground">
                {agent.nickname}{" "}
                <span
                  className={cn(
                    "font-mono",
                    agent.totalRt >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
                  )}
                >
                  {formatCurrency(agent.totalRt)}
                </span>
                <span className="text-[9px] text-muted-foreground ml-1">
                  ({formatPercent(agent.avgPercent)})
                </span>
              </span>
            ))}
            {agentsList.length > 6 && (
              <span className="text-[10px] text-muted-foreground">
                +{agentsList.length - 6} mais
              </span>
            )}
          </div>
        </div>
      )}

      {/* Row 2: Totals */}
      <div className="border-t border-border/40 flex items-center gap-4 text-xs py-2">
        <span className="text-muted-foreground">
          Total RT{" "}
          <span
            className={cn(
              "font-mono font-medium",
              totalRt >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
            )}
          >
            {formatCurrency(totalRt)}
          </span>
        </span>
        <span className="text-border/60">·</span>
        <span className="text-muted-foreground">
          Média RT{" "}
          <span className="font-mono font-medium text-foreground">
            {formatPercent(avgRakeback)}
          </span>
        </span>
      </div>

      {/* Search */}
      <div className="border-t border-border/40 flex items-center justify-between py-2">
        <span className="text-xs text-muted-foreground">
          {filteredData.length} registros
        </span>
        <div className="relative w-48">
          <Icons.Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar agente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
      </div>

      {/* Data table */}
      <div className="border-t border-border/40 pt-2 pb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="text-muted-foreground border-b border-border/40">
                <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                  ID Superagente
                </th>
                <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                  ID Agente
                </th>
                <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                  País
                </th>
                <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                  Apelido
                </th>
                <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                  Memorando
                </th>
                <th className="py-1.5 px-2 font-medium text-right whitespace-nowrap">
                  Retorno %
                </th>
                <th className="py-1.5 px-2 font-medium text-right whitespace-nowrap">
                  Total RT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nenhum dado encontrado
                  </td>
                </tr>
              ) : (
                filteredData.map((row, index) => (
                  <tr
                    key={`${row.agentPpPokerId}-${index}`}
                    className="hover:bg-muted/30"
                  >
                    <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      {row.superAgentPpPokerId || "-"}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      {row.agentPpPokerId}
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                      {row.country || "-"}
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      {row.agentNickname}
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                      {row.memoName || "-"}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                      {formatPercent(row.averageRakebackPercent)}
                    </td>
                    <td
                      className={cn(
                        "py-1.5 px-2 text-right font-mono whitespace-nowrap",
                        row.totalRt >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
                      )}
                    >
                      {formatCurrency(row.totalRt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border font-medium bg-muted/30">
                  <td colSpan={5} className="py-1.5 px-2">
                    TOTAL
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono">
                    {formatPercent(
                      filteredData.reduce(
                        (sum, r) => sum + r.averageRakebackPercent,
                        0,
                      ) / filteredData.length,
                    )}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 px-2 text-right font-mono",
                      filteredData.reduce((sum, r) => sum + r.totalRt, 0) >= 0
                        ? "text-[#00C969]"
                        : "text-[#FF3638]",
                    )}
                  >
                    {formatCurrency(
                      filteredData.reduce((sum, r) => sum + r.totalRt, 0),
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
