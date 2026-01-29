"use client";

import { formatNumber } from "@/utils/format";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
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
  blinds: string | null;
  player_count: number | null;
  total_buyin: string | number | null;
  total_taxa: string | number | null;
}

interface JogosPPSRTabProps {
  games: Game[];
}

const ITEMS_PER_PAGE = 50;

function num(v: string | number | null | undefined): number {
  return Number(v || 0);
}

export function JogosPPSRTab({ games }: JogosPPSRTabProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(games.length / ITEMS_PER_PAGE);

  const pageGames = useMemo(
    () => games.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE),
    [games, page],
  );

  const totals = useMemo(() => {
    return games.reduce(
      (acc, g) => ({
        playerCount: acc.playerCount + (g.player_count ?? 0),
        totalBuyin: acc.totalBuyin + num(g.total_buyin),
        totalTaxa: acc.totalTaxa + num(g.total_taxa),
      }),
      { playerCount: 0, totalBuyin: 0, totalTaxa: 0 },
    );
  }, [games]);

  return (
    <div className="p-6 space-y-4">
      {/* Summary stats */}
      <div className="flex items-center gap-6 text-sm">
        <span className="text-muted-foreground">
          Total:{" "}
          <span className="font-medium text-foreground">{games.length}</span>{" "}
          jogos
        </span>
        <span className="text-muted-foreground">
          Jogadores:{" "}
          <span className="font-medium text-foreground">
            {formatNumber(totals.playerCount)}
          </span>
        </span>
        <span className="text-muted-foreground">
          Taxa:{" "}
          <span className="font-medium text-green-600">
            {formatNumber(totals.totalTaxa)}
          </span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variante</TableHead>
              <TableHead>Mesa</TableHead>
              <TableHead>Blinds</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead className="text-right">Jogadores</TableHead>
              <TableHead className="text-right">Total Buy-in</TableHead>
              <TableHead className="text-right">Total Taxa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageGames.map((game) => (
              <TableRow key={game.id}>
                <TableCell>
                  <span className={variantBadgeClassName(game.game_variant)}>
                    {getVariantLabel(game.game_variant)}
                  </span>
                </TableCell>
                <TableCell
                  className="max-w-[160px] truncate"
                  title={game.table_name ?? undefined}
                >
                  {game.table_name || "-"}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {game.blinds || "-"}
                </TableCell>
                <TableCell className="text-sm tabular-nums whitespace-nowrap">
                  {format(parseISO(game.started_at), "dd/MM HH:mm", {
                    locale: ptBR,
                  })}
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
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="font-semibold">
              <TableCell colSpan={4}>Total ({games.length} jogos)</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(totals.playerCount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(totals.totalBuyin)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-green-600">
                {formatNumber(totals.totalTaxa)}
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
            {Math.min((page + 1) * ITEMS_PER_PAGE, games.length)} de{" "}
            {games.length}
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
