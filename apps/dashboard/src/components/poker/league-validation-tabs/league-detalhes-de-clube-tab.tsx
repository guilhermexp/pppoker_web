"use client";

import type { ParsedClubSummary } from "@/lib/poker/league-types";
import type { ParsedDetailed } from "@/lib/poker/types";
import { Badge } from "@midday/ui/badge";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { useMemo, useState } from "react";

type LeagueDetalhesDeClubeTabProps = {
  detailed: ParsedDetailed[];
  summaries?: ParsedClubSummary[];
};

// Game type categories with column ranges (organized like spreadsheet)
const GAME_CATEGORIES = [
  {
    name: "NLHoldem",
    colRange: "J-R",
    games: [
      { key: "nlhRegular", label: "Regular", col: "J" },
      { key: "nlhThreeOne", label: "3-1", col: "K" },
      { key: "nlhThreeOneF", label: "3-1F", col: "L" },
      { key: "nlhSixPlus", label: "6+", col: "M" },
      { key: "nlhAof", label: "AOF", col: "N" },
      { key: "nlhSitNGo", label: "SitNGo", col: "O" },
      { key: "nlhSpinUp", label: "SPINUP", col: "P" },
      { key: "nlhMtt", label: "MTT", col: "Q" },
      { key: "nlhMttSixPlus", label: "MTT 6+", col: "R" },
    ],
  },
  {
    name: "PLO",
    colRange: "S-AB",
    games: [
      { key: "plo4", label: "PLO4", col: "S" },
      { key: "plo5", label: "PLO5", col: "T" },
      { key: "plo6", label: "PLO6", col: "U" },
      { key: "plo4Hilo", label: "PLO4 H/L", col: "V" },
      { key: "plo5Hilo", label: "PLO5 H/L", col: "W" },
      { key: "plo6Hilo", label: "PLO6 H/L", col: "X" },
      { key: "ploSitNGo", label: "SitNGo", col: "Y" },
      { key: "ploMttPlo4", label: "MTT PLO4", col: "Z" },
      { key: "ploMttPlo5", label: "MTT PLO5", col: "AA" },
      { key: "ploNlh", label: "PLO NLH", col: "AB" },
    ],
  },
  {
    name: "FLASH",
    colRange: "AC-AD",
    games: [
      { key: "flashPlo4", label: "PLO4", col: "AC" },
      { key: "flashPlo5", label: "PLO5", col: "AD" },
    ],
  },
  {
    name: "Outros",
    colRange: "AE-AF",
    games: [
      { key: "mixedGame", label: "Mixed Game", col: "AE" },
      { key: "ofc", label: "OFC", col: "AF" },
    ],
  },
  {
    name: "SEKA",
    colRange: "AG-AI",
    games: [
      { key: "seka36", label: "36", col: "AG" },
      { key: "seka32", label: "32", col: "AH" },
      { key: "seka21", label: "21", col: "AI" },
    ],
  },
  {
    name: "TEEN PATTI",
    colRange: "AJ-AM",
    games: [
      { key: "teenPattiRegular", label: "Regular", col: "AJ" },
      { key: "teenPattiAk47", label: "AK47", col: "AK" },
      { key: "teenPattiHukam", label: "Hukam", col: "AL" },
      { key: "teenPattiMuflis", label: "Muflis", col: "AM" },
    ],
  },
  {
    name: "Filipinos",
    colRange: "AN-AO",
    games: [
      { key: "tongits", label: "Tongits", col: "AN" },
      { key: "pusoy", label: "Pusoy", col: "AO" },
    ],
  },
  {
    name: "Cassino",
    colRange: "AP-AU",
    games: [
      { key: "caribbean", label: "Caribbean+", col: "AP" },
      { key: "colorGame", label: "Color Game", col: "AQ" },
      { key: "crash", label: "Crash", col: "AR" },
      { key: "luckyDraw", label: "Lucky Draw", col: "AS" },
      { key: "jackpot", label: "Jackpot", col: "AT" },
      { key: "evSplitWinnings", label: "Dividir EV", col: "AU" },
    ],
  },
] as const;

// Flat list for counting (derived from categories)
const GAME_TYPES = GAME_CATEGORIES.flatMap((cat) =>
  cat.games.map((g) => ({ ...g, group: cat.name })),
);

// Grouped club data for detailed tab
type DetailedClubGroup = {
  clubId: string;
  clubName: string;
  players: ParsedDetailed[];
  totalPlayers: number;
  totalAgents: number;
  totalWinnings: number;
  totalFees: number;
  totalHands: number;
};

