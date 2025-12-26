"use client";

import type { ParsedSession } from "@/lib/poker/types";
import { Button } from "@midday/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@midday/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@midday/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midday/ui/table";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Trophy,
  Users,
} from "lucide-react";
import React, { memo, useMemo, useState } from "react";

type LeaguePartidasTabProps = {
  sessions: ParsedSession[];
  period?: {
    start: string;
    end: string;
  };
};

const ITEMS_PER_PAGE = 50;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

// Determine table type based on session variant
type TableType = "PPST_MTT" | "PPST_SPINUP" | "PPST_PKO" | "PPSR";

function getTableType(gameVariant: string): TableType {
  const upper = gameVariant.toUpperCase();
  if (upper.includes("PPSR")) return "PPSR";
  if (upper.includes("SPINUP") || upper.includes("SPIN")) return "PPST_SPINUP";
  if (upper.includes("PKO")) return "PPST_PKO";
  return "PPST_MTT";
}

// Column configs for each table type
const TABLE_COLUMN_CONFIGS = {
  PPST_MTT: {
    colG: { label: "#", field: "ranking", isRanking: true },
    colH: { label: "Buy-in", field: "buyInChips" },
    colI: { label: "Ticket", field: "buyInTicket" },
    colJ: { label: "Ganhos", field: "winnings" },
    colK: { label: "Taxa", field: "rake" },
    hasColL: false,
  },
  PPST_SPINUP: {
    colG: { label: "#", field: "ranking", isRanking: true },
    colH: { label: "Buy-in", field: "buyInChips" },
    colI: { label: "Prêmio", field: "prize" }, // Prize instead of Ticket
    colJ: { label: "Ganhos", field: "winnings" },
    colK: null, // No rake column for SPINUP
    hasColL: false,
  },
  PPST_PKO: {
    colG: { label: "#", field: "ranking", isRanking: true },
    colH: { label: "Buy-in", field: "buyInChips" },
    colI: { label: "Ticket", field: "buyInTicket" },
    colJ: { label: "Ganhos", field: "winnings" },
    colK: { label: "Bounty", field: "bounty" }, // Bounty column
    hasColL: true, // Has Taxa in col L
  },
  PPSR: {
    colG: { label: "Buy-in", field: "buyInChips", isRanking: false }, // No ranking for cash
    colH: { label: "Mãos", field: "hands" }, // Hands instead of Buy-in
    colI: { label: "Ganhos", field: "winnings" }, // Winnings in I
    colJ: null, // Cash has different structure
    colK: { label: "Taxa", field: "rake" },
    hasColL: false,
  },
};

