"use client";

import type { ParsedRakeback } from "@/lib/poker/types";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { useState } from "react";

type LeagueRetornoDeTaxaTabProps = {
  rakebacks: ParsedRakeback[];
};

export function LeagueRetornoDeTaxaTab({
  rakebacks,
}: LeagueRetornoDeTaxaTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <div className="space-y-4 pb-4">
      {/* Summary Stats */}
      <div className="border rounded-lg bg-muted/20 p-4 space-y-3">
        {/* Row 1: Contagens */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Registros:</span>
            <span className="text-sm font-semibold">{totalRegistros}</span>
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

        {/* Row 2: Valores */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Média RT:</span>
            <span className="text-sm font-semibold font-mono">
              {avgRakeback.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Total RT:</span>
            <span
              className={`text-sm font-semibold font-mono ${totalRt >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {totalRt.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#878787]">{rakebacks.length} registros</p>
        <div className="relative w-64">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#878787]" />
          <Input
            placeholder="Buscar agente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">ID Superagente</th>
              <th className="text-left p-3 font-medium">ID Agente</th>
              <th className="text-left p-3 font-medium">Pais</th>
              <th className="text-left p-3 font-medium">Apelido</th>
              <th className="text-left p-3 font-medium">Memorando</th>
              <th className="text-right p-3 font-medium">Retorno %</th>
              <th className="text-right p-3 font-medium">Total RT</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#878787]">
                  Nenhum dado encontrado
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => (
                <tr
                  key={`${row.agentPpPokerId}-${index}`}
                  className="hover:bg-muted/30"
                >
                  <td className="p-3 font-mono text-xs text-[#878787]">
                    {row.superAgentPpPokerId || "-"}
                  </td>
                  <td className="p-3 font-mono text-xs text-[#878787]">
                    {row.agentPpPokerId}
                  </td>
                  <td className="p-3 text-[#878787]">{row.country || "-"}</td>
                  <td className="p-3">{row.agentNickname}</td>
                  <td className="p-3 text-[#878787]">{row.memoName || "-"}</td>
                  <td className="p-3 text-right font-mono">
                    {row.averageRakebackPercent.toFixed(2)}%
                  </td>
                  <td className="p-3 text-right font-mono">
                    {row.totalRt.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
