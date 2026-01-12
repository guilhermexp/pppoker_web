"use client";

import { Button } from "@midpoker/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@midpoker/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@midpoker/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Users,
} from "lucide-react";
import { memo, useMemo, useState } from "react";

type SessionPlayer = {
  playerId: string;
  nickname: string;
  memoName: string | null;
  ranking: number | null;
  buyIn: number;
  buyInChips: number;
  buyInTicket: number;
  cashOut: number;
  winnings: number;
  rake: number;
  hands: number;
  prize: number;
  winningsGeneral: number;
  winningsOpponents: number;
  winningsJackpot: number;
  winningsEvSplit: number;
  clubWinningsGeneral: number;
  clubWinningsFee: number;
  clubWinningsJackpotFee: number;
  clubWinningsJackpotPrize: number;
  clubWinningsEvSplit: number;
};

type Session = {
  externalId: string;
  tableName: string | null;
  sessionType: string;
  gameVariant: string;
  startedAt: string;
  endedAt: string | null;
  blinds: string | null;
  totalRake: number;
  totalBuyIn: number;
  totalCashOut: number;
  playerCount: number;
  handsPlayed: number;
  guaranteedPrize: number;
  players: SessionPlayer[];
};

type SessionsTabProps = {
  sessions: Session[];
};

type SessionFilter = "all" | "cash" | "mtt" | "sitng" | "spin";

const FILTER_OPTIONS: { value: SessionFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "cash", label: "CASH" },
  { value: "mtt", label: "MTT" },
  { value: "sitng", label: "SITNG" },
  { value: "spin", label: "SPIN" },
];

const ITEMS_PER_PAGE = 50;

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCurrencyCompact(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString("pt-BR");
  }
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

function formatSessionTypeTag(type: string): "CASH" | "MTT" | "SITNG" | "SPIN" {
  const normalized = type.toLowerCase();
  if (
    normalized === "cash_game" ||
    normalized.includes("cash") ||
    normalized.includes("ring")
  )
    return "CASH";
  if (normalized === "spin" || normalized.includes("spin")) return "SPIN";
  if (
    normalized === "sit_and_go" ||
    normalized.includes("sit") ||
    normalized.includes("sng")
  )
    return "SITNG";
  if (
    normalized === "mtt" ||
    normalized.includes("mtt") ||
    normalized.includes("tournament")
  )
    return "MTT";
  return "CASH";
}

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, "dd/MM HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

