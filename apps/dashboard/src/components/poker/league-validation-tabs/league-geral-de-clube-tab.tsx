"use client";

import type { ParsedClubSummary } from "@/lib/poker/league-types";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { useMemo, useState } from "react";

type LeagueGeralDeClubeTabProps = {
  summaries: ParsedClubSummary[];
};

// Grouped club data
type ClubGroup = {
  clubId: string;
  clubName: string;
  periodStart: string | null;
  periodEnd: string | null;
  players: ParsedClubSummary[];
  // Calculated totals
  totalPlayers: number;
  totalAgents: number;
  totalWinnings: number;
  totalBalance: number;
  totalRake: number;
  totalFee: number;
  totalGap: number;
};

// Player table columns
const PLAYER_COLUMNS = [
  { key: "ppPokerId", label: "ID", type: "id" },
  { key: "nickname", label: "Apelido", type: "text" },
  { key: "memoName", label: "Memorando", type: "text" },
  { key: "agentNickname", label: "Agente", type: "text" },
  { key: "playerWinningsTotal", label: "Ganhos", type: "currency" },
  { key: "generalTotal", label: "Geral", type: "currency" },
  { key: "feeGeneral", label: "Taxa", type: "currency" },
] as const;

export function LeagueGeralDeClubeTab({
  summaries,
}: LeagueGeralDeClubeTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClubs, setExpandedClubs] = useState<Record<string, boolean>>(
    {},
  );

  // Group players by club
  const clubGroups = useMemo(() => {
    const groups = new Map<string, ClubGroup>();

    for (const player of summaries) {
      const clubId = player.clubId || "unknown";
      const clubName = player.clubName || "Clube Desconhecido";

      if (!groups.has(clubId)) {
        groups.set(clubId, {
          clubId,
          clubName,
          periodStart: player.periodStart || null,
          periodEnd: player.periodEnd || null,
          players: [],
          totalPlayers: 0,
          totalAgents: 0,
          totalWinnings: 0,
          totalBalance: 0,
          totalRake: 0,
          totalFee: 0,
          totalGap: 0,
        });
      }

      const group = groups.get(clubId)!;
      group.players.push(player);
      group.totalPlayers++;
      group.totalWinnings += player.generalTotal || 0;
      group.totalBalance += player.playerWinningsTotal || 0;
      group.totalRake += player.feeGeneral || 0;
      group.totalFee += player.fee || 0;
      // Gap is typically winnings - rake or a specific calculation
      group.totalGap += (player.generalTotal || 0) - (player.feeGeneral || 0);
    }

    // Calculate unique agents per club
    for (const group of groups.values()) {
      const uniqueAgents = new Set(
        group.players
          .map((p) => p.agentPpPokerId)
          .filter((id) => id && id !== "None" && id.trim() !== ""),
      );
      group.totalAgents = uniqueAgents.size;
    }

    return Array.from(groups.values());
  }, [summaries]);

  // Filter clubs by search
  const filteredClubs = useMemo(() => {
    if (!searchQuery) return clubGroups;
    const query = searchQuery.toLowerCase();
    return clubGroups.filter(
      (club) =>
        club.clubName.toLowerCase().includes(query) ||
        club.clubId.includes(query) ||
        club.players.some(
          (p) =>
            p.nickname.toLowerCase().includes(query) ||
            p.ppPokerId.includes(query) ||
            p.memoName?.toLowerCase().includes(query),
        ),
    );
  }, [clubGroups, searchQuery]);

  // Calculate global totals
  const globalTotals = useMemo(() => {
    // Calculate unique agents across all summaries
    const uniqueAgents = new Set(
      summaries
        .map((s) => s.agentPpPokerId)
        .filter((id) => id && id !== "None" && id.trim() !== ""),
    );
    // Calculate players by region
    const playersByRegion = new Map<string, number>();
    for (const s of summaries) {
      const region = s.country || "Desconhecido";
      playersByRegion.set(region, (playersByRegion.get(region) || 0) + 1);
    }
    // Sort by count descending
    const regionBreakdown = Array.from(playersByRegion.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    return {
      totalClubs: clubGroups.length,
      totalPlayers: summaries.length,
      totalAgents: uniqueAgents.size,
      totalWinnings: summaries.reduce(
        (sum, s) => sum + (s.playerWinningsTotal || 0),
        0,
      ),
      totalRake: summaries.reduce((sum, s) => sum + (s.feeGeneral || 0), 0),
      totalFee: summaries.reduce((sum, s) => sum + (s.fee || 0), 0),
      totalGap: summaries.reduce(
        (sum, s) => sum + ((s.generalTotal || 0) - (s.feeGeneral || 0)),
        0,
      ),
      regionBreakdown,
    };
  }, [clubGroups, summaries]);

  const toggleClub = (clubId: string) => {
    setExpandedClubs((prev) => ({ ...prev, [clubId]: !prev[clubId] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    filteredClubs.forEach((club) => {
      allExpanded[club.clubId] = true;
    });
    setExpandedClubs(allExpanded);
  };

  const collapseAll = () => {
    setExpandedClubs({});
  };

  if (summaries.length === 0) {
    return (
      <p className="text-center text-[#878787] py-8">
        Nenhum dado encontrado na aba Geral de Clube
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
            <span className="text-xs text-muted-foreground">Clubes:</span>
            <span className="text-sm font-semibold">
              {globalTotals.totalClubs}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Jogadores:</span>
            <span className="text-sm font-semibold">
              {globalTotals.totalPlayers}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Agentes (G):</span>
            <span className="text-sm font-semibold">
              {globalTotals.totalAgents}
            </span>
          </div>
        </div>

        {/* Row 2: Valores */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              Ganhos Total (J):
            </span>
            <span
              className={`text-sm font-semibold font-mono ${globalTotals.totalWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {globalTotals.totalWinnings.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              Taxa Total (AB):
            </span>
            <span className="text-sm font-semibold font-mono">
              {globalTotals.totalRake.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Taxa (AC):</span>
            <span className="text-sm font-semibold font-mono text-[#00C969]">
              {globalTotals.totalFee.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              Gap Total (O-AB):
            </span>
            <span
              className={`text-sm font-semibold font-mono ${globalTotals.totalGap >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {globalTotals.totalGap.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>

        {/* Row 3: Jogadores por Região */}
        <div className="pt-3 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            JOGADORES POR REGIÃO (Col. C)
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {globalTotals.regionBreakdown.map(([region, count]) => (
              <span
                key={region}
                className="text-muted-foreground whitespace-nowrap"
              >
                {region}:{" "}
                <span className="font-semibold text-foreground">{count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-[#878787]">
            {filteredClubs.length} clubes
          </p>
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Expandir todos
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Colapsar todos
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

      {/* Club List - Collapsible */}
      <div className="space-y-2">
        {filteredClubs.map((club) => (
          <div
            key={club.clubId}
            className="border rounded-lg overflow-hidden bg-background"
          >
            {/* Club Header Row */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggleClub(club.clubId)}
            >
              <div className="flex items-center gap-3">
                <Icons.ChevronRight
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    expandedClubs[club.clubId] ? "rotate-90" : ""
                  }`}
                />
                <span className="font-medium">{club.clubName}</span>
                {club.periodStart && club.periodEnd && (
                  <span className="text-sm text-muted-foreground">
                    {club.periodStart.replace(/\//g, "-")} -{" "}
                    {club.periodEnd.replace(/\//g, "-")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {club.totalPlayers} jogadores
                </span>
                <span className="text-sm text-muted-foreground">
                  {club.totalAgents} agentes
                </span>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground mr-1">
                    Saldo:
                  </span>
                  <span
                    className={`font-mono font-medium ${
                      club.totalBalance >= 0
                        ? "text-[#00C969]"
                        : "text-[#FF3638]"
                    }`}
                  >
                    {club.totalBalance.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground mr-1">
                    Taxa:
                  </span>
                  <span
                    className={`font-mono font-medium ${
                      club.totalFee >= 0 ? "text-[#00C969]" : "text-[#FF3638]"
                    }`}
                  >
                    {club.totalFee.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
                <div className="text-right min-w-[120px]">
                  <span className="text-sm text-muted-foreground mr-1">
                    Gap:
                  </span>
                  <span
                    className={`font-mono font-medium ${
                      club.totalGap >= 0 ? "text-[#00C969]" : "text-[#FF3638]"
                    }`}
                  >
                    {club.totalGap.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Expanded Content - Player Table */}
            {expandedClubs[club.clubId] && (
              <div className="border-t bg-muted/10 p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {PLAYER_COLUMNS.map((col) => (
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
                      {club.players.map((player, idx) => (
                        <tr
                          key={`${player.ppPokerId}-${idx}`}
                          className="hover:bg-muted/30"
                        >
                          {PLAYER_COLUMNS.map((col) => (
                            <td
                              key={col.key}
                              className={`p-2 whitespace-nowrap ${
                                col.type === "currency" || col.type === "number"
                                  ? "text-right font-mono"
                                  : col.type === "id"
                                    ? "font-mono text-[#878787]"
                                    : ""
                              } ${
                                col.type === "currency" &&
                                (player[
                                  col.key as keyof ParsedClubSummary
                                ] as number) < 0
                                  ? "text-[#FF3638]"
                                  : col.type === "currency"
                                    ? "text-[#00C969]"
                                    : ""
                              }`}
                            >
                              {formatValue(
                                player[col.key as keyof ParsedClubSummary],
                                col.type,
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-muted/50 font-semibold">
                        {PLAYER_COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className={`p-2 whitespace-nowrap ${
                              col.type === "currency" || col.type === "number"
                                ? "text-right font-mono"
                                : ""
                            }`}
                          >
                            {col.key === "ppPokerId"
                              ? "TOTAL"
                              : col.key === "nickname"
                                ? `${club.players.length} jogadores`
                                : col.type === "currency"
                                  ? formatValue(
                                      club.players.reduce(
                                        (sum, row) =>
                                          sum +
                                          ((row[
                                            col.key as keyof ParsedClubSummary
                                          ] as number) || 0),
                                        0,
                                      ),
                                      "currency",
                                    )
                                  : ""}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
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
