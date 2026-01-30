"use client";

import { formatNumber } from "@/utils/format";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { getVariantLabel, variantBadgeClassName } from "./utils";

interface Game {
  id: string;
  game_variant: string;
  table_name: string | null;
  started_at: string;
  buyin_base: string | number | null;
  buyin_bounty: string | number | null;
  buyin_taxa: string | number | null;
  premiacao_garantida: string | number | null;
  is_satellite: boolean | null;
  player_count: number | null;
  total_buyin: string | number | null;
  total_taxa: string | number | null;
  total_gap_garantido: string | number | null;
  total_recompensa: string | number | null;
}

interface JogosPPSTTabProps {
  games: Game[];
}

type TournamentFilter =
  | "all"
  | "mtt"
  | "spin"
  | "pko"
  | "mko"
  | "sat"
  | "gtd"
  | "overlay"
  | "sem-gtd";

const FILTER_OPTIONS: { value: TournamentFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "mtt", label: "MTT" },
  { value: "spin", label: "SPIN" },
  { value: "pko", label: "PKO" },
  { value: "mko", label: "MKO" },
  { value: "sat", label: "SAT" },
  { value: "gtd", label: "Com GTD" },
  { value: "overlay", label: "Com Overlay" },
  { value: "sem-gtd", label: "Sem GTD c/ Taxa" },
];

const ITEMS_PER_PAGE = 50;

function num(v: string | number | null | undefined): number {
  return Number(v || 0);
}

function formatBuyin(game: Game): string {
  const base = num(game.buyin_base);
  const bounty = num(game.buyin_bounty);
  const taxa = num(game.buyin_taxa);
  if (bounty > 0) {
    return `${base}+${bounty}+${taxa}`;
  }
  if (taxa > 0) {
    return `${base}+${taxa}`;
  }
  return `${base}`;
}

function matchesFilter(game: Game, filter: TournamentFilter): boolean {
  if (filter === "all") return true;

  const variant = game.game_variant;
  const hasGTD = num(game.premiacao_garantida) > 0;

  switch (filter) {
    case "mtt":
      return (
        variant !== "spinup" &&
        variant !== "pko" &&
        variant !== "mko" &&
        variant !== "satellite"
      );
    case "spin":
      return variant === "spinup";
    case "pko":
      return variant === "pko";
    case "mko":
      return variant === "mko";
    case "sat":
      return variant === "satellite" || game.is_satellite === true;
    case "gtd":
      return hasGTD;
    case "overlay": {
      if (!hasGTD) return false;
      const buyinLiquido = num(game.total_buyin) - num(game.total_taxa);
      const gtd = num(game.premiacao_garantida);
      return buyinLiquido < gtd;
    }
    case "sem-gtd":
      return !hasGTD && num(game.total_taxa) > 0;
    default:
      return true;
  }
}