// Session content - only renders when expanded
const SessionContent = memo(function SessionContent({
  session,
}: { session: Session }) {
  const sessionType = formatSessionTypeTag(session.sessionType);

  return (
    <div className="px-4 pb-4 space-y-3">
      {/* Session Metadata */}
      <div className="flex flex-wrap gap-4 text-sm bg-muted/30 rounded-lg p-3">
        <div>
          <span className="text-muted-foreground">Mesa:</span>{" "}
          {session.tableName || "Sem nome"}
        </div>
        {session.blinds && (
          <div>
            <span className="text-muted-foreground">Blinds:</span>{" "}
            {session.blinds}
          </div>
        )}
        {session.startedAt && (
          <div>
            <span className="text-muted-foreground">Início:</span>{" "}
            {formatDateTime(session.startedAt)}
          </div>
        )}
        {session.endedAt && (
          <div>
            <span className="text-muted-foreground">Fim:</span>{" "}
            {formatDateTime(session.endedAt)}
          </div>
        )}
      </div>

      {/* Players Table */}
      {session.players && session.players.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          {sessionType === "CASH" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Apelido</TableHead>
                  <TableHead className="text-xs">Memorando</TableHead>
                  <TableHead className="text-xs text-right">Buy-in</TableHead>
                  <TableHead className="text-xs text-right">Mãos</TableHead>
                  <TableHead className="text-xs text-right">Ganhos</TableHead>
                  <TableHead className="text-xs text-right">Taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.players.map((player, index) => (
                  <TableRow key={`${player.playerId}-${index}`}>
                    <TableCell className="text-xs">{player.nickname}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {player.memoName || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {formatCurrencyCompact(player.buyIn)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {player.hands ?? 0}
                    </TableCell>
                    <TableCell
                      className={`text-xs text-right font-mono ${player.winnings >= 0 ? "text-emerald-600" : "text-destructive"}`}
                    >
                      {formatCurrencyCompact(player.winnings)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono text-green-600">
                      {formatCurrencyCompact(player.rake)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-medium border-t border-[#1d1d1d]">
                  <TableCell className="text-xs font-bold">Total</TableCell>
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrencyCompact(
                      session.players.reduce((s, p) => s + p.buyIn, 0),
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {session.players.reduce((s, p) => s + (p.hands ?? 0), 0)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrencyCompact(
                      session.players.reduce((s, p) => s + p.winnings, 0),
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold text-green-600">
                    {formatCurrencyCompact(
                      session.players.reduce((s, p) => s + p.rake, 0),
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : sessionType === "SPIN" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Apelido</TableHead>
                  <TableHead className="text-xs">Memorando</TableHead>
                  <TableHead className="text-right text-xs">#</TableHead>
                  <TableHead className="text-right text-xs">Buy-in</TableHead>
                  <TableHead className="text-right text-xs">Prêmio</TableHead>
                  <TableHead className="text-right text-xs">Ganhos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.players.map((player, index) => (
                  <TableRow key={`${player.playerId}-${index}`}>
                    <TableCell className="text-xs">{player.nickname}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {player.memoName || "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {player.ranking ?? "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCurrencyCompact(player.buyInChips)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-pink-600">
                      {formatCurrencyCompact(player.prize)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs ${player.winnings >= 0 ? "text-emerald-600" : "text-destructive"}`}
                    >
                      {formatCurrencyCompact(player.winnings)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-medium border-t border-[#1d1d1d]">
                  <TableCell className="text-xs font-bold">Total</TableCell>
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs text-right font-bold">
                    -
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrencyCompact(
                      session.players.reduce((s, p) => s + p.buyInChips, 0),
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold text-pink-600">
                    {formatCurrencyCompact(
                      session.players.reduce((s, p) => s + p.prize, 0),
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrencyCompact(
                      session.players.reduce((s, p) => s + p.winnings, 0),
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Apelido</TableHead>
                  <TableHead className="text-xs">Memorando</TableHead>
                  <TableHead className="text-right text-xs">#</TableHead>
                  <TableHead className="text-right text-xs">Buy-in</TableHead>
                  <TableHead className="text-right text-xs">Ticket</TableHead>
                  <TableHead className="text-right text-xs">Ganhos</TableHead>
                  <TableHead className="text-right text-xs">Taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.players.map((player, index) => (
                  <TableRow key={`${player.playerId}-${index}`}>
                    <TableCell className="text-xs">{player.nickname}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {player.memoName || "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {player.ranking ?? "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCurrencyCompact(player.buyInChips)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCurrencyCompact(player.buyInTicket)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs ${player.winnings >= 0 ? "text-emerald-600" : "text-destructive"}`}
                    >
                      {formatCurrencyCompact(player.winnings)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCurrencyCompact(player.rake)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-medium border-t border-[#1d1d1d]">
                  <TableCell className="text-xs font-bold">Total</TableCell>
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs text-right font-bold">
                    -
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrencyCompact(
                      session.players.reduce((s, p) => s + p.buyInChips, 0),
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrencyCompact(
                      session.players.reduce((s, p) => s + p.buyInTicket, 0),
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrencyCompact(
                      session.players.reduce((s, p) => s + p.winnings, 0),
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold text-green-600">
                    {formatCurrencyCompact(
                      session.players.reduce((s, p) => s + p.rake, 0),
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhum jogador encontrado.
        </p>
      )}
    </div>
  );
});

// Session item - compact row style
const SessionItem = memo(function SessionItem({
  session,
  isOpen,
  onToggle,
  index,
}: {
  session: Session;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const sessionType = formatSessionTypeTag(session.sessionType);
  const playerCount = session.playerCount ?? session.players?.length ?? 0;

  const getBadgeClass = () => {
    switch (sessionType) {
      case "CASH":
        return "bg-green-500 text-white";
      case "MTT":
        return "bg-blue-500 text-white";
      case "SITNG":
        return "bg-purple-500 text-white";
      case "SPIN":
        return "bg-pink-500 text-white";
      default:
        return "bg-muted";
    }
  };

  const tableName =
    session.tableName
      ?.replace(/\(\?\)/g, "")
      .replace(/\?/g, "")
      .trim() || "Sem nome";

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center w-full px-3 py-1.5 hover:bg-muted/30 border-b border-[#1d1d1d]/40 text-xs">
        <ChevronDown
          className={`h-3 w-3 mr-1 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`}
        />
        <span className="text-muted-foreground/60 font-mono w-[40px] text-right mr-2 flex-shrink-0">
          {index}
        </span>
        <span
          className={`${getBadgeClass()} px-1.5 py-0.5 rounded text-[10px] font-medium mr-2 flex-shrink-0`}
        >
          {sessionType}
        </span>
        {session.gameVariant && (
          <span className="text-muted-foreground font-mono text-[10px] mr-2 flex-shrink-0">
            {session.gameVariant.toUpperCase()}
          </span>
        )}
        <span
          className="font-medium truncate max-w-[180px] mr-2"
          title={tableName}
        >
          {tableName}
        </span>
        {session.externalId && (
          <span className="text-muted-foreground/60 font-mono text-[10px] mr-3 flex-shrink-0">
            {session.externalId}
          </span>
        )}
        <span className="flex-1" />
        <span className="text-muted-foreground mr-3 flex-shrink-0 text-[10px]">
          <Users className="h-3 w-3 inline mr-0.5" />
          {playerCount}
        </span>
        <span className="text-muted-foreground mr-3 flex-shrink-0">
          <span className="text-[10px] mr-1">Buy-in:</span>
          <span className="font-mono">
            {formatCurrencyCompact(session.totalBuyIn)}
          </span>
        </span>
        <span className="mr-3 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground mr-1">Taxa:</span>
          <span className="text-green-600 font-medium font-mono">
            {formatCurrencyCompact(session.totalRake)}
          </span>
        </span>
        {session.guaranteedPrize > 0 && (
          <span className="text-yellow-500 font-medium mr-3 flex-shrink-0">
            GTD {formatNumber(session.guaranteedPrize)}
          </span>
        )}
        <span className="text-muted-foreground flex-shrink-0 w-[90px]">
          {session.startedAt ? formatDateTime(session.startedAt) : "-"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {isOpen && <SessionContent session={session} />}
      </CollapsibleContent>
    </Collapsible>
  );
});

export function SessionsTab({ sessions }: SessionsTabProps) {
  const [openSessions, setOpenSessions] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<SessionFilter>("all");

  const filteredData = useMemo(() => {
    if (typeFilter === "all") return sessions;
    return sessions.filter((s) => {
      const type = formatSessionTypeTag(s.sessionType);
      switch (typeFilter) {
        case "cash":
          return type === "CASH";
        case "mtt":
          return type === "MTT";
        case "sitng":
          return type === "SITNG";
        case "spin":
          return type === "SPIN";
        default:
          return true;
      }
    });
  }, [sessions, typeFilter]);

  const handleFilterChange = (value: SessionFilter) => {
    setTypeFilter(value);
    setCurrentPage(1);
    setOpenSessions(new Set());
  };

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const summaryStats = useMemo(() => {
    let totalCash = 0,
      totalMTT = 0,
      totalSitNG = 0,
      totalSpin = 0;
    let totalBuyIn = 0,
      totalRake = 0,
      totalGTD = 0,
      totalPlayers = 0;
    const gameTypes: Record<string, number> = {};

    for (const s of sessions) {
      const type = formatSessionTypeTag(s.sessionType);
      if (type === "CASH") totalCash++;
      else if (type === "MTT") totalMTT++;
      else if (type === "SITNG") totalSitNG++;
      else if (type === "SPIN") totalSpin++;

      const variant = s.gameVariant?.toUpperCase() || "Outros";
      gameTypes[variant] = (gameTypes[variant] || 0) + 1;

      totalBuyIn += s.totalBuyIn;
      totalRake += s.totalRake;
      totalGTD += s.guaranteedPrize ?? 0;
      totalPlayers += s.playerCount ?? s.players?.length ?? 0;
    }

    return {
      totalCash,
      totalMTT,
      totalSitNG,
      totalSpin,
      totalBuyIn,
      totalRake,
      totalGTD,
      totalPlayers,
      gameTypes,
    };
  }, [sessions]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const getGlobalIndex = (pageIndex: number) =>
    (currentPage - 1) * ITEMS_PER_PAGE + pageIndex;

  const toggleSession = (globalIndex: number) => {
    setOpenSessions((prev) => {
      const newOpen = new Set(prev);
      if (newOpen.has(globalIndex)) newOpen.delete(globalIndex);
      else newOpen.add(globalIndex);
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
      <div className="flex items-center justify-center h-full py-12 text-muted-foreground">
        Nenhuma partida encontrada
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {/* Stats rows */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm py-2">
        <span className="text-muted-foreground">
          Partidas:{" "}
          <span className="text-foreground font-semibold">
            {formatNumber(sessions.length)}
          </span>
        </span>
        <span className="text-muted-foreground">
          Jogadores:{" "}
          <span className="text-foreground font-semibold">
            {formatNumber(summaryStats.totalPlayers)}
          </span>
        </span>
      </div>

      <div className="border-t border-[#1d1d1d]/30" />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm py-2">
        <span className="text-muted-foreground">
          Buy-in Total:{" "}
          <span className="text-foreground font-semibold">
            {formatCurrency(summaryStats.totalBuyIn)}
          </span>
        </span>
        <span className="text-muted-foreground">
          Taxa Total:{" "}
          <span className="text-[#00C969] font-semibold">
            {formatCurrency(summaryStats.totalRake)}
          </span>
        </span>
        {summaryStats.totalGTD > 0 && (
          <span className="text-muted-foreground">
            GTD Total:{" "}
            <span className="text-yellow-500 font-semibold">
              {formatCurrency(summaryStats.totalGTD)}
            </span>
          </span>
        )}
      </div>

      <div className="border-t border-[#1d1d1d]/30" />

      {/* Type filter buttons */}
      <div className="py-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          TIPOS DE PARTIDA
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {summaryStats.totalCash > 0 && (
            <button
              type="button"
              onClick={() =>
                handleFilterChange(typeFilter === "cash" ? "all" : "cash")
              }
              className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${typeFilter !== "all" && typeFilter !== "cash" ? "opacity-40" : ""}`}
            >
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">CASH</span>
              <span className="text-foreground font-medium">
                {summaryStats.totalCash}
              </span>
            </button>
          )}
          {summaryStats.totalMTT > 0 && (
            <button
              type="button"
              onClick={() =>
                handleFilterChange(typeFilter === "mtt" ? "all" : "mtt")
              }
              className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${typeFilter !== "all" && typeFilter !== "mtt" ? "opacity-40" : ""}`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">MTT</span>
              <span className="text-foreground font-medium">
                {summaryStats.totalMTT}
              </span>
            </button>
          )}
          {summaryStats.totalSitNG > 0 && (
            <button
              type="button"
              onClick={() =>
                handleFilterChange(typeFilter === "sitng" ? "all" : "sitng")
              }
              className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${typeFilter !== "all" && typeFilter !== "sitng" ? "opacity-40" : ""}`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-muted-foreground">SITNG</span>
              <span className="text-foreground font-medium">
                {summaryStats.totalSitNG}
              </span>
            </button>
          )}
          {summaryStats.totalSpin > 0 && (
            <button
              type="button"
              onClick={() =>
                handleFilterChange(typeFilter === "spin" ? "all" : "spin")
              }
              className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${typeFilter !== "all" && typeFilter !== "spin" ? "opacity-40" : ""}`}
            >
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              <span className="text-muted-foreground">SPIN</span>
              <span className="text-foreground font-medium">
                {summaryStats.totalSpin}
              </span>
            </button>
          )}
          {typeFilter !== "all" && (
            <button
              type="button"
              onClick={() => handleFilterChange("all")}
              className="text-xs text-muted-foreground hover:text-foreground ml-2"
            >
              (limpar filtro)
            </button>
          )}
        </div>
      </div>

      {/* Pagination Header */}
      <div className="border-t border-[#1d1d1d]/30" />
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} de{" "}
            {filteredData.length}
          </p>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={typeFilter}
              onValueChange={(v) => handleFilterChange(v as SessionFilter)}
            >
              <SelectTrigger className="w-[100px] h-7 text-xs">
                <SelectValue placeholder="Filtrar" />
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="h-7 px-2"
          >
            <ChevronsLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-7 px-2"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {currentPage}/{totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-7 px-2"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="h-7 px-2"
          >
            <ChevronsRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
        {paginatedData.map((session, pageIndex) => {
          const globalIndex = getGlobalIndex(pageIndex);
          return (
            <SessionItem
              key={session.externalId || globalIndex}
              session={session}
              isOpen={openSessions.has(globalIndex)}
              onToggle={() => toggleSession(globalIndex)}
              index={globalIndex + 1}
            />
          );
        })}
      </div>
    </div>
  );
}
