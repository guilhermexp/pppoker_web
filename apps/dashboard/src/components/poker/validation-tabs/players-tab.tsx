"use client";

import type { ParsedPlayer, ParsedSummary } from "@/lib/poker/types";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { useState } from "react";

type PlayersTabProps = {
  players: ParsedPlayer[];
  summaries: ParsedSummary[];
};

export function PlayersTab({ players, summaries }: PlayersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Combine player data with summaries
  const combinedData = players.length > 0
    ? players.map((p) => {
        const summary = summaries.find((s) => s.ppPokerId === p.ppPokerId);
        return {
          ...p,
          winningsTotal: summary?.playerWinningsTotal || 0,
          rakeTotal: summary?.generalTotal || 0,
        };
      })
    : summaries.map((s) => ({
        ppPokerId: s.ppPokerId,
        nickname: s.nickname,
        memoName: s.memoName,
        country: s.country || null,
        agentNickname: s.agentNickname,
        agentPpPokerId: s.agentPpPokerId,
        superAgentNickname: s.superAgentNickname,
        superAgentPpPokerId: s.superAgentPpPokerId,
        chipBalance: 0,
        agentCreditBalance: 0,
        lastActiveAt: null,
        winningsTotal: s.playerWinningsTotal,
        rakeTotal: s.generalTotal,
        importStatus: "new" as const,
      }));

  // Filter data
  const filteredData = combinedData.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.nickname.toLowerCase().includes(query) ||
      p.ppPokerId.includes(query) ||
      p.memoName?.toLowerCase().includes(query) ||
      p.agentNickname?.toLowerCase().includes(query)
    );
  });

  // Paginate
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#878787]">
          {combinedData.length} jogadores
        </p>
        <div className="relative w-64">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#878787]" />
          <Input
            placeholder="Buscar jogador..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">ID</th>
              <th className="text-left p-3 font-medium">Apelido</th>
              <th className="text-left p-3 font-medium">Agente</th>
              <th className="text-right p-3 font-medium">Saldo</th>
              <th className="text-right p-3 font-medium">Rake</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedData.map((player) => (
              <tr key={player.ppPokerId} className="hover:bg-muted/30">
                <td className="p-3 font-mono text-[#878787] text-xs">
                  {player.ppPokerId}
                </td>
                <td className="p-3">
                  <div className="flex flex-col">
                    <span>{player.nickname}</span>
                    {player.memoName && (
                      <span className="text-xs text-[#878787]">
                        {player.memoName}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-[#878787]">
                  {player.agentNickname || "-"}
                </td>
                <td className={`p-3 text-right font-mono ${player.winningsTotal > 0 ? "text-[#00C969]" : ""}`}>
                  {formatCurrency(player.winningsTotal)}
                </td>
                <td className="p-3 text-right font-mono text-[#878787]">
                  {formatCurrency(player.rakeTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#878787]">
            {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredData.length)} de {filteredData.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <Icons.ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-[#878787]">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <Icons.ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