// Memoized session content - only renders when expanded
const SessionContent = memo(function SessionContent({
  session,
}: {
  session: ParsedSession;
}) {
  const players = session.players || [];
  const tableType = getTableType(session.gameVariant || "");
  const colConfig = TABLE_COLUMN_CONFIGS[tableType];

  // Calculate totals from players
  const totalBuyInChips = players.reduce((s, p) => s + (p.buyInChips ?? p.buyIn ?? 0), 0);
  const totalBuyInTicket = players.reduce((s, p) => s + (p.buyInTicket ?? 0), 0);
  const totalPrize = players.reduce((s, p) => s + (p.prize ?? 0), 0);
  const totalBounty = players.reduce((s, p) => s + (p.bounty ?? 0), 0);
  const totalHands = players.reduce((s, p) => s + (p.hands ?? 0), 0);
  const totalWinnings = players.reduce((s, p) => s + (p.winnings ?? 0), 0);
  const totalRake = players.reduce((s, p) => s + (p.rake ?? 0), 0);

  // Helper to get player value by field name
  const getPlayerValue = (player: NonNullable<ParsedSession["players"]>[number], field: string): number => {
    return (player as Record<string, number | undefined>)[field] ?? 0;
  };

  return (
    <div className="px-4 pb-4 space-y-4">
      {/* Session Metadata */}
      <div className="flex flex-wrap gap-4 text-sm bg-muted/30 rounded-lg p-3">
        <div>
          <span className="text-muted-foreground">Tipo:</span>{" "}
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{tableType}</span>
        </div>
        {session.startedAt && (
          <div>
            <span className="text-muted-foreground">Início:</span>{" "}
            {session.startedAt}
          </div>
        )}
        {session.endedAt && (
          <div>
            <span className="text-muted-foreground">Fim:</span>{" "}
            {session.endedAt}
          </div>
        )}
        {session.createdByNickname && (
          <div>
            <span className="text-muted-foreground">Criador:</span>{" "}
            {session.createdByNickname}
            {session.createdByPpPokerId && ` (${session.createdByPpPokerId})`}
          </div>
        )}
        {session.blinds && (
          <div>
            <span className="text-muted-foreground">Blinds:</span>{" "}
            {session.blinds}
          </div>
        )}
      </div>

      {/* Players Table */}
      {players.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Fixed Columns B-F */}
                <TableHead className="w-[70px]">
                  <div className="text-[9px] text-muted-foreground">col. B</div>
                  ID Clube
                </TableHead>
                <TableHead>
                  <div className="text-[9px] text-muted-foreground">col. C</div>
                  Clube
                </TableHead>
                <TableHead className="w-[80px]">
                  <div className="text-[9px] text-muted-foreground">col. D</div>
                  ID Jog.
                </TableHead>
                <TableHead>
                  <div className="text-[9px] text-muted-foreground">col. E</div>
                  Apelido
                </TableHead>
                <TableHead>
                  <div className="text-[9px] text-muted-foreground">col. F</div>
                  Nome Memo
                </TableHead>
                {/* Dynamic Columns G+ */}
                <TableHead className={colConfig.colG.isRanking ? "w-[50px]" : "text-right"}>
                  <div className="text-[9px] text-muted-foreground">col. G</div>
                  {colConfig.colG.label}
                </TableHead>
                <TableHead className="text-right">
                  <div className="text-[9px] text-muted-foreground">col. H</div>
                  {colConfig.colH.label}
                </TableHead>
                <TableHead className="text-right">
                  <div className="text-[9px] text-muted-foreground">col. I</div>
                  {colConfig.colI.label}
                </TableHead>
                {colConfig.colJ && (
                  <TableHead className="text-right">
                    <div className="text-[9px] text-muted-foreground">col. J</div>
                    {colConfig.colJ.label}
                  </TableHead>
                )}
                {colConfig.colK && (
                  <TableHead className="text-right">
                    <div className="text-[9px] text-muted-foreground">col. K</div>
                    {colConfig.colK.label}
                  </TableHead>
                )}
                {colConfig.hasColL && (
                  <TableHead className="text-right">
                    <div className="text-[9px] text-muted-foreground">col. L</div>
                    Taxa
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player, idx) => (
                <TableRow key={`${player.ppPokerId}-${idx}`}>
                  {/* Fixed Columns B-F */}
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {player.clubId || "-"}
                  </TableCell>
                  <TableCell
                    className="text-xs truncate max-w-[100px]"
                    title={player.clubName || ""}
                  >
                    {player.clubName || "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {player.ppPokerId}
                  </TableCell>
                  <TableCell className="font-medium">
                    {player.nickname}
                  </TableCell>
                  <TableCell
                    className="text-xs text-muted-foreground truncate max-w-[120px]"
                    title={player.memoName || ""}
                  >
                    {player.memoName || "-"}
                  </TableCell>
                  {/* Dynamic Columns G+ */}
                  <TableCell className={colConfig.colG.isRanking ? "font-medium text-center" : "text-right"}>
                    {colConfig.colG.isRanking
                      ? (getPlayerValue(player, colConfig.colG.field) || "-")
                      : formatNumber(getPlayerValue(player, colConfig.colG.field))}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(getPlayerValue(player, colConfig.colH.field))}
                  </TableCell>
                  <TableCell className={`text-right ${colConfig.colI.field === "winnings" ? (getPlayerValue(player, "winnings") > 0 ? "text-green-600 font-medium" : getPlayerValue(player, "winnings") < 0 ? "text-red-600 font-medium" : "") : ""}`}>
                    {colConfig.colI.field === "winnings"
                      ? formatCurrency(getPlayerValue(player, colConfig.colI.field))
                      : formatNumber(getPlayerValue(player, colConfig.colI.field))}
                  </TableCell>
                  {colConfig.colJ && (
                    <TableCell
                      className={`text-right font-medium ${getPlayerValue(player, colConfig.colJ.field) > 0 ? "text-green-600" : getPlayerValue(player, colConfig.colJ.field) < 0 ? "text-red-600" : ""}`}
                    >
                      {formatCurrency(getPlayerValue(player, colConfig.colJ.field))}
                    </TableCell>
                  )}
                  {colConfig.colK && (
                    <TableCell className="text-right">
                      {colConfig.colK.field === "bounty"
                        ? formatCurrency(getPlayerValue(player, colConfig.colK.field))
                        : formatCurrency(getPlayerValue(player, colConfig.colK.field))}
                    </TableCell>
                  )}
                  {colConfig.hasColL && (
                    <TableCell className="text-right">
                      {formatCurrency(player.rake ?? 0)}
                    </TableCell>
                  )}
                </TableRow>
              ))}

              {/* Total Row */}
              <TableRow className="bg-muted/50 font-medium border-t-2">
                <TableCell className="text-muted-foreground">-</TableCell>
                <TableCell className="text-muted-foreground">-</TableCell>
                <TableCell className="text-muted-foreground">-</TableCell>
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-muted-foreground">-</TableCell>
                <TableCell className={colConfig.colG.isRanking ? "font-bold text-center" : "text-right font-bold"}>
                  {colConfig.colG.isRanking ? "-" : formatNumber(totalBuyInChips)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {tableType === "PPSR" ? formatNumber(totalHands) : formatNumber(totalBuyInChips)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {tableType === "PPST_SPINUP"
                    ? formatNumber(totalPrize)
                    : tableType === "PPSR"
                      ? formatCurrency(totalWinnings)
                      : formatNumber(totalBuyInTicket)}
                </TableCell>
                {colConfig.colJ && (
                  <TableCell className="text-right font-bold">
                    {formatCurrency(totalWinnings)}
                  </TableCell>
                )}
                {colConfig.colK && (
                  <TableCell className="text-right font-bold text-green-600">
                    {tableType === "PPST_PKO"
                      ? formatCurrency(totalBounty)
                      : formatCurrency(totalRake)}
                  </TableCell>
                )}
                {colConfig.hasColL && (
                  <TableCell className="text-right font-bold text-green-600">
                    {formatCurrency(totalRake)}
                  </TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4">
          Nenhum jogador encontrado nesta partida.
        </div>
      )}
    </div>
  );
});

// Game type categories for filtering and stats
type GameCategory = "mtt" | "spin" | "pko" | "mko" | "sat" | "cash_nlh" | "cash_plo" | "cash_plo5" | "cash_plo6" | "cash_ofc" | "sitng";

// Helper to determine game type from variant string
function getGameTypeInfo(gameVariant: string): {
  label: string;
  badgeClass: string;
  category: GameCategory;
  isPPST: boolean;
  isPPSR: boolean;
} {
  const variant = gameVariant.toUpperCase();
  const isPPST = variant.includes("PPST");
  const isPPSR = variant.includes("PPSR");

  // ========== PPST TOURNAMENTS ==========

  // SPINUP - Pink (must check before other PPST)
  if (variant.includes("SPINUP")) {
    return { label: "SPIN", badgeClass: "bg-pink-500 text-white", category: "spin", isPPST: true, isPPSR: false };
  }

  // PKO - Progressive Knockout - Orange
  if (variant.includes("PKO")) {
    return { label: "PKO", badgeClass: "bg-orange-500 text-white", category: "pko", isPPST: true, isPPSR: false };
  }

  // MKO - Mystery Knockout - Orange (darker)
  if (variant.includes("MKO")) {
    return { label: "MKO", badgeClass: "bg-orange-600 text-white", category: "mko", isPPST: true, isPPSR: false };
  }

  // SAT - Satellite - Cyan
  if (variant.includes("SAT") || variant.includes("SATELLITE")) {
    return { label: "SAT", badgeClass: "bg-cyan-500 text-white", category: "sat", isPPST: true, isPPSR: false };
  }

  // SIT&GO - Purple
  if (variant.includes("SNG") || variant.includes("SITNG") || variant.includes("SIT&GO") || variant.includes("SITNGO")) {
    return { label: "SITNG", badgeClass: "bg-purple-500 text-white", category: "sitng", isPPST: true, isPPSR: false };
  }

  // ========== PPSR CASH GAMES ==========

  if (isPPSR) {
    // PLO6 - Teal
    if (variant.includes("PLO6")) {
      return { label: "PLO6", badgeClass: "bg-teal-500 text-white", category: "cash_plo6", isPPST: false, isPPSR: true };
    }
    // PLO5 - Purple
    if (variant.includes("PLO5")) {
      return { label: "PLO5", badgeClass: "bg-purple-500 text-white", category: "cash_plo5", isPPST: false, isPPSR: true };
    }
    // PLO (PLO4) - Purple (lighter)
    if (variant.includes("PLO")) {
      return { label: "PLO", badgeClass: "bg-purple-400 text-white", category: "cash_plo", isPPST: false, isPPSR: true };
    }
    // OFC - Amber
    if (variant.includes("OFC")) {
      return { label: "OFC", badgeClass: "bg-amber-500 text-white", category: "cash_ofc", isPPST: false, isPPSR: true };
    }
    // Default PPSR = NLH Cash - Green
    return { label: "NLH", badgeClass: "bg-green-600 text-white", category: "cash_nlh", isPPST: false, isPPSR: true };
  }

  // ========== PPST DEFAULT (MTT) ==========
  if (isPPST) {
    return { label: "MTT", badgeClass: "bg-blue-500 text-white", category: "mtt", isPPST: true, isPPSR: false };
  }

  // ========== FALLBACKS ==========

  // Cash game fallbacks
  if (variant.includes("CASH") || variant.includes("RING")) {
    return { label: "CASH", badgeClass: "bg-green-600 text-white", category: "cash_nlh", isPPST: false, isPPSR: true };
  }

  // Default to MTT
  return { label: "MTT", badgeClass: "bg-blue-500 text-white", category: "mtt", isPPST: true, isPPSR: false };
}

// Memoized session item - compact row style
const SessionItem = memo(function SessionItem({
  session,
  isOpen,
  onToggle,
  index,
}: {
  session: ParsedSession;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const gameType = session.gameVariant || session.sessionType || "MTT";
  const playerCount = session.playerCount ?? session.players?.length ?? 0;

  // Determine badge style based on game type
  const typeInfo = getGameTypeInfo(gameType);
  const badgeClass = typeInfo.badgeClass;
  const typeLabel = typeInfo.label;

  // Format buy-in display
  const buyInDisplay = session.buyInAmount
    ? formatNumber(session.buyInAmount)
    : "-";

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center w-full px-3 py-1.5 hover:bg-muted/30 border-b border-border/50 text-xs">
        {/* Expand icon */}
        {isOpen ? (
          <ChevronDown className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
        )}

        {/* Index number */}
        <span className="text-muted-foreground/60 font-mono w-[40px] text-right mr-2 flex-shrink-0">
          {index}
        </span>

        {/* Type badge */}
        <span
          className={`${badgeClass} px-1.5 py-0.5 rounded text-[10px] font-medium mr-2 flex-shrink-0`}
        >
          {typeLabel}
        </span>

        {/* Game variant */}
        <span
          className="font-medium truncate max-w-[120px] mr-2"
          title={gameType}
        >
          {gameType}
        </span>

        {/* Table name */}
        <span
          className="text-muted-foreground truncate max-w-[150px] mr-2"
          title={session.tableName || ""}
        >
          {session.tableName || "-"}
        </span>

        {/* ID */}
        <span className="text-muted-foreground font-mono mr-3 flex-shrink-0">
          {session.externalId || "-"}
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Players */}
        <span className="text-muted-foreground mr-3 flex-shrink-0">
          <Users className="h-3 w-3 inline mr-0.5" />
          {playerCount}
        </span>

        {/* Buy-in */}
        <span className="text-muted-foreground mr-3 flex-shrink-0 font-mono">
          {buyInDisplay}
        </span>

        {/* GTD */}
        {session.guaranteedPrize ? (
          <span className="text-yellow-500 font-medium mr-3 flex-shrink-0">
            GTD {formatNumber(session.guaranteedPrize)}
          </span>
        ) : (
          <span className="text-muted-foreground/50 mr-3 flex-shrink-0 w-[80px]">
            -
          </span>
        )}

        {/* Date/time */}
        <span className="text-muted-foreground flex-shrink-0">
          {session.startedAt || "-"}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        {isOpen && <SessionContent session={session} />}
      </CollapsibleContent>
    </Collapsible>
  );
});