// Colunas resumidas - principais metricas
const SUMMARY_COLUMNS = [
  { key: "ppPokerId", label: "ID (B)", type: "id" },
  { key: "nickname", label: "Apelido (D)", type: "text" },
  { key: "agentNickname", label: "Agente (F)", type: "text" },
  { key: "totalWinnings", label: "Total (AV)", type: "currency" },
  { key: "generalPlusEvents", label: "Ganhos+Eventos (BA)", type: "currency" },
  { key: "jackpot", label: "Jackpot (AT)", type: "currency" },
  { key: "evSplitWinnings", label: "Dividir EV (AU)", type: "currency" },
  { key: "feeTotal", label: "Taxa Total (CJ)", type: "currency" },
  { key: "handsTotal", label: "Maos (EG)", type: "number" },
] as const;

// Todas as colunas (51 campos principais)
const ALL_COLUMNS = [
  { key: "date", label: "Data (A)", type: "text", group: "Identificacao" },
  { key: "ppPokerId", label: "ID (B)", type: "id", group: "Identificacao" },
  { key: "country", label: "Pais (C)", type: "text", group: "Identificacao" },
  {
    key: "nickname",
    label: "Apelido (D)",
    type: "text",
    group: "Identificacao",
  },
  {
    key: "memoName",
    label: "Memorando (E)",
    type: "text",
    group: "Identificacao",
  },
  {
    key: "agentNickname",
    label: "Agente (F)",
    type: "text",
    group: "Identificacao",
  },
  {
    key: "agentPpPokerId",
    label: "ID Agente (G)",
    type: "id",
    group: "Identificacao",
  },
  {
    key: "superAgentNickname",
    label: "Superagente (H)",
    type: "text",
    group: "Identificacao",
  },
  {
    key: "superAgentPpPokerId",
    label: "ID Super (I)",
    type: "id",
    group: "Identificacao",
  },
  { key: "nlhRegular", label: "NLH Reg (J)", type: "currency", group: "NLH" },
  {
    key: "totalWinnings",
    label: "Total (AV)",
    type: "currency",
    group: "Totais",
  },
  {
    key: "generalPlusEvents",
    label: "Ganhos+Eventos (BA)",
    type: "currency",
    group: "Valores",
  },
  {
    key: "feeTotal",
    label: "Taxa Total (CJ)",
    type: "currency",
    group: "Taxas",
  },
  {
    key: "handsTotal",
    label: "Total Maos (EG)",
    type: "number",
    group: "Maos",
  },
] as const;