export function JogosPPSTTab({ games }: JogosPPSTTabProps) {
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<TournamentFilter>("all");

  const filteredGames = useMemo(
    () => games.filter((g) => matchesFilter(g, typeFilter)),
    [games, typeFilter],
  );

  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE);

  const pageGames = useMemo(
    () =>
      filteredGames.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE),
    [filteredGames, page],
  );

  const filterCounts = useMemo(() => {
    const overlayCount = games.filter((g) =>
      matchesFilter(g, "overlay"),
    ).length;
    const semGtdCount = games.filter((g) => matchesFilter(g, "sem-gtd")).length;
    return { overlayCount, semGtdCount };
  }, [games]);

  const handleFilterChange = (value: string) => {
    setTypeFilter(value as TournamentFilter);
    setPage(0);
  };

  const totals = useMemo(() => {
    let playerCount = 0;
    let totalBuyin = 0;
    let totalTaxa = 0;
    let totalGap = 0;
    let totalRecompensa = 0;
    let overlayCount = 0;
    let overlayTotal = 0;

    for (const g of filteredGames) {
      playerCount += g.player_count ?? 0;
      totalBuyin += num(g.total_buyin);
      totalTaxa += num(g.total_taxa);
      totalGap += num(g.total_gap_garantido);
      totalRecompensa += num(g.total_recompensa);

      const gtd = num(g.premiacao_garantida);
      if (gtd > 0) {
        const buyinLiquido = num(g.total_buyin) - num(g.total_taxa);
        const resultado = buyinLiquido - gtd;
        if (resultado < 0) {
          overlayCount++;
          overlayTotal += resultado;
        }
      }
    }

    return {
      playerCount,
      totalBuyin,
      totalTaxa,
      totalGap,
      totalRecompensa,
      overlayCount,
      overlayTotal,
    };
  }, [filteredGames]);

  return (
    <div className="p-6 space-y-4">
      {/* Summary stats + Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-muted-foreground">
            Total:{" "}
            <span className="font-medium text-foreground">
              {filteredGames.length}
            </span>{" "}
            jogos
            {typeFilter !== "all" && (
              <span className="text-muted-foreground/60 ml-1">
                (de {games.length})
              </span>
            )}
          </span>
          <span className="text-muted-foreground">
            Jogadores:{" "}
            <span className="font-medium text-foreground">
              {formatNumber(totals.playerCount)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Overlay:{" "}
            <span className="font-medium text-red-500">
              {formatNumber(Math.abs(totals.overlayTotal))}
            </span>
            <span className="text-muted-foreground/60 ml-1">
              ({totals.overlayCount} torneios)
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue placeholder="Filtrar tipo" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.value === "overlay"
                    ? `${option.label} (${filterCounts.overlayCount})`
                    : option.value === "sem-gtd"
                      ? `${option.label} (${filterCounts.semGtdCount})`
                      : option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variante</TableHead>
              <TableHead>Mesa</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead className="text-right">Buy-in</TableHead>
              <TableHead className="text-right">Garantido</TableHead>
              <TableHead className="text-right">Jogadores</TableHead>
              <TableHead className="text-right">Total Buy-in</TableHead>
              <TableHead className="text-right">Total Taxa</TableHead>
              <TableHead className="text-right">Gap GTD</TableHead>
              <TableHead className="text-right">Recompensa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageGames.map((game) => (
              <TableRow key={game.id}>
                <TableCell>
                  <span className={variantBadgeClassName(game.game_variant)}>
                    {getVariantLabel(game.game_variant)}
                    {game.is_satellite ? " SAT" : ""}
                  </span>
                </TableCell>
                <TableCell
                  className="max-w-[140px] truncate"
                  title={game.table_name ?? undefined}
                >
                  {game.table_name || "-"}
                </TableCell>
                <TableCell className="text-sm tabular-nums whitespace-nowrap">
                  {format(parseISO(game.started_at), "dd/MM HH:mm", {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums font-mono">
                  {formatBuyin(game)}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {num(game.premiacao_garantida) > 0
                    ? formatNumber(num(game.premiacao_garantida))
                    : "-"}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {game.player_count ?? 0}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {formatNumber(num(game.total_buyin))}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-green-600">
                  {formatNumber(num(game.total_taxa))}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums text-yellow-600">
                  {num(game.total_gap_garantido) > 0
                    ? formatNumber(num(game.total_gap_garantido))
                    : "-"}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {num(game.total_recompensa) > 0
                    ? formatNumber(num(game.total_recompensa))
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="font-semibold">
              <TableCell colSpan={5}>
                Total ({filteredGames.length} jogos)
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(totals.playerCount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(totals.totalBuyin)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-green-600">
                {formatNumber(totals.totalTaxa)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-yellow-600">
                {formatNumber(totals.totalGap)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(totals.totalRecompensa)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            {page * ITEMS_PER_PAGE + 1} -{" "}
            {Math.min((page + 1) * ITEMS_PER_PAGE, filteredGames.length)} de{" "}
            {filteredGames.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <Icons.ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <Icons.ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
