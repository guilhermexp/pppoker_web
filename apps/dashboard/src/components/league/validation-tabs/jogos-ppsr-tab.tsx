"use client";

import type { ParsedLeagueJogoPPSR } from "@/lib/league/types";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@midpoker/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Users,
} from "lucide-react";
import type React from "react";
import { memo, useMemo, useState } from "react";

interface LeagueJogosPPSRTabProps {
  data: ParsedLeagueJogoPPSR[];
  inicioCount?: number;
  unknownFormatsCount?: number; // Unrecognized formats
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

// Memoized game content
const JogoContent = memo(function JogoContent({
  jogo,
}: { jogo: ParsedLeagueJogoPPSR }) {
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
          <span className="text-muted-foreground">Duração:</span>{" "}
          {jogo.metadata.duracao}
        </div>
        <div>
          <span className="text-muted-foreground">Criador:</span>{" "}
          {jogo.metadata.criadorNome} ({jogo.metadata.criadorId})
        </div>
      </div>

      {/* Players Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">
                <div className="text-[9px] text-muted-foreground">col. A</div>
                SU
              </TableHead>
              <TableHead className="w-[60px]">
                <div className="text-[9px] text-muted-foreground">col. B</div>
                Liga
              </TableHead>
              <TableHead>
                <div className="text-[9px] text-muted-foreground">col. C/D</div>
                Clube
              </TableHead>
              <TableHead>
                <div className="text-[9px] text-muted-foreground">
                  col. E/F/G
                </div>
                Jogador
              </TableHead>
              <TableHead className="w-[100px]">
                <div className="text-[9px] text-muted-foreground">col. H</div>
                ID
              </TableHead>
              <TableHead className="text-right">
                <div className="text-[9px] text-muted-foreground">col. I</div>
                Buy-in
              </TableHead>
              <TableHead className="text-right">
                <div className="text-[9px] text-muted-foreground">col. J</div>
                Mãos
              </TableHead>
              <TableHead className="text-right">
                <div className="text-[9px] text-muted-foreground">col. K</div>
                Ganhos
              </TableHead>
              <TableHead className="text-right">
                <div className="text-[9px] text-muted-foreground">col. L</div>
                De Adv.
              </TableHead>
              <TableHead className="text-right">
                <div className="text-[9px] text-muted-foreground">col. M</div>
                Jackpot
              </TableHead>
              <TableHead className="text-right">
                <div className="text-[9px] text-muted-foreground">col. N</div>
                Taxa
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              // Group players by ligaId
              const jogadoresByLiga = new Map<number, typeof jogo.jogadores>();
              for (const jogador of jogo.jogadores) {
                const list = jogadoresByLiga.get(jogador.ligaId) || [];
                list.push(jogador);
                jogadoresByLiga.set(jogador.ligaId, list);
              }

              const rows: React.ReactNode[] = [];
              let rowIndex = 0;

              for (const [ligaId, ligaJogadores] of jogadoresByLiga) {
                for (const jogador of ligaJogadores) {
                  rows.push(
                    <TableRow key={`player-${rowIndex}`}>
                      <TableCell className="font-mono text-xs">
                        {jogador.superUnionId ?? "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {jogador.ligaId}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">
                          {jogador.clubeId}
                        </div>
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
                      <TableCell className="text-right">
                        {formatNumber(jogador.maos)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${jogador.ganhosJogadorGeral > 0 ? "text-green-600" : jogador.ganhosJogadorGeral < 0 ? "text-red-600" : ""}`}
                      >
                        {formatCurrency(jogador.ganhosJogadorGeral)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${jogador.ganhosDeAdversarios > 0 ? "text-green-600" : jogador.ganhosDeAdversarios < 0 ? "text-red-600" : ""}`}
                      >
                        {formatCurrency(jogador.ganhosDeAdversarios)}
                      </TableCell>
                      <TableCell className="text-right text-purple-600">
                        {formatCurrency(jogador.ganhosDeJackpot)}
                      </TableCell>
                      <TableCell className="text-right text-orange-600">
                        {formatCurrency(jogador.taxa)}
                      </TableCell>
                    </TableRow>,
                  );
                  rowIndex++;
                }

                // Liga Total row
                const ligaTotal = jogo.totaisPorLiga.find(
                  (t) => t.ligaId === ligaId,
                );
                if (ligaTotal) {
                  rows.push(
                    <TableRow
                      key={`liga-total-${ligaId}`}
                      className="bg-blue-500/10 border-t border-blue-500/20"
                    >
                      <TableCell
                        colSpan={5}
                        className="font-medium text-blue-600"
                      >
                        Liga Total ({ligaId})
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(ligaTotal.buyinFichas)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatNumber(ligaTotal.maos)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(ligaTotal.ganhosJogadorGeral)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(ligaTotal.ganhosDeAdversarios)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-purple-600">
                        {formatCurrency(ligaTotal.ganhosDeJackpot)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {formatCurrency(ligaTotal.taxa)}
                      </TableCell>
                    </TableRow>,
                  );
                }
              }

              return rows;
            })()}

            {/* Total Geral Row */}
            <TableRow className="bg-muted/50 font-medium border-t-2">
              <TableCell colSpan={5} className="font-bold">
                Total
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatNumber(jogo.totalGeral.buyinFichas)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatNumber(jogo.totalGeral.maos)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(jogo.totalGeral.ganhosJogadorGeral)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(jogo.totalGeral.ganhosDeAdversarios)}
              </TableCell>
              <TableCell className="text-right font-bold text-purple-600">
                {formatCurrency(jogo.totalGeral.ganhosDeJackpot)}
              </TableCell>
              <TableCell className="text-right font-bold text-orange-600">
                {formatCurrency(jogo.totalGeral.taxa)}
              </TableCell>
            </TableRow>
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
  jogo: ParsedLeagueJogoPPSR;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const tipoCash = jogo.metadata.tipoCash;

  // Determine badge style based on game type
  let badgeClass = "bg-green-600"; // Default for NLH
  if (tipoCash.includes("PLO6")) {
    badgeClass = "bg-pink-500";
  } else if (tipoCash.includes("PLO5")) {
    badgeClass = "bg-purple-500";
  } else if (tipoCash.includes("PLO")) {
    badgeClass = "bg-blue-500";
  } else if (tipoCash.includes("6+")) {
    badgeClass = "bg-orange-500";
  } else if (tipoCash.includes("OFC")) {
    badgeClass = "bg-cyan-500";
  } else if (tipoCash.includes("FLASH")) {
    badgeClass = "bg-yellow-500";
  } else if (tipoCash.includes("3-1")) {
    badgeClass = "bg-teal-500";
  }

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
            <Badge variant="default" className={badgeClass}>
              <CreditCard className="h-3 w-3 mr-1" />
              CASH
            </Badge>
            <Badge variant="outline" className="font-mono">
              {tipoCash.replace("PPSR/", "")}
              {jogo.metadata.modificador && ` (${jogo.metadata.modificador})`}
            </Badge>
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
          <Badge variant="outline">{jogo.metadata.blinds}</Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {jogo.metadata.duracao}
          </Badge>
          <span className={`text-xs font-mono ${jogo.totalGeral.ganhosJogadorGeral < 0 ? "text-red-500" : "text-green-500"}`}>
            {formatCurrency(jogo.totalGeral.ganhosJogadorGeral)}
          </span>
          <span className="text-xs font-mono text-orange-500">
            {formatCurrency(jogo.totalGeral.taxa)}
          </span>
          <span className="text-xs text-muted-foreground">
            {jogo.metadata.dataInicio}
          </span>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        {isOpen && <JogoContent jogo={jogo} />}
      </CollapsibleContent>
    </Collapsible>
  );
});

