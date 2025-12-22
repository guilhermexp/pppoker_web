"use client";

import type { ParsedLeagueJogoPPST } from "@/lib/league/types";
import { Badge } from "@midday/ui/badge";
import { Button } from "@midday/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@midday/ui/collapsible";
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
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import React, { memo, useMemo, useState } from "react";

interface LeagueJogosPPSTTabProps {
  data: ParsedLeagueJogoPPST[];
}

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

// Memoized game content - only renders when expanded
const JogoContent = memo(function JogoContent({
  jogo,
}: { jogo: ParsedLeagueJogoPPST }) {
  const isNLH = jogo.metadata.tipoJogo === "PPST/NLH";
  const isSPINUP = jogo.metadata.tipoJogo === "PPST/SPINUP";

  return (
    <div className="px-4 pb-4 space-y-4">
      {/* Game Metadata */}
      <div className="flex flex-wrap gap-4 text-sm bg-muted/30 rounded-lg p-3">
        <div>
          <span className="text-muted-foreground">Início:</span>{" "}
          {jogo.metadata.dataInicio} {jogo.metadata.horaInicio}
        </div>
        <div>
          <span className="text-muted-foreground">Fim:</span>{" "}
          {jogo.metadata.dataFim} {jogo.metadata.horaFim}
        </div>
        <div>
          <span className="text-muted-foreground">Criador:</span>{" "}
          {jogo.metadata.criadorNome} ({jogo.metadata.criadorId})
        </div>
      </div>

      {/* Players Table - Grouped by Liga */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead className="w-[60px]">SU</TableHead>
              <TableHead className="w-[60px]">Liga</TableHead>
              <TableHead>Clube</TableHead>
              <TableHead>Jogador</TableHead>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead className="text-right">Buy-in</TableHead>
              {isNLH && <TableHead className="text-right">Ticket</TableHead>}
              {isSPINUP && <TableHead className="text-right">Prêmio</TableHead>}
              <TableHead className="text-right">Ganhos</TableHead>
              {isNLH && <TableHead className="text-right">Taxa</TableHead>}
              {isNLH && <TableHead className="text-right">Gap</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              // Group players by ligaId to show Liga Total rows
              const jogadoresByLiga = new Map<number, typeof jogo.jogadores>();
              for (const jogador of jogo.jogadores) {
                const list = jogadoresByLiga.get(jogador.ligaId) || [];
                list.push(jogador);
                jogadoresByLiga.set(jogador.ligaId, list);
              }

              const rows: React.ReactNode[] = [];
              let rowIndex = 0;

              for (const [ligaId, ligaJogadores] of jogadoresByLiga) {
                // Render players for this liga
                for (const jogador of ligaJogadores) {
                  rows.push(
                    <TableRow key={`player-${rowIndex}`}>
                      <TableCell className="font-medium">{jogador.ranking}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {jogador.superUnionId ?? "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {jogador.ligaId}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{jogador.clubeId}</div>
                        {jogador.clubeNome && (
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {jogador.clubeNome}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{jogador.apelido}</div>
                          {jogador.nomeMemorado &&
                            jogador.nomeMemorado !== jogador.apelido && (
                              <div className="text-xs text-muted-foreground">
                                {jogador.nomeMemorado}
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {jogador.jogadorId}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(jogador.buyinFichas)}
                      </TableCell>
                      {isNLH && (
                        <TableCell className="text-right">
                          {formatNumber(jogador.buyinTicket ?? 0)}
                        </TableCell>
                      )}
                      {isSPINUP && (
                        <TableCell className="text-right text-pink-600">
                          {formatNumber(jogador.premio ?? 0)}
                        </TableCell>
                      )}
                      <TableCell
                        className={`text-right font-medium ${jogador.ganhos > 0 ? "text-green-600" : jogador.ganhos < 0 ? "text-red-600" : ""}`}
                      >
                        {formatCurrency(jogador.ganhos)}
                      </TableCell>
                      {isNLH && (
                        <TableCell className="text-right">
                          {formatCurrency(jogador.taxa ?? 0)}
                        </TableCell>
                      )}
                      {isNLH && (
                        <TableCell
                          className={`text-right ${(jogador.gapGarantido ?? 0) < 0 ? "text-red-600" : ""}`}
                        >
                          {jogador.gapGarantido !== null &&
                          jogador.gapGarantido !== undefined
                            ? formatCurrency(jogador.gapGarantido)
                            : "-"}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                  rowIndex++;
                }

                // Liga Total row
                const ligaTotal = jogo.totaisPorLiga.find(t => t.ligaId === ligaId);
                if (ligaTotal || ligaJogadores.length > 0) {
                  const totalBuyin = ligaTotal?.buyinFichas ?? ligaJogadores.reduce((s, j) => s + j.buyinFichas, 0);
                  const totalTicket = ligaTotal?.buyinTicket ?? ligaJogadores.reduce((s, j) => s + (j.buyinTicket ?? 0), 0);
                  const totalGanhos = ligaTotal?.ganhos ?? ligaJogadores.reduce((s, j) => s + j.ganhos, 0);
                  const totalTaxa = ligaTotal?.taxa ?? ligaJogadores.reduce((s, j) => s + (j.taxa ?? 0), 0);
                  const totalGap = ligaTotal?.gapGarantido ?? ligaJogadores.reduce((s, j) => s + (j.gapGarantido ?? 0), 0);
                  const totalPremio = ligaTotal?.premio ?? ligaJogadores.reduce((s, j) => s + (j.premio ?? 0), 0);

                  rows.push(
                    <TableRow key={`liga-total-${ligaId}`} className="bg-blue-500/10 border-t border-blue-500/20">
                      <TableCell colSpan={6} className="font-medium text-blue-600">
                        Liga Total ({ligaId})
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(totalBuyin)}
                      </TableCell>
                      {isNLH && (
                        <TableCell className="text-right font-medium">
                          {formatNumber(totalTicket)}
                        </TableCell>
                      )}
                      {isSPINUP && (
                        <TableCell className="text-right font-medium text-pink-600">
                          {formatNumber(totalPremio)}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-medium">
                        {formatCurrency(totalGanhos)}
                      </TableCell>
                      {isNLH && (
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(totalTaxa)}
                        </TableCell>
                      )}
                      {isNLH && (
                        <TableCell className={`text-right font-medium ${totalGap < 0 ? "text-red-600" : ""}`}>
                          {formatCurrency(totalGap)}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                }
              }

              return rows;
            })()}

            {/* Total Geral Row - Calculate from players since Excel formulas don't read */}
            {(() => {
              const totalBuyin = jogo.jogadores.reduce((s, j) => s + j.buyinFichas, 0);
              const totalTicket = jogo.jogadores.reduce((s, j) => s + (j.buyinTicket ?? 0), 0);
              const totalGanhos = jogo.jogadores.reduce((s, j) => s + j.ganhos, 0);
              const totalTaxa = jogo.jogadores.reduce((s, j) => s + (j.taxa ?? 0), 0);
              const totalGap = jogo.jogadores.reduce((s, j) => s + (j.gapGarantido ?? 0), 0);
              const totalPremio = jogo.jogadores.reduce((s, j) => s + (j.premio ?? 0), 0);

              return (
                <TableRow className="bg-muted/50 font-medium border-t-2">
                  <TableCell colSpan={6} className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatNumber(totalBuyin)}
                  </TableCell>
                  {isNLH && (
                    <TableCell className="text-right font-bold">
                      {formatNumber(totalTicket)}
                    </TableCell>
                  )}
                  {isSPINUP && (
                    <TableCell className="text-right font-bold text-pink-600">
                      {formatNumber(totalPremio)}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-bold">
                    {formatCurrency(totalGanhos)}
                  </TableCell>
                  {isNLH && (
                    <TableCell className="text-right font-bold text-green-600">
                      {formatCurrency(totalTaxa)}
                    </TableCell>
                  )}
                  {isNLH && (
                    <TableCell
                      className={`text-right font-bold ${totalGap < 0 ? "text-red-600" : ""}`}
                    >
                      {formatCurrency(totalGap)}
                    </TableCell>
                  )}
                </TableRow>
              );
            })()}
          </TableBody>
        </Table>
      </div>

    </div>
  );
});

// Memoized game item header
const JogoItem = memo(function JogoItem({
  jogo,
  isOpen,
  onToggle,
}: {
  jogo: ParsedLeagueJogoPPST;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const isNLH = jogo.metadata.tipoJogo === "PPST/NLH";
  // Use MTT for NLH (regular tournaments), SPIN for SPINUP
  const gameTypeLabel = isNLH ? "MTT" : "SPIN";

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={onToggle}
      className="border rounded-lg"
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50">
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <div className="flex items-center gap-2">
            {isNLH ? (
              <Badge variant="default" className="bg-blue-500">
                <Trophy className="h-3 w-3 mr-1" />
                {gameTypeLabel}
              </Badge>
            ) : (
              <Badge variant="default" className="bg-pink-500">
                <Zap className="h-3 w-3 mr-1" />
                {gameTypeLabel}
              </Badge>
            )}
            <span className="font-medium">{jogo.metadata.nomeMesa}</span>
            <span className="text-xs text-muted-foreground font-mono">
              {jogo.metadata.idJogo}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            {jogo.jogadores.length}
          </span>
          <Badge variant="outline">
            Buy-in: {jogo.metadata.buyInBase}+{jogo.metadata.buyInTaxa}
          </Badge>
          {jogo.metadata.premiacaoGarantida && (
            <Badge variant="secondary">
              GTD: {formatNumber(jogo.metadata.premiacaoGarantida)}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {jogo.metadata.dataInicio} {jogo.metadata.horaInicio}
          </span>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        {/* Only render content when open (lazy loading) */}
        {isOpen && <JogoContent jogo={jogo} />}
      </CollapsibleContent>
    </Collapsible>
  );
});

export function LeagueJogosPPSTTab({ data }: LeagueJogosPPSTTabProps) {
  const [openJogos, setOpenJogos] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);

  // Get paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return data.slice(start, end);
  }, [data, currentPage]);

  // Calculate the actual index in the full dataset
  const getGlobalIndex = (pageIndex: number) => {
    return (currentPage - 1) * ITEMS_PER_PAGE + pageIndex;
  };

  const toggleJogo = (globalIndex: number) => {
    setOpenJogos((prev) => {
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
      // Close all expanded items when changing page
      setOpenJogos(new Set());
    }
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Nenhum dado encontrado na aba Jogos PPST
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pagination Header */}
      <div className="flex items-center justify-between py-2 px-1">
        <div className="text-sm text-muted-foreground">
          Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
          {Math.min(currentPage * ITEMS_PER_PAGE, data.length)} de {data.length}{" "}
          jogos
        </div>
        <div className="flex items-center gap-2">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Games List */}
      <div className="space-y-3">
        {paginatedData.map((jogo, pageIndex) => {
          const globalIndex = getGlobalIndex(pageIndex);
          return (
            <JogoItem
              key={globalIndex}
              jogo={jogo}
              isOpen={openJogos.has(globalIndex)}
              onToggle={() => toggleJogo(globalIndex)}
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