// Filter options for session types
type SessionFilter = "all" | "ppst" | "ppsr" | "mtt" | "spin" | "pko" | "mko" | "sat" | "sitng" | "nlh" | "plo" | "gtd";

const FILTER_OPTIONS: { value: SessionFilter; label: string; group?: "ppst" | "ppsr" }[] = [
  { value: "all", label: "Todos" },
  { value: "ppst", label: "PPST (Torneios)" },
  { value: "ppsr", label: "PPSR (Cash)" },
  { value: "mtt", label: "MTT", group: "ppst" },
  { value: "spin", label: "SPIN", group: "ppst" },
  { value: "pko", label: "PKO", group: "ppst" },
  { value: "mko", label: "MKO", group: "ppst" },
  { value: "sat", label: "SAT", group: "ppst" },
  { value: "sitng", label: "SIT&GO", group: "ppst" },
  { value: "nlh", label: "NLH", group: "ppsr" },
  { value: "plo", label: "PLO (todos)", group: "ppsr" },
  { value: "gtd", label: "Com GTD" },
];

export function LeaguePartidasTab({ sessions, period }: LeaguePartidasTabProps) {
  const [openSessions, setOpenSessions] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<SessionFilter>("all");

  // Filter data based on selected type
  const filteredData = useMemo(() => {
    if (typeFilter === "all") return sessions;

    return sessions.filter((session) => {
      const gameTypeStr = session.gameVariant || session.sessionType || "";
      const typeInfo = getGameTypeInfo(gameTypeStr);
      const hasGTD = session.guaranteedPrize && session.guaranteedPrize > 0;

      switch (typeFilter) {
        // Main groups
        case "ppst":
          return typeInfo.isPPST;
        case "ppsr":
          return typeInfo.isPPSR;
        // PPST subtypes
        case "mtt":
          return typeInfo.category === "mtt";
        case "spin":
          return typeInfo.category === "spin";
        case "pko":
          return typeInfo.category === "pko";
        case "mko":
          return typeInfo.category === "mko";
        case "sat":
          return typeInfo.category === "sat";
        case "sitng":
          return typeInfo.category === "sitng";
        // PPSR subtypes
        case "nlh":
          return typeInfo.category === "cash_nlh";
        case "plo":
          return typeInfo.category === "cash_plo" || typeInfo.category === "cash_plo5" || typeInfo.category === "cash_plo6";
        // Special filters
        case "gtd":
          return hasGTD;
        default:
          return true;
      }
    });
  }, [sessions, typeFilter]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  // Reset to page 1 when filter changes
  const handleFilterChange = (value: SessionFilter) => {
    setTypeFilter(value);
    setCurrentPage(1);
    setOpenSessions(new Set());
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const uniquePlayerIds = new Set<string | number>();
    let totalBuyIn = 0;
    let totalWinnings = 0;
    let totalRake = 0;
    let totalGTD = 0;
    let gtdCount = 0;

    // PPST counts
    let ppstCount = 0;
    let mttCount = 0;
    let spinCount = 0;
    let pkoCount = 0;
    let mkoCount = 0;
    let satCount = 0;
    let sitngCount = 0;

    // PPSR counts
    let ppsrCount = 0;
    let nlhCount = 0;
    let ploCount = 0;
    let plo5Count = 0;
    let plo6Count = 0;
    let ofcCount = 0;

    for (const session of sessions) {
      // Count unique players
      if (session.players) {
        for (const player of session.players) {
          if (player.ppPokerId) {
            uniquePlayerIds.add(player.ppPokerId);
          }
        }
      }

      // Calculate totals
      totalBuyIn += session.totalBuyIn ?? 0;
      totalWinnings += session.totalWinnings ?? 0;
      totalRake += session.totalRake ?? 0;

      if (session.guaranteedPrize && session.guaranteedPrize > 0) {
        totalGTD += session.guaranteedPrize;
        gtdCount++;
      }

      // Count by type using the helper function
      const gameTypeStr = session.gameVariant || session.sessionType || "";
      const typeInfo = getGameTypeInfo(gameTypeStr);

      if (typeInfo.isPPST) ppstCount++;
      if (typeInfo.isPPSR) ppsrCount++;

      switch (typeInfo.category) {
        case "mtt":
          mttCount++;
          break;
        case "spin":
          spinCount++;
          break;
        case "pko":
          pkoCount++;
          break;
        case "mko":
          mkoCount++;
          break;
        case "sat":
          satCount++;
          break;
        case "sitng":
          sitngCount++;
          break;
        case "cash_nlh":
          nlhCount++;
          break;
        case "cash_plo":
          ploCount++;
          break;
        case "cash_plo5":
          plo5Count++;
          break;
        case "cash_plo6":
          plo6Count++;
          break;
        case "cash_ofc":
          ofcCount++;
          break;
      }
    }

    const totalGap = totalGTD - totalBuyIn;

    return {
      totalSessions: sessions.length,
      totalPlayers: uniquePlayerIds.size,
      totalBuyIn,
      totalWinnings,
      totalRake,
      totalGTD,
      gtdCount,
      totalGap,
      // PPST
      ppstCount,
      mttCount,
      spinCount,
      pkoCount,
      mkoCount,
      satCount,
      sitngCount,
      // PPSR
      ppsrCount,
      nlhCount,
      ploCount,
      plo5Count,
      plo6Count,
      ofcCount,
    };
  }, [sessions]);

  // Get paginated data from filtered results
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage]);

  // Calculate the actual index in the full dataset
  const getGlobalIndex = (pageIndex: number) => {
    return (currentPage - 1) * ITEMS_PER_PAGE + pageIndex;
  };

  const toggleSession = (globalIndex: number) => {
    setOpenSessions((prev) => {
      const newOpen = new Set(prev);
      if (newOpen.has(globalIndex)) {
        newOpen.delete(globalIndex);
      } else {
        newOpen.add(globalIndex);
      }
      return newOpen;
    });
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setOpenSessions(new Set());
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Nenhum dado encontrado na aba Partidas
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="border rounded-lg bg-muted/20 p-4 space-y-3">
        {/* Row 1: Contagens */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Partidas:</span>
            <span className="text-sm font-semibold">{formatNumber(summaryStats.totalSessions)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Jogadores:</span>
            <span className="text-sm font-semibold">{formatNumber(summaryStats.totalPlayers)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">c/ GTD:</span>
            <span className="text-sm font-semibold text-yellow-500">{formatNumber(summaryStats.gtdCount)}</span>
          </div>
        </div>

        {/* Row 2: Valores */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Buy-in Total (H):</span>
            <span className="text-sm font-semibold font-mono">{formatNumber(summaryStats.totalBuyIn)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Taxa Total (K):</span>
            <span className="text-sm font-semibold font-mono text-[#00C969]">{formatCurrency(summaryStats.totalRake)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Total GTD:</span>
            <span className="text-sm font-semibold font-mono text-yellow-500">{formatNumber(summaryStats.totalGTD)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Ganhos Totais (J):</span>
            <span className={`text-sm font-semibold font-mono ${summaryStats.totalWinnings >= 0 ? "text-[#00C969]" : "text-[#FF3638]"}`}>
              {formatCurrency(summaryStats.totalWinnings)}
            </span>
          </div>
        </div>

        {/* Row 3: PPST (Torneios) */}
        <div className="pt-3 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            PPST (TORNEIOS) <span className="text-blue-500 font-semibold">{formatNumber(summaryStats.ppstCount)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {summaryStats.mttCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-blue-500">●</span>
                <span className="text-xs">MTT</span>
                <span className="text-xs text-muted-foreground">{formatNumber(summaryStats.mttCount)}</span>
              </div>
            )}
            {summaryStats.spinCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-pink-500">●</span>
                <span className="text-xs">SPIN</span>
                <span className="text-xs text-muted-foreground">{formatNumber(summaryStats.spinCount)}</span>
              </div>
            )}
            {summaryStats.pkoCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-orange-500">●</span>
                <span className="text-xs">PKO</span>
                <span className="text-xs text-muted-foreground">{formatNumber(summaryStats.pkoCount)}</span>
              </div>
            )}
            {summaryStats.mkoCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-orange-600">●</span>
                <span className="text-xs">MKO</span>
                <span className="text-xs text-muted-foreground">{formatNumber(summaryStats.mkoCount)}</span>
              </div>
            )}
            {summaryStats.satCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-cyan-500">●</span>
                <span className="text-xs">SAT</span>
                <span className="text-xs text-muted-foreground">{formatNumber(summaryStats.satCount)}</span>
              </div>
            )}
            {summaryStats.sitngCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-purple-500">●</span>
                <span className="text-xs">SIT&GO</span>
                <span className="text-xs text-muted-foreground">{formatNumber(summaryStats.sitngCount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 4: PPSR (Cash Games) */}
        <div className="pt-3 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            PPSR (CASH GAMES) <span className="text-green-500 font-semibold">{formatNumber(summaryStats.ppsrCount)}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {summaryStats.nlhCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-green-600">●</span>
                <span className="text-xs">NLH</span>
                <span className="text-xs text-muted-foreground">{formatNumber(summaryStats.nlhCount)}</span>
              </div>
            )}
            {summaryStats.ploCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-purple-400">●</span>
                <span className="text-xs">PLO</span>
                <span className="text-xs text-muted-foreground">{formatNumber(summaryStats.ploCount)}</span>
              </div>
            )}
            {summaryStats.plo5Count > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-purple-500">●</span>
                <span className="text-xs">PLO5</span>
                <span className="text-xs text-muted-foreground">{formatNumber(summaryStats.plo5Count)}</span>
              </div>
            )}
            {summaryStats.plo6Count > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-teal-500">●</span>
                <span className="text-xs">PLO6</span>
                <span className="text-xs text-muted-foreground">{formatNumber(summaryStats.plo6Count)}</span>
              </div>
            )}
            {summaryStats.ofcCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-amber-500">●</span>
                <span className="text-xs">OFC</span>
                <span className="text-xs text-muted-foreground">{formatNumber(summaryStats.ofcCount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pagination Header */}
      <div className="flex items-center justify-between py-2 px-1">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} de{" "}
            {filteredData.length} partidas
            {typeFilter !== "all" && (
              <span className="text-muted-foreground/60 ml-1">
                (filtrado de {sessions.length})
              </span>
            )}
          </div>
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={typeFilter}
              onValueChange={(v) => handleFilterChange(v as SessionFilter)}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Filtrar tipo" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="text-[10px] text-muted-foreground">(primeiro)</span>
          </Button>
          {/* Previous page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {/* Show page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "ghost"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => goToPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          {/* Next page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {/* Last page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="gap-1"
          >
            <span className="text-[10px] text-muted-foreground">(último)</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="border rounded-lg overflow-hidden">
        {paginatedData.map((session, pageIndex) => {
          const globalIndex = getGlobalIndex(pageIndex);
          return (
            <SessionItem
              key={globalIndex}
              session={session}
              isOpen={openSessions.has(globalIndex)}
              onToggle={() => toggleSession(globalIndex)}
              index={globalIndex + 1}
            />
          );
        })}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center py-2">
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </div>
        </div>
      )}
    </div>
  );
}