export function LeagueJogosPPSRTab({
  data,
  inicioCount = 0,
  unknownFormatsCount = 0,
}: LeagueJogosPPSRTabProps) {
  const [openJogos, setOpenJogos] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const gameTypes: Record<string, number> = {};
    const uniquePlayerIds = new Set<string | number>();
    let totalMaos = 0;
    let totalTaxa = 0;

    for (const jogo of data) {
      // Conta jogadores únicos
      for (const jogador of jogo.jogadores) {
        if (jogador.jogadorId) {
          uniquePlayerIds.add(jogador.jogadorId);
        }
      }
      totalMaos += jogo.totalGeral.maos;
      totalTaxa += jogo.totalGeral.taxa;

      const tipoCash = jogo.metadata.tipoCash;
      const tipoKey = jogo.metadata.modificador
        ? `${tipoCash} (${jogo.metadata.modificador})`
        : tipoCash;
      gameTypes[tipoKey] = (gameTypes[tipoKey] || 0) + 1;
    }

    const jogosCount = data.length;
    const cancelledCount =
      inicioCount > jogosCount ? inicioCount - jogosCount : 0;

    return {
      gameTypes,
      totalPlayers: uniquePlayerIds.size,
      totalMaos,
      totalTaxa,
      jogosCount,
      cancelledCount,
    };
  }, [data, inicioCount]);

  // Get paginated data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return data.slice(start, end);
  }, [data, currentPage]);

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
      setOpenJogos(new Set());
    }
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Nenhum dado encontrado na aba Jogos PPSR (Cash Games)
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats Header */}
      <div className="space-y-4">
        {/* Main Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Mesas */}
          <div className="bg-muted/30 rounded-lg p-3 border">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Mesas
            </div>
            <div className="text-xl font-bold">
              {formatNumber(summaryStats.jogosCount)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              aba Jogos PPSR
            </div>
          </div>

          {/* Canceladas */}
          {summaryStats.cancelledCount > 0 && (
            <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
              <div className="text-[10px] text-amber-600 uppercase tracking-wide flex items-center gap-1">
                <Ban className="h-3 w-3" />
                Canceladas
              </div>
              <div className="text-xl font-bold text-amber-600">
                {formatNumber(summaryStats.cancelledCount)}
              </div>
              <div className="text-[10px] text-amber-600/70">sem jogadores</div>
            </div>
          )}

          {/* Jogadores */}
          <div className="bg-muted/30 rounded-lg p-3 border">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Users className="h-3 w-3" />
              Jogadores
            </div>
            <div className="text-xl font-bold">
              {formatNumber(summaryStats.totalPlayers)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              jogadores únicos
            </div>
          </div>

          {/* Mãos */}
          <div className="bg-muted/30 rounded-lg p-3 border">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              Mãos
            </div>
            <div className="text-xl font-bold">
              {formatNumber(summaryStats.totalMaos)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              col. J (Jogos PPSR)
            </div>
          </div>

          {/* Taxa Total */}
          <div className="bg-muted/30 rounded-lg p-3 border">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Taxa Total
            </div>
            <div className="text-xl font-bold text-green-600">
              {formatNumber(summaryStats.totalTaxa)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              col. N (Jogos PPSR)
            </div>
          </div>

          {/* Unknown Formats Warning */}
          {unknownFormatsCount > 0 && (
            <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
              <div className="text-[10px] text-red-600 uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Formato Desconhecido
              </div>
              <div className="text-xl font-bold text-red-600">
                {formatNumber(unknownFormatsCount)}
              </div>
              <div className="text-[10px] text-red-600/70">
                ver aba Validação
              </div>
            </div>
          )}
        </div>

        {/* Game Types Legend */}
        <div className="bg-muted/20 rounded-lg p-3 border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
            Tipos de Mesa
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summaryStats.gameTypes)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                let colorClass = "bg-green-500/10"; // Default for NLH
                if (type.includes("PLO6")) {
                  colorClass = "bg-pink-500/10";
                } else if (type.includes("PLO5")) {
                  colorClass = "bg-purple-500/10";
                } else if (type.includes("PLO")) {
                  colorClass = "bg-blue-500/10";
                } else if (type.includes("6+")) {
                  colorClass = "bg-orange-500/10";
                } else if (type.includes("OFC")) {
                  colorClass = "bg-cyan-500/10";
                } else if (type.includes("FLASH")) {
                  colorClass = "bg-yellow-500/10";
                } else if (type.includes("3-1")) {
                  colorClass = "bg-teal-500/10";
                }

                return (
                  <div
                    key={type}
                    className={`flex items-center gap-1.5 ${colorClass} rounded px-2 py-1`}
                  >
                    <span className="text-xs font-medium">
                      {type.replace("PPSR/", "")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(count)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Pagination Header */}
      <div className="flex items-center justify-between py-2 px-1">
        <div className="text-sm text-muted-foreground">
          Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
          {Math.min(currentPage * ITEMS_PER_PAGE, data.length)} de {data.length}{" "}
          mesas
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
