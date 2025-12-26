"use client";

import type { ParsedSession } from "@/lib/poker/types";
import { Button } from "@midday/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@midday/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@midday/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@midday/ui/table";
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

// Filter options for session types
type SessionFilter = "all" | "cash" | "mtt" | "sitng" | "spin";

const FILTER_OPTIONS: { value: SessionFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "cash", label: "CASH" },
  { value: "mtt", label: "MTT" },
  { value: "sitng", label: "SITNG" },
  { value: "spin", label: "SPIN" },
];

type SessionsTabProps = {
  sessions: ParsedSession[];
  period?: {
    start: string;
    end: string;
  };
  utcCount?: number;
};

const ITEMS_PER_PAGE = 50;

function formatCurrency(value: number): string {
  // Se for inteiro, não mostra casas decimais
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

function formatSessionTypeTag(type: string, organizador?: string | null): "CASH" | "MTT" | "SITNG" | "SPIN" {
  const normalized = type.toLowerCase();

  if (organizador === "PPST") {
    if (normalized.includes("spin")) return "SPIN";
    if (normalized.includes("sit")) return "SITNG";
    return "MTT";
  }

  if (organizador === "PPSR") {
    return "CASH";
  }

  if (normalized.includes("spin")) return "SPIN";
  if (normalized.includes("mtt") || normalized.includes("tournament")) return "MTT";
  if (normalized.includes("sit") || normalized.includes("sng")) return "SITNG";
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
}: { session: ParsedSession }) {
  const sessionType = formatSessionTypeTag(session.sessionType, session.createdByNickname);

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
            <span className="text-muted-foreground">Blinds:</span> {session.blinds}
          </div>
        )}
        {session.rakePercent && (
          <div>
            <span className="text-muted-foreground">Taxa:</span> {session.rakePercent}%
            {session.rakeCap ? ` (cap: ${session.rakeCap})` : ""}
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
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Apelido</TableHead>
                  <TableHead className="text-xs">Memorando</TableHead>
                  <TableHead className="text-xs text-right">Buy-in</TableHead>
                  <TableHead className="text-xs text-right">Mãos</TableHead>
                  <TableHead className="text-xs text-right text-emerald-600" colSpan={4}>Ganhos Jogador</TableHead>
                  <TableHead className="text-xs text-right text-rose-500" colSpan={5}>Ganhos Clube</TableHead>
                </TableRow>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-[10px]" />
                  <TableHead className="text-[10px]" />
                  <TableHead className="text-[10px]" />
                  <TableHead className="text-[10px]" />
                  <TableHead className="text-[10px]" />
                  <TableHead className="text-[10px] text-right">Geral</TableHead>
                  <TableHead className="text-[10px] text-right">Advers.</TableHead>
                  <TableHead className="text-[10px] text-right">Jackpot</TableHead>
                  <TableHead className="text-[10px] text-right">Div. EV</TableHead>
                  <TableHead className="text-[10px] text-right">Geral</TableHead>
                  <TableHead className="text-[10px] text-right">Taxa</TableHead>
                  <TableHead className="text-[10px] text-right">Tx. JP</TableHead>
                  <TableHead className="text-[10px] text-right">Pr. JP</TableHead>
                  <TableHead className="text-[10px] text-right">Div. EV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.players.map((player, index) => (
                  <TableRow key={`${player.ppPokerId}-${index}`}>
                    <TableCell className="font-mono text-xs">{player.ppPokerId}</TableCell>
                    <TableCell className="text-xs">{player.nickname}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{player.memoName || "-"}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatCurrency(player.buyIn ?? 0)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{player.hands ?? 0}</TableCell>
                    <TableCell className={`text-xs text-right font-mono ${(player.winningsGeneral ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {formatCurrency(player.winningsGeneral ?? 0)}
                    </TableCell>
                    <TableCell className={`text-xs text-right font-mono ${(player.winningsOpponents ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {formatCurrency(player.winningsOpponents ?? 0)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatCurrency(player.winningsJackpot ?? 0)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatCurrency(player.winningsEvSplit ?? 0)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatCurrency(player.clubWinningsGeneral ?? 0)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatCurrency(player.clubWinningsFee ?? 0)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatCurrency(player.clubWinningsJackpotFee ?? 0)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatCurrency(player.clubWinningsJackpotPrize ?? 0)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatCurrency(player.clubWinningsEvSplit ?? 0)}</TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-muted/50 font-medium border-t-2">
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs font-bold">Total</TableCell>
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.buyIn ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {session.players.reduce((s, p) => s + (p.hands ?? 0), 0)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.winningsGeneral ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.winningsOpponents ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.winningsJackpot ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.winningsEvSplit ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.clubWinningsGeneral ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold text-green-600">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.clubWinningsFee ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.clubWinningsJackpotFee ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.clubWinningsJackpotPrize ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.clubWinningsEvSplit ?? 0), 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : sessionType === "SPIN" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ID</TableHead>
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
                  <TableRow key={`${player.ppPokerId}-${index}`}>
                    <TableCell className="font-mono text-xs">{player.ppPokerId}</TableCell>
                    <TableCell className="text-xs">{player.nickname}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{player.memoName || "-"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{player.ranking ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(player.buyInChips ?? player.buyIn ?? 0)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-pink-600">{formatCurrency(player.prize ?? 0)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${(player.winnings ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {formatCurrency(player.winnings ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-muted/50 font-medium border-t-2">
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs font-bold">Total</TableCell>
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs text-right font-bold">-</TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.buyInChips ?? p.buyIn ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold text-pink-600">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.prize ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.winnings ?? 0), 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ID</TableHead>
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
                  <TableRow key={`${player.ppPokerId}-${index}`}>
                    <TableCell className="font-mono text-xs">{player.ppPokerId}</TableCell>
                    <TableCell className="text-xs">{player.nickname}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{player.memoName || "-"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{player.ranking ?? "-"}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(player.buyInChips ?? player.buyIn ?? 0)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(player.buyInTicket ?? 0)}</TableCell>
                    <TableCell className={`text-right font-mono text-xs ${(player.winnings ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {formatCurrency(player.winnings ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(player.rake ?? 0)}</TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow className="bg-muted/50 font-medium border-t-2">
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs font-bold">Total</TableCell>
                  <TableCell className="text-xs">-</TableCell>
                  <TableCell className="text-xs text-right font-bold">-</TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.buyInChips ?? p.buyIn ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.buyInTicket ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.winnings ?? 0), 0))}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold text-green-600">
                    {formatCurrency(session.players.reduce((s, p) => s + (p.rake ?? 0), 0))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum jogador encontrado.</p>
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
  session: ParsedSession;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const sessionType = formatSessionTypeTag(session.sessionType, session.createdByNickname);
  const playerCount = session.playerCount ?? session.players?.length ?? 0;

  // Type badge styling
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

  // Clean table name
  const tableName = session.tableName?.replace(/\(\?\)/g, "").replace(/\?/g, "").trim() || "Sem nome";

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center w-full px-3 py-1.5 hover:bg-muted/30 border-b border-border/50 text-xs">
        {/* Expand icon */}
        <ChevronDown className={`h-3 w-3 mr-1 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`} />

        {/* Index number */}
        <span className="text-muted-foreground/60 font-mono w-[40px] text-right mr-2 flex-shrink-0">
          {index}
        </span>

        {/* Type badge */}
        <span className={`${getBadgeClass()} px-1.5 py-0.5 rounded text-[10px] font-medium mr-2 flex-shrink-0`}>
          {sessionType}
        </span>

        {/* Game variant */}
        {session.gameVariant && (
          <span className="text-muted-foreground font-mono text-[10px] mr-2 flex-shrink-0">
            {session.gameVariant.toUpperCase()}
          </span>
        )}

        {/* Table name - truncate */}
        <span className="font-medium truncate max-w-[180px] mr-2" title={tableName}>
          {tableName}
        </span>

        {/* Organizer */}
        {session.createdByNickname && (
          <span className="text-muted-foreground mr-2 flex-shrink-0">
            [{session.createdByNickname}]
          </span>
        )}

        {/* Session ID */}
        {session.externalId && (
          <span className="text-muted-foreground/60 font-mono text-[10px] mr-3 flex-shrink-0">
            {session.externalId}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Players */}
        <span className="text-muted-foreground mr-3 flex-shrink-0 text-[10px]">
          <Users className="h-3 w-3 inline mr-0.5" />
          {playerCount}
        </span>

        {/* Buy-in */}
        <span className="text-muted-foreground mr-3 flex-shrink-0">
          <span className="text-[10px] mr-1">Buy-in:</span>
          <span className="font-mono">{formatCurrency(session.totalBuyIn ?? 0)}</span>
        </span>

        {/* Ganhos */}
        <span className="mr-3 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground mr-1">Ganhos:</span>
          <span className={`font-mono ${(session.totalWinnings ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {formatCurrency(session.totalWinnings ?? 0)}
          </span>
        </span>

        {/* Taxa */}
        <span className="mr-3 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground mr-1">Taxa:</span>
          <span className="text-green-600 font-medium font-mono">{formatCurrency(session.totalRake ?? 0)}</span>
        </span>

        {/* GTD */}
        {session.guaranteedPrize && session.guaranteedPrize > 0 ? (
          <span className="text-yellow-500 font-medium mr-3 flex-shrink-0">
            GTD {formatNumber(session.guaranteedPrize)}
          </span>
        ) : null}

        {/* Date/time */}
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

export function SessionsTab({ sessions, period, utcCount }: SessionsTabProps) {
  const [openSessions, setOpenSessions] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<SessionFilter>("all");

  // Filter sessions by type
  const filteredData = useMemo(() => {
    if (typeFilter === "all") return sessions;
    return sessions.filter((s) => {
      const type = formatSessionTypeTag(s.sessionType, s.createdByNickname);
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

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    let totalCash = 0;
    let totalMTT = 0;
    let totalSitNG = 0;
    let totalSpin = 0;
    let totalBuyIn = 0;
    let totalRake = 0;
    let totalGTD = 0;
    let totalPlayers = 0;
    let totalHands = 0;
    const gameTypes: Record<string, number> = {};

    for (const s of sessions) {
      const type = formatSessionTypeTag(s.sessionType, s.createdByNickname);
      if (type === "CASH") totalCash++;
      else if (type === "MTT") totalMTT++;
      else if (type === "SITNG") totalSitNG++;
      else if (type === "SPIN") totalSpin++;

      // Contagem detalhada por gameVariant (PLO5, PLO6, NLH, SPIN, etc)
      const variant = s.gameVariant?.toUpperCase() || "Outros";
      gameTypes[variant] = (gameTypes[variant] || 0) + 1;

      // Calcula a partir dos jogadores para garantir consistência com a linha de Total
      const sessionBuyIn = s.players?.reduce((sum, p) => sum + (p.buyInChips ?? p.buyIn ?? 0), 0) ?? 0;
      const sessionRake = s.players?.reduce((sum, p) => sum + (p.rake ?? p.clubWinningsFee ?? 0), 0) ?? 0;

      totalBuyIn += sessionBuyIn;
      totalRake += sessionRake;
      totalGTD += s.guaranteedPrize ?? 0;
      totalPlayers += s.playerCount ?? s.players?.length ?? 0;
      totalHands += s.handsPlayed ?? 0;
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
      totalHands,
      gameTypes,
    };
  }, [sessions]);

  // Get paginated data from filtered results
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage]);

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
        Nenhuma partida encontrada
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-muted/30 rounded-lg p-3 border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Partidas</div>
          <div className="text-xl font-bold">{formatNumber(sessions.length)}</div>
          <div className="text-[10px] text-muted-foreground">headers de jogo detectados</div>
          {utcCount !== undefined && (
            <div className={`text-[10px] ${utcCount === sessions.length ? "text-green-500" : "text-red-500"}`}>
              UTC planilha: {utcCount}
            </div>
          )}
        </div>

        <div className="bg-muted/30 rounded-lg p-3 border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Jogadores</div>
          <div className="text-xl font-bold">{formatNumber(summaryStats.totalPlayers)}</div>
          <div className="text-[10px] text-muted-foreground">linhas de jogador por partida</div>
        </div>

        <div className="bg-muted/30 rounded-lg p-3 border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Buy-in Total</div>
          <div className="text-xl font-bold">{formatCurrency(summaryStats.totalBuyIn)}</div>
          <div className="text-[10px] text-muted-foreground">
            SPIN: col.F | MTT: col.F+G | CASH: col.E
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-3 border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Taxa Total</div>
          <div className="text-xl font-bold text-green-500">{formatCurrency(summaryStats.totalRake)}</div>
          <div className="text-[10px] text-muted-foreground">
            MTT: col.I | CASH: col.L (SPIN não tem)
          </div>
        </div>

        {summaryStats.totalGTD > 0 && (
          <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
            <div className="text-[10px] text-yellow-600 uppercase tracking-wide">GTD Total</div>
            <div className="text-xl font-bold text-yellow-500">{formatCurrency(summaryStats.totalGTD)}</div>
            <div className="text-[10px] text-yellow-600/70">
              header "Premiação Garantida: X"
            </div>
          </div>
        )}

        {summaryStats.totalHands > 0 && (
          <div className="bg-muted/30 rounded-lg p-3 border">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Mãos</div>
            <div className="text-xl font-bold">{formatNumber(summaryStats.totalHands)}</div>
            <div className="text-[10px] text-muted-foreground">CASH: col.F (Mãos)</div>
          </div>
        )}
      </div>

      {/* Game Types Legend - Clickable filters */}
      <div className="bg-muted/20 rounded-lg p-3 border">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
          Tipos de Partida (clique para filtrar)
        </div>
        <div className="flex flex-wrap gap-2">
          {/* All */}
          <button
            type="button"
            onClick={() => handleFilterChange("all")}
            className={`flex items-center gap-1.5 rounded px-2 py-1 transition-all cursor-pointer ${
              typeFilter === "all"
                ? "bg-foreground/20 ring-2 ring-foreground/50"
                : "bg-muted/50 hover:bg-muted"
            }`}
          >
            <span className="text-xs font-medium">Todos</span>
            <span className="text-xs text-muted-foreground">{sessions.length}</span>
          </button>
          {summaryStats.totalCash > 0 && (
            <button
              type="button"
              onClick={() => handleFilterChange("cash")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 transition-all cursor-pointer ${
                typeFilter === "cash"
                  ? "bg-green-500/30 ring-2 ring-green-500"
                  : "bg-green-500/10 hover:bg-green-500/20"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-xs font-medium">CASH</span>
              <span className="text-xs text-muted-foreground">{summaryStats.totalCash}</span>
            </button>
          )}
          {summaryStats.totalMTT > 0 && (
            <button
              type="button"
              onClick={() => handleFilterChange("mtt")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 transition-all cursor-pointer ${
                typeFilter === "mtt"
                  ? "bg-blue-500/30 ring-2 ring-blue-500"
                  : "bg-blue-500/10 hover:bg-blue-500/20"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-xs font-medium">MTT</span>
              <span className="text-xs text-muted-foreground">{summaryStats.totalMTT}</span>
            </button>
          )}
          {summaryStats.totalSitNG > 0 && (
            <button
              type="button"
              onClick={() => handleFilterChange("sitng")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 transition-all cursor-pointer ${
                typeFilter === "sitng"
                  ? "bg-purple-500/30 ring-2 ring-purple-500"
                  : "bg-purple-500/10 hover:bg-purple-500/20"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-xs font-medium">SITNG</span>
              <span className="text-xs text-muted-foreground">{summaryStats.totalSitNG}</span>
            </button>
          )}
          {summaryStats.totalSpin > 0 && (
            <button
              type="button"
              onClick={() => handleFilterChange("spin")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 transition-all cursor-pointer ${
                typeFilter === "spin"
                  ? "bg-pink-500/30 ring-2 ring-pink-500"
                  : "bg-pink-500/10 hover:bg-pink-500/20"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
              <span className="text-xs font-medium">SPIN</span>
              <span className="text-xs text-muted-foreground">{summaryStats.totalSpin}</span>
            </button>
          )}
        </div>

        {/* Detailed breakdown */}
        {Object.keys(summaryStats.gameTypes).length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
              Detalhado:
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {Object.entries(summaryStats.gameTypes)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="text-xs">
                    <span className="text-muted-foreground">{type}:</span>{" "}
                    <span className="font-mono font-medium">{formatNumber(count)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination Header */}
      <div className="flex items-center justify-between py-2 px-1">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} de {filteredData.length}{" "}
            partidas
            {typeFilter !== "all" && (
              <span className="text-muted-foreground/60 ml-1">
                (filtrado de {sessions.length})
              </span>
            )}
          </div>
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={(v) => handleFilterChange(v as SessionFilter)}>
              <SelectTrigger className="w-[120px] h-8">
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
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {/* Last page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="gap-1"
          >
            <span className="text-[10px] text-muted-foreground">(último pela Planilha)</span>
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
              key={session.externalId || globalIndex}
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
