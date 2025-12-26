"use client";

import { useTRPC } from "@/trpc/client";
import { Skeleton } from "@midday/ui/skeleton";
import { TableCell, TableRow } from "@midday/ui/table";
import { useQuery } from "@tanstack/react-query";
import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import type { PokerSession } from "./columns";

type Props = {
  row: Row<PokerSession>;
  setOpen: (id: string) => void;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ExpandedRowContent({ sessionId }: { sessionId: string }) {
  const trpc = useTRPC();

  const { data: session, isLoading } = useQuery(
    trpc.poker.sessions.getById.queryOptions({ id: sessionId })
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </div>
    );
  }

  if (!session?.sessionPlayers?.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
        <span className="text-xs bg-muted px-2 py-1 rounded">
          Dados de jogadores não disponíveis para esta sessão
        </span>
        {session?.playerCount > 0 && (
          <span className="text-xs text-muted-foreground">
            ({session.playerCount} jogadores reportados)
          </span>
        )}
      </div>
    );
  }

  const players = session.sessionPlayers
    .sort((a, b) => (a.ranking ?? 999) - (b.ranking ?? 999));

  return (
    <div className="p-4 bg-muted/30">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Jogadores ({players.length})
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="text-left py-2 px-2 font-medium">#</th>
              <th className="text-left py-2 px-2 font-medium">Jogador</th>
              <th className="text-right py-2 px-2 font-medium">Buy-in</th>
              <th className="text-right py-2 px-2 font-medium">Cash-out</th>
              <th className="text-right py-2 px-2 font-medium">Resultado</th>
              <th className="text-right py-2 px-2 font-medium">Rake</th>
              <th className="text-right py-2 px-2 font-medium">PPST</th>
              <th className="text-right py-2 px-2 font-medium">PPSR</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => {
              const result = (player.cashOut ?? 0) - (player.buyInChips ?? 0);
              const isPositive = result >= 0;
              return (
                <tr
                  key={player.id}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2 px-2 text-muted-foreground">
                    {player.ranking ?? index + 1}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {player.player?.nickname ?? "Unknown"}
                      </span>
                      {player.player?.memoName && (
                        <span className="text-xs text-muted-foreground">
                          ({player.player.memoName})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right font-mono">
                    {formatCurrency(player.buyInChips ?? 0)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono">
                    {formatCurrency(player.cashOut ?? 0)}
                  </td>
                  <td
                    className={`py-2 px-2 text-right font-mono font-medium ${
                      isPositive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {formatCurrency(result)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                    {formatCurrency(player.rake ?? 0)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                    {formatCurrency(player.rakePpst ?? 0)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-muted-foreground">
                    {formatCurrency(player.rakePpsr ?? 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PokerSessionRow({ row, setOpen }: Props) {
  const isExpanded = row.getIsExpanded();
  const colSpan = row.getVisibleCells().length;

  return (
    <>
      <TableRow
        key={row.id}
        className="h-[57px] cursor-default hover:bg-accent/50"
      >
        {row.getVisibleCells().map((cell) => {
          const meta = cell.column.columnDef.meta as
            | { className?: string }
            | undefined;
          return (
            <TableCell key={cell.id} className={meta?.className}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          );
        })}
      </TableRow>
      {isExpanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={colSpan} className="p-0">
            <ExpandedRowContent sessionId={row.original.id} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