export function LeagueDetalhesDeClubeTab({
  detailed,
  summaries = [],
}: LeagueDetalhesDeClubeTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [showDifference, setShowDifference] = useState(false);
  const [expandedClubs, setExpandedClubs] = useState<Record<string, boolean>>(
    {},
  );

  // Helper to validate IDs
  const isValidId = (id: string | null | undefined) =>
    id &&
    id.trim() !== "" &&
    id.toLowerCase() !== "(none)" &&
    id.toLowerCase() !== "none";

  // Group players by club
  const clubGroups = useMemo(() => {
    const groups = new Map<string, DetailedClubGroup>();

    for (const player of detailed) {
      const clubId = player.clubId || "unknown";
      const clubName = player.clubName || "Clube Desconhecido";

      if (!groups.has(clubId)) {
        groups.set(clubId, {
          clubId,
          clubName,
          players: [],
          totalPlayers: 0,
          totalAgents: 0,
          totalWinnings: 0,
          totalFees: 0,
          totalHands: 0,
        });
      }

      const group = groups.get(clubId)!;
      group.players.push(player);
      group.totalPlayers++;
      group.totalWinnings += player.totalWinnings || 0;
      group.totalFees += player.feeTotal || 0;
      group.totalHands += player.handsTotal || 0;
    }

    // Calculate unique agents per club
    for (const group of groups.values()) {
      const uniqueAgents = new Set(
        group.players.map((p) => p.agentPpPokerId).filter(isValidId),
      );
      group.totalAgents = uniqueAgents.size;
    }

    return Array.from(groups.values());
  }, [detailed]);

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

  // Compare IDs between Geral (summaries) and Detalhado (detailed)
  const geralIds = new Set(summaries.map((s) => s.ppPokerId));
  const detailedIds = new Set(detailed.map((d) => d.ppPokerId));

  // Get unique IDs only in Detalhado (not in Geral)
  const onlyInDetailedIds = [...detailedIds].filter((id) => !geralIds.has(id));
  const onlyInDetailed = onlyInDetailedIds.map((id) => {
    const rows = detailed.filter((d) => d.ppPokerId === id);
    const totalWinnings = rows.reduce(
      (sum, r) => sum + (r.totalWinnings || 0),
      0,
    );
    return {
      ppPokerId: id,
      nickname: rows[0]?.nickname || "",
      totalWinnings,
    };
  });

  const columns = expanded ? ALL_COLUMNS : SUMMARY_COLUMNS;

  // Calculate global totals for summary cards
  const globalTotals = useMemo(() => {
    const uniqueAgents = new Set(
      detailed.map((d) => d.agentPpPokerId).filter(isValidId),
    );
    const uniqueSuperAgents = new Set(
      detailed.map((d) => d.superAgentPpPokerId).filter(isValidId),
    );
    const activeGameTypes = GAME_TYPES.filter((gt) =>
      detailed.some((d) => (d[gt.key as keyof ParsedDetailed] as number) !== 0),
    );

    return {
      totalClubs: clubGroups.length,
      totalPlayers: detailed.length,
      totalAgents: uniqueAgents.size,
      totalSuperAgents: uniqueSuperAgents.size,
      activeGameTypes,
      totalWinnings: detailed.reduce(
        (sum, d) => sum + (d.totalWinnings || 0),
        0,
      ),
      totalJackpot: detailed.reduce((sum, d) => sum + (d.jackpot || 0), 0),
      totalEvSplit: detailed.reduce(
        (sum, d) => sum + (d.evSplitWinnings || 0),
        0,
      ),
      totalGeneralPlusEvents: detailed.reduce(
        (sum, d) => sum + (d.generalPlusEvents || 0),
        0,
      ),
      totalHands: detailed.reduce((sum, d) => sum + (d.handsTotal || 0), 0),
      totalFees: detailed.reduce((sum, d) => sum + (d.feeTotal || 0), 0),
    };
  }, [detailed, clubGroups]);

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

  if (detailed.length === 0) {
    return (
      <p className="text-center text-[#878787] py-8">
        Nenhum dado encontrado na aba Detalhes de Clube
      </p>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Difference Alert */}
      {onlyInDetailed.length > 0 && (
        <div className="border rounded-lg bg-amber-500/10 border-amber-500/30 p-3">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowDifference(!showDifference)}
          >
            <div className="flex items-center gap-2">
              <Icons.AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-600">
                IDs nao encontrados na aba Geral
              </span>
              <Badge
                variant="outline"
                className="text-xs border-amber-500/30 text-amber-600"
              >
                {onlyInDetailed.length} jogador(es)
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Geral: {geralIds.size} | Detalhado: {detailedIds.size} IDs
                unicos
              </span>
              <Icons.ChevronDown
                className={`w-4 h-4 text-amber-500 transition-transform ${showDifference ? "rotate-180" : ""}`}
              />
            </div>
          </div>

          {showDifference && (
            <div className="mt-3 pt-3 border-t border-amber-500/20">
              <div className="border rounded-lg bg-background p-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Estes jogadores aparecem na aba Detalhado mas nao na aba
                  Geral:
                </p>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 font-medium">ID</th>
                        <th className="text-left py-1 font-medium">Apelido</th>
                        <th className="text-right py-1 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {onlyInDetailed.map((d, idx) => (
                        <tr key={`${d.ppPokerId}-${idx}`}>
                          <td className="py-1 font-mono text-muted-foreground">
                            {d.ppPokerId}
                          </td>
                          <td className="py-1">{d.nickname}</td>
                          <td
                            className={`py-1 text-right font-mono ${d.totalWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
                          >
                            {d.totalWinnings.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
            <span className="text-xs text-muted-foreground">
              Jogadores (B):
            </span>
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
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Superag. (I):</span>
            <span className="text-sm font-semibold">
              {globalTotals.totalSuperAgents}
            </span>
          </div>
        </div>

        {/* Row 2: Valores */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              Total Ganhos (AV):
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
              Ganhos+Ev (BA):
            </span>
            <span
              className={`text-sm font-semibold font-mono ${globalTotals.totalGeneralPlusEvents >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {globalTotals.totalGeneralPlusEvents.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Jackpot (AT):</span>
            <span
              className={`text-sm font-semibold font-mono ${globalTotals.totalJackpot >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {globalTotals.totalJackpot.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              Dividir EV (AU):
            </span>
            <span
              className={`text-sm font-semibold font-mono ${globalTotals.totalEvSplit >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
            >
              {globalTotals.totalEvSplit.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Taxa (CJ):</span>
            <span className="text-sm font-semibold font-mono">
              {globalTotals.totalFees.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Mãos (EG):</span>
            <span className="text-sm font-semibold font-mono">
              {globalTotals.totalHands.toLocaleString("pt-BR")}
            </span>
          </div>
        </div>

        {/* Row 3: Tipos de Jogo - Bullet list */}
        <div className="pt-3 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            TIPOS DE JOGO
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {GAME_CATEGORIES.map((category, idx) => {
              const activeInCategory = category.games.filter((g) =>
                detailed.some(
                  (d) => (d[g.key as keyof ParsedDetailed] as number) !== 0,
                ),
              );
              const colors = [
                "#22c55e",
                "#f97316",
                "#eab308",
                "#3b82f6",
                "#ec4899",
                "#8b5cf6",
                "#06b6d4",
                "#ef4444",
              ];
              const color = colors[idx % colors.length];

              return (
                <div key={category.name} className="flex items-center gap-1">
                  <span className="text-sm" style={{ color }}>
                    ●
                  </span>
                  <span className="text-xs text-foreground">
                    {category.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {activeInCategory.length}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Detalhado */}
          <div className="mt-2 text-[11px] text-muted-foreground">
            <span className="mr-2">Detalhado:</span>
            {GAME_CATEGORIES.map((category, idx) => {
              const categoryTotal = detailed.reduce((sum, d) => {
                return (
                  sum +
                  category.games.reduce((gameSum, g) => {
                    return (
                      gameSum +
                      ((d[g.key as keyof ParsedDetailed] as number) || 0)
                    );
                  }, 0)
                );
              }, 0);
              const activeCount = category.games.filter((g) =>
                detailed.some(
                  (d) => (d[g.key as keyof ParsedDetailed] as number) !== 0,
                ),
              ).length;

              if (activeCount === 0) return null;

              return (
                <span key={category.name} className="whitespace-nowrap mr-3">
                  {category.name}/{category.colRange}:{" "}
                  <span
                    className={`font-mono font-medium ${categoryTotal >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}
                  >
                    {categoryTotal.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </span>
              );
            })}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <Icons.ChevronLeft className="w-4 h-4 mr-1" />
                Resumido
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

      {/* Club List - Collapsible */}
      <div className="space-y-2">
        {/* Header row with column legends */}
        <div className="flex items-center justify-end px-4 py-1 text-[10px] text-muted-foreground/70">
          <div className="flex items-center gap-4">
            <span className="w-[90px]"></span>
            <span className="w-[70px]"></span>
            <span className="w-[130px] text-right">Ganhos (Col. AV)</span>
            <span className="w-[130px] text-right">Taxa (Col. CJ)</span>
            <span className="w-[100px] text-right">Mãos (Col. EG)</span>
          </div>
        </div>
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
                    Ganhos:
                  </span>
                  <span
                    className={`font-mono font-medium ${
                      club.totalWinnings >= 0
                        ? "text-[#00C969]"
                        : "text-[#FF3638]"
                    }`}
                  >
                    {club.totalWinnings.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground mr-1">
                    Taxa:
                  </span>
                  <span className="font-mono font-medium text-[#00C969]">
                    {club.totalFees.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
                <div className="text-right min-w-[100px]">
                  <span className="text-sm text-muted-foreground mr-1">
                    Mãos:
                  </span>
                  <span className="font-mono font-medium">
                    {club.totalHands.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>

            {/* Expanded Content - Player Table */}
            {expandedClubs[club.clubId] && (
              <div className="border-t bg-muted/10 p-4">
                <div className="overflow-x-auto">
                  <table
                    className={`w-full text-xs ${expanded ? "min-w-[2000px]" : "min-w-[1200px]"}`}
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
                      {club.players.map((player, idx) => (
                        <tr
                          key={`${player.ppPokerId}-${idx}`}
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
                                    : ""
                              } ${
                                col.type === "currency" &&
                                (player[
                                  col.key as keyof ParsedDetailed
                                ] as number) < 0
                                  ? "text-[#FF3638]"
                                  : col.type === "currency"
                                    ? "text-[#00C969]"
                                    : ""
                              }`}
                            >
                              {formatValue(
                                player[col.key as keyof ParsedDetailed],
                                col.type,
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-muted/50 font-semibold">
                        {columns.map((col) => (
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
                                            col.key as keyof ParsedDetailed
                                          ] as number) || 0),
                                        0,
                                      ),
                                      "currency",
                                    )
                                  : col.type === "number"
                                    ? formatValue(
                                        club.players.reduce(
                                          (sum, row) =>
                                            sum +
                                            ((row[
                                              col.key as keyof ParsedDetailed
                                            ] as number) || 0),
                                          0,
                                        ),
                                        "number",
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
