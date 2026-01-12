"use client";

import type { ParsedLeagueJogoPPST } from "@/lib/league/types";
import { Badge } from "@midpoker/ui/badge";
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
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Trophy,
  Users,
} from "lucide-react";
import type React from "react";
import { memo, useMemo, useState } from "react";

interface LeagueJogosPPSTTabProps {
  data: ParsedLeagueJogoPPST[];
  inicioCount?: number; // Total games in spreadsheet (headers)
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

// Memoized game content - only renders when expanded
const JogoContent = memo(function JogoContent({
  jogo,
}: {
  jogo: ParsedLeagueJogoPPST;
}) {
  const subtipo = jogo.metadata.subtipo;
  const tipoJogo = jogo.metadata.tipoJogo;

  // Game type flags
  const isSPINUP = tipoJogo.includes("SPINUP");
  const isKnockout = subtipo === "knockout";
  const isSatellite = subtipo === "satellite";
  const isRegularNLH = !isSPINUP && !isKnockout && !isSatellite;

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
              {/* Col A - SU */}
              <TableHead className="w-[50px]">
                <div className="text-[9px] text-muted-foreground">col. A</div>
                SU
              </TableHead>
              {/* Col B - Liga */}
              <TableHead className="w-[50px]">
                <div className="text-[9px] text-muted-foreground">col. B</div>
                Liga
              </TableHead>
              {/* Col C - Clube ID */}
              <TableHead className="w-[60px]">
                <div className="text-[9px] text-muted-foreground">col. C</div>
                Clube
              </TableHead>
              {/* Col D - Nome Clube */}
              <TableHead>
                <div className="text-[9px] text-muted-foreground">col. D</div>
                Nome Clube
              </TableHead>
              {/* Col E - ID Jogador */}
              <TableHead className="w-[80px]">
                <div className="text-[9px] text-muted-foreground">col. E</div>
                ID Jog.
              </TableHead>
              {/* Col F - Apelido */}
              <TableHead>
                <div className="text-[9px] text-muted-foreground">col. F</div>
                Apelido
              </TableHead>
              {/* Col G - Nome Memo */}
              <TableHead>
                <div className="text-[9px] text-muted-foreground">col. G</div>
                Nome Memo
              </TableHead>
              {/* Col H - Ranking */}
              <TableHead className="w-[50px]">
                <div className="text-[9px] text-muted-foreground">col. H</div>#
              </TableHead>
              {/* Col I - Buy-in */}
              <TableHead className="text-right">
                <div className="text-[9px] text-muted-foreground">col. I</div>
                Buy-in
              </TableHead>
              {/* Col J - Ticket (NLH) ou Prêmio (SPINUP) */}
              {!isSPINUP && (
                <TableHead className="text-right">
                  <div className="text-[9px] text-muted-foreground">col. J</div>
                  Ticket
                </TableHead>
              )}
              {isSPINUP && (
                <TableHead className="text-right">
                  <div className="text-[9px] text-muted-foreground">col. J</div>
                  Prêmio
                </TableHead>
              )}
              {/* Col K - Ganhos */}
              <TableHead className="text-right">
                <div className="text-[9px] text-muted-foreground">col. K</div>
                Ganhos
              </TableHead>
              {/* Colunas extras para Knockout */}
              {isKnockout && (
                <TableHead className="text-right">
                  <div className="text-[9px] text-muted-foreground">col. L</div>
                  Recompensa
                </TableHead>
              )}
              {/* Colunas extras para Satellite */}
              {isSatellite && (
                <TableHead className="text-right">
                  <div className="text-[9px] text-muted-foreground">col. L</div>
                  Nome Ticket
                </TableHead>
              )}
              {isSatellite && (
                <TableHead className="text-right">
                  <div className="text-[9px] text-muted-foreground">col. M</div>
                  Valor Ticket
                </TableHead>
              )}
              {/* Col L/M/N - Taxa (NLH regular, Knockout, Satellite) */}
              {!isSPINUP && (
                <TableHead className="text-right">
                  <div className="text-[9px] text-muted-foreground">
                    {isKnockout ? "col. M" : isSatellite ? "col. N" : "col. L"}
                  </div>
                  Taxa
                </TableHead>
              )}
              {/* Col M/N/O - Gap (NLH regular, Knockout, Satellite) */}
              {!isSPINUP && (
                <TableHead className="text-right">
                  <div className="text-[9px] text-muted-foreground">
                    {isKnockout ? "col. N" : isSatellite ? "col. O" : "col. M"}
                  </div>
                  Gap
                </TableHead>
              )}
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
                      {/* Col A - SU */}
                      <TableCell className="font-mono text-xs">
                        {jogador.superUnionId ?? "-"}
                      </TableCell>
                      {/* Col B - Liga */}
                      <TableCell className="font-mono text-xs">
                        {jogador.ligaId}
                      </TableCell>
                      {/* Col C - Clube ID */}
                      <TableCell className="font-mono text-xs">
                        {jogador.clubeId}
                      </TableCell>
                      {/* Col D - Nome Clube */}
                      <TableCell
                        className="text-xs truncate max-w-[120px]"
                        title={jogador.clubeNome}
                      >
                        {jogador.clubeNome || "-"}
                      </TableCell>
                      {/* Col E - ID Jogador */}
                      <TableCell className="font-mono text-xs">
                        {jogador.jogadorId}
                      </TableCell>
                      {/* Col F - Apelido */}
                      <TableCell className="font-medium">
                        {jogador.apelido}
                      </TableCell>
                      {/* Col G - Nome Memo */}
                      <TableCell
                        className="text-xs text-muted-foreground truncate max-w-[120px]"
                        title={jogador.nomeMemorado}
                      >
                        {jogador.nomeMemorado || "-"}
                      </TableCell>
                      {/* Col H - Ranking */}
                      <TableCell className="font-medium text-center">
                        {jogador.ranking}
                      </TableCell>
                      {/* Col I - Buy-in */}
                      <TableCell className="text-right">
                        {formatNumber(jogador.buyinFichas)}
                      </TableCell>
                      {/* Col J - Ticket (NLH) ou Prêmio (SPINUP) */}
                      {!isSPINUP && (
                        <TableCell className="text-right">
                          {formatNumber(jogador.buyinTicket ?? 0)}
                        </TableCell>
                      )}
                      {isSPINUP && (
                        <TableCell className="text-right text-pink-600">
                          {formatNumber(jogador.premio ?? 0)}
                        </TableCell>
                      )}
                      {/* Col K - Ganhos */}
                      <TableCell
                        className={`text-right font-medium ${jogador.ganhos > 0 ? "text-green-600" : jogador.ganhos < 0 ? "text-red-600" : ""}`}
                      >
                        {formatCurrency(jogador.ganhos)}
                      </TableCell>
                      {/* Knockout - Recompensa */}
                      {isKnockout && (
                        <TableCell className="text-right text-orange-600">
                          {formatCurrency(jogador.recompensa ?? 0)}
                        </TableCell>
                      )}
                      {/* Satellite - Nome Ticket */}
                      {isSatellite && (
                        <TableCell className="text-right text-xs">
                          {jogador.nomeTicket || "-"}
                        </TableCell>
                      )}
                      {/* Satellite - Valor Ticket */}
                      {isSatellite && (
                        <TableCell className="text-right text-purple-600">
                          {formatCurrency(jogador.valorTicket ?? 0)}
                        </TableCell>
                      )}
                      {/* Taxa (não SPINUP) */}
                      {!isSPINUP && (
                        <TableCell className="text-right">
                          {formatCurrency(jogador.taxa ?? 0)}
                        </TableCell>
                      )}
                      {/* Gap (não SPINUP) */}
                      {!isSPINUP && (
                        <TableCell
                          className={`text-right ${(jogador.gapGarantido ?? 0) < 0 ? "text-red-600" : ""}`}
                        >
                          {jogador.gapGarantido !== null &&
                          jogador.gapGarantido !== undefined
                            ? formatCurrency(jogador.gapGarantido)
                            : "-"}
                        </TableCell>
                      )}
                    </TableRow>,
                  );
                  rowIndex++;
                }

                // Liga Total row
                const ligaTotal = jogo.totaisPorLiga.find(
                  (t) => t.ligaId === ligaId,
                );
                if (ligaTotal || ligaJogadores.length > 0) {
                  const totalBuyin =
                    ligaTotal?.buyinFichas ??
                    ligaJogadores.reduce((s, j) => s + j.buyinFichas, 0);
                  const totalTicket =
                    ligaTotal?.buyinTicket ??
                    ligaJogadores.reduce((s, j) => s + (j.buyinTicket ?? 0), 0);
                  const totalGanhos =
                    ligaTotal?.ganhos ??
                    ligaJogadores.reduce((s, j) => s + j.ganhos, 0);
                  const totalTaxa =
                    ligaTotal?.taxa ??
                    ligaJogadores.reduce((s, j) => s + (j.taxa ?? 0), 0);
                  const totalGap =
                    ligaTotal?.gapGarantido ??
                    ligaJogadores.reduce(
                      (s, j) => s + (j.gapGarantido ?? 0),
                      0,
                    );
                  const totalPremio =
                    ligaTotal?.premio ??
                    ligaJogadores.reduce((s, j) => s + (j.premio ?? 0), 0);
                  const totalRecompensa =
                    ligaTotal?.recompensa ??
                    ligaJogadores.reduce((s, j) => s + (j.recompensa ?? 0), 0);
                  const totalValorTicket =
                    ligaTotal?.valorTicket ??
                    ligaJogadores.reduce((s, j) => s + (j.valorTicket ?? 0), 0);

                  rows.push(
                    <TableRow
                      key={`liga-total-${ligaId}`}
                      className="bg-blue-500/10 border-t border-blue-500/20"
                    >
                      {/* Col A - SU */}
                      <TableCell className="text-muted-foreground">-</TableCell>
                      {/* Col B - Liga */}
                      <TableCell className="font-mono text-xs text-blue-600">
                        {ligaId}
                      </TableCell>
                      {/* Col C - Clube ID */}
                      <TableCell className="text-muted-foreground">-</TableCell>
                      {/* Col D - Nome Clube */}
                      <TableCell className="text-muted-foreground">-</TableCell>
                      {/* Col E - ID Jogador */}
                      <TableCell className="text-muted-foreground">-</TableCell>
                      {/* Col F - Apelido */}
                      <TableCell className="font-medium text-blue-600">
                        Liga Total
                      </TableCell>
                      {/* Col G - Nome Memo */}
                      <TableCell className="text-muted-foreground">-</TableCell>
                      {/* Col H - Ranking */}
                      <TableCell className="font-medium text-blue-600 text-center">
                        Total
                      </TableCell>
                      {/* Col I - Buy-in */}
                      <TableCell className="text-right font-medium">
                        {formatNumber(totalBuyin)}
                      </TableCell>
                      {/* Col J - Ticket/Prêmio */}
                      {!isSPINUP && (
                        <TableCell className="text-right font-medium">
                          {formatNumber(totalTicket)}
                        </TableCell>
                      )}
                      {isSPINUP && (
                        <TableCell className="text-right font-medium text-pink-600">
                          {formatNumber(totalPremio)}
                        </TableCell>
                      )}
                      {/* Col K - Ganhos */}
                      <TableCell className="text-right font-medium">
                        {formatCurrency(totalGanhos)}
                      </TableCell>
                      {isKnockout && (
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatCurrency(totalRecompensa)}
                        </TableCell>
                      )}
                      {isSatellite && (
                        <TableCell className="text-right font-medium">
                          -
                        </TableCell>
                      )}
                      {isSatellite && (
                        <TableCell className="text-right font-medium text-purple-600">
                          {formatCurrency(totalValorTicket)}
                        </TableCell>
                      )}
                      {!isSPINUP && (
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(totalTaxa)}
                        </TableCell>
                      )}
                      {!isSPINUP && (
                        <TableCell
                          className={`text-right font-medium ${totalGap < 0 ? "text-red-600" : ""}`}
                        >
                          {formatCurrency(totalGap)}
                        </TableCell>
                      )}
                    </TableRow>,
                  );
                }
              }

              return rows;
            })()}

            {/* Total Geral Row - Calculate from players since Excel formulas don't read */}
            {(() => {
              const totalBuyin = jogo.jogadores.reduce(
                (s, j) => s + j.buyinFichas,
                0,
              );
              const totalTicket = jogo.jogadores.reduce(
                (s, j) => s + (j.buyinTicket ?? 0),
                0,
              );
              const totalGanhos = jogo.jogadores.reduce(
                (s, j) => s + j.ganhos,
                0,
              );
              const totalTaxa = jogo.jogadores.reduce(
                (s, j) => s + (j.taxa ?? 0),
                0,
              );
              const totalGap = jogo.jogadores.reduce(
                (s, j) => s + (j.gapGarantido ?? 0),
                0,
              );
              const totalPremio = jogo.jogadores.reduce(
                (s, j) => s + (j.premio ?? 0),
                0,
              );
              const totalRecompensa = jogo.jogadores.reduce(
                (s, j) => s + (j.recompensa ?? 0),
                0,
              );
              const totalValorTicket = jogo.jogadores.reduce(
                (s, j) => s + (j.valorTicket ?? 0),
                0,
              );

              return (
                <TableRow className="bg-muted/50 font-medium border-t-2">
                  {/* Col A - SU */}
                  <TableCell className="text-muted-foreground">-</TableCell>
                  {/* Col B - Liga */}
                  <TableCell className="text-muted-foreground">-</TableCell>
                  {/* Col C - Clube ID */}
                  <TableCell className="text-muted-foreground">-</TableCell>
                  {/* Col D - Nome Clube */}
                  <TableCell className="text-muted-foreground">-</TableCell>
                  {/* Col E - ID Jogador */}
                  <TableCell className="text-muted-foreground">-</TableCell>
                  {/* Col F - Apelido */}
                  <TableCell className="font-bold">Total Geral</TableCell>
                  {/* Col G - Nome Memo */}
                  <TableCell className="text-muted-foreground">-</TableCell>
                  {/* Col H - Ranking */}
                  <TableCell className="font-bold text-center">Total</TableCell>
                  {/* Col I - Buy-in */}
                  <TableCell className="text-right font-bold">
                    {formatNumber(totalBuyin)}
                  </TableCell>
                  {/* Col J - Ticket/Prêmio */}
                  {!isSPINUP && (
                    <TableCell className="text-right font-bold">
                      {formatNumber(totalTicket)}
                    </TableCell>
                  )}
                  {isSPINUP && (
                    <TableCell className="text-right font-bold text-pink-600">
                      {formatNumber(totalPremio)}
                    </TableCell>
                  )}
                  {/* Col K - Ganhos */}
                  <TableCell className="text-right font-bold">
                    {formatCurrency(totalGanhos)}
                  </TableCell>
                  {isKnockout && (
                    <TableCell className="text-right font-bold text-orange-600">
                      {formatCurrency(totalRecompensa)}
                    </TableCell>
                  )}
                  {isSatellite && (
                    <TableCell className="text-right font-bold">-</TableCell>
                  )}
                  {isSatellite && (
                    <TableCell className="text-right font-bold text-purple-600">
                      {formatCurrency(totalValorTicket)}
                    </TableCell>
                  )}
                  {!isSPINUP && (
                    <TableCell className="text-right font-bold text-green-600">
                      {formatCurrency(totalTaxa)}
                    </TableCell>
                  )}
                  {!isSPINUP && (
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

// Memoized game item - compact row style
const JogoItem = memo(function JogoItem({
  jogo,
  isOpen,
  onToggle,
  index,
}: {
  jogo: ParsedLeagueJogoPPST;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const subtipo = jogo.metadata.subtipo;
  const tipoJogo = jogo.metadata.tipoJogo;

  // Determine game type display
  const isSPINUP = tipoJogo.includes("SPINUP");
  const isKnockout = subtipo === "knockout";
  const isSatellite = subtipo === "satellite";

  // Extract organizer from tipoJogo (e.g., "PPST" from "PPST/NLH")
  const organizer = tipoJogo.split("/")[0] || "?";
  const isPPSTOrganized = organizer.toUpperCase() === "PPST";

  // Game type label and style
  let gameTypeLabel: string;
  let badgeClass: string;

  if (isSPINUP) {
    gameTypeLabel = "SPIN";
    badgeClass = "bg-pink-500 text-white";
  } else if (isKnockout) {
    gameTypeLabel = tipoJogo.includes("PKO") ? "PKO" : "MKO";
    badgeClass = "bg-orange-500 text-white";
  } else if (isSatellite) {
    gameTypeLabel = "SAT";
    badgeClass = "bg-purple-500 text-white";
  } else {
    gameTypeLabel = "MTT";
    badgeClass = "bg-blue-500 text-white";
  }

  // Format buy-in display
  const buyInDisplay = jogo.metadata.buyInBounty
    ? `${jogo.metadata.buyInBase}+${jogo.metadata.buyInBounty}+${jogo.metadata.buyInTaxa}`
    : `${jogo.metadata.buyInBase}+${jogo.metadata.buyInTaxa}`;

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

        {/* Organizer badge */}
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 flex-shrink-0 ${
            isPPSTOrganized
              ? "bg-[#00C969] text-white"
              : "bg-gray-500 text-white"
          }`}
        >
          {organizer}
        </span>

        {/* Type badge */}
        <span
          className={`${badgeClass} px-1.5 py-0.5 rounded text-[10px] font-medium mr-2 flex-shrink-0`}
        >
          {gameTypeLabel}
        </span>

        {/* Name - truncate */}
        <span
          className="font-medium truncate max-w-[200px] mr-2"
          title={jogo.metadata.nomeMesa}
        >
          {jogo.metadata.nomeMesa}
        </span>

        {/* ID */}
        <span className="text-muted-foreground font-mono mr-3 flex-shrink-0">
          {jogo.metadata.idJogo}
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Players */}
        <span className="text-muted-foreground mr-3 flex-shrink-0">
          <Users className="h-3 w-3 inline mr-0.5" />
          {jogo.jogadores.length}
        </span>

        {/* Buy-in */}
        <span className="text-muted-foreground mr-3 flex-shrink-0 font-mono">
          {buyInDisplay}
        </span>

        {/* GTD */}
        {jogo.metadata.premiacaoGarantida ? (
          <span className="text-[#00C969] font-medium mr-3 flex-shrink-0">
            GTD {formatNumber(jogo.metadata.premiacaoGarantida)}
          </span>
        ) : (
          <span className="text-muted-foreground/50 mr-3 flex-shrink-0 w-[80px]">
            -
          </span>
        )}

        {/* Buyin */}
        <span className="mr-3 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground mr-0.5">Buyin</span>
          <span className="text-blue-500 font-mono">{formatCurrency(jogo.totalGeral?.buyinFichas ?? 0)}</span>
        </span>

        {/* Ganhos */}
        <span className="mr-3 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground mr-0.5">Ganhos</span>
          <span className={`font-mono ${(jogo.totalGeral?.ganhos ?? 0) < 0 ? "text-red-500" : "text-green-500"}`}>
            {formatCurrency(jogo.totalGeral?.ganhos ?? 0)}
          </span>
        </span>

        {/* Taxa */}
        <span className="mr-3 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground mr-0.5">Taxa</span>
          <span className="text-orange-500 font-mono">{formatCurrency(jogo.totalGeral?.taxa ?? 0)}</span>
        </span>

        {/* Overlay/Lucro para torneios GTD */}
        {jogo.metadata.premiacaoGarantida && jogo.metadata.premiacaoGarantida > 0 ? (
          (() => {
            const buyinLiquido = (jogo.totalGeral?.buyinFichas ?? 0) - (jogo.totalGeral?.taxa ?? 0);
            const gtd = jogo.metadata.premiacaoGarantida;
            const resultado = buyinLiquido - gtd; // positivo = lucro, negativo = overlay
            return (
              <span className="mr-3 flex-shrink-0">
                <span className="text-[10px] text-muted-foreground mr-0.5">Resultado</span>
                <span className={`font-mono text-xs ${resultado >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {resultado >= 0 ? "+" : ""}{formatCurrency(resultado)}
                </span>
              </span>
            );
          })()
        ) : (
          <span className="mr-3 flex-shrink-0 w-[70px]" />
        )}

        {/* Date/time */}
        <span className="text-muted-foreground flex-shrink-0">
          {jogo.metadata.dataInicio}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        {isOpen && <JogoContent jogo={jogo} />}
      </CollapsibleContent>
    </Collapsible>
  );
});

// Filter options for tournament types
type TournamentFilter = "all" | "mtt" | "spin" | "pko" | "mko" | "sat" | "gtd" | "overlay";

const FILTER_OPTIONS: { value: TournamentFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "mtt", label: "MTT" },
  { value: "spin", label: "SPIN" },
  { value: "pko", label: "PKO" },
  { value: "mko", label: "MKO" },
  { value: "sat", label: "SAT" },
  { value: "gtd", label: "Com GTD" },
  { value: "overlay", label: "Com Overlay" },
];

export function LeagueJogosPPSTTab({
  data,
  inicioCount = 0,
  unknownFormatsCount = 0,
}: LeagueJogosPPSTTabProps) {
  const [openJogos, setOpenJogos] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TournamentFilter>("all");

  // Filter data based on selected type
  const filteredData = useMemo(() => {
    if (typeFilter === "all") return data;

    return data.filter((jogo) => {
      const tipoJogo = jogo.metadata.tipoJogo;
      const subtipo = jogo.metadata.subtipo;
      const hasGTD =
        jogo.metadata.premiacaoGarantida &&
        jogo.metadata.premiacaoGarantida > 0;

      switch (typeFilter) {
        case "mtt":
          return (
            !tipoJogo.includes("SPINUP") &&
            subtipo !== "knockout" &&
            subtipo !== "satellite"
          );
        case "spin":
          return tipoJogo.includes("SPINUP");
        case "pko":
          return subtipo === "knockout" && tipoJogo.includes("PKO");
        case "mko":
          return subtipo === "knockout" && !tipoJogo.includes("PKO");
        case "sat":
          return subtipo === "satellite";
        case "gtd":
          return hasGTD;
        case "overlay": {
          // Only PPST organized tournaments with GTD that have overlay
          const isPPSTOrganized = tipoJogo.toUpperCase().startsWith("PPST");
          if (!isPPSTOrganized || !hasGTD) return false;
          const buyinLiquido = (jogo.totalGeral?.buyinFichas ?? 0) - (jogo.totalGeral?.taxa ?? 0);
          const gtd = jogo.metadata.premiacaoGarantida ?? 0;
          const resultado = buyinLiquido - gtd;
          return resultado < 0; // Only show if overlay (negative result)
        }
        default:
          return true;
      }
    });
  }, [data, typeFilter]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  // Reset to page 1 when filter changes
  const handleFilterChange = (value: TournamentFilter) => {
    setTypeFilter(value);
    setCurrentPage(1);
    setOpenJogos(new Set());
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const gameTypes: Record<string, number> = {};
    const uniquePlayerIds = new Set<string | number>();
    let totalBuyin = 0; // Sum of all buy-ins (column J)
    let totalGTD = 0;
    let totalArrecadacaoGTD = 0; // Total collected from GTD tournaments
    let totalTaxaGTD = 0; // Total tax from GTD tournaments only
    let gtdTourneysCount = 0; // Count of tournaments with GTD
    let totalOverlayOnly = 0; // Sum of only negative results (overlays)
    let overlayCount = 0; // Count of tournaments with overlay
    let arrecadacaoOverlay = 0; // Buyin - Taxa only from tournaments with overlay
    let gtdOverlay = 0; // GTD only from tournaments with overlay
    let mttCount = 0;
    let spinCount = 0;
    let pkoCount = 0;
    let mkoCount = 0;
    let satCount = 0;

    // Total Geral - soma de todas as linhas "Total Geral" de cada torneio
    let totalGeralBuyin = 0;
    let totalGeralTicket = 0;
    let totalGeralGanhos = 0;
    let totalGeralTaxa = 0;
    let totalGeralGapGarantido = 0;
    let totalGeralPremio = 0;
    let totalGeralRecompensa = 0;
    let totalGeralValorTicket = 0;

    for (const jogo of filteredData) {
      // Conta jogadores únicos
      for (const jogador of jogo.jogadores) {
        if (jogador.jogadorId) {
          uniquePlayerIds.add(jogador.jogadorId);
        }
      }

      // Calcula totais com fallback para soma dos jogadores (fórmulas Excel não são lidas)
      const jogoBuyinFichas =
        jogo.totalGeral.buyinFichas ||
        jogo.jogadores.reduce((s, j) => s + j.buyinFichas, 0);
      const jogoBuyinTicket =
        jogo.totalGeral.buyinTicket ||
        jogo.jogadores.reduce((s, j) => s + (j.buyinTicket ?? 0), 0);
      const jogoGanhos =
        jogo.totalGeral.ganhos ||
        jogo.jogadores.reduce((s, j) => s + j.ganhos, 0);
      const jogoTaxa =
        jogo.totalGeral.taxa ||
        jogo.jogadores.reduce((s, j) => s + (j.taxa ?? 0), 0);
      const jogoGapGarantido =
        jogo.totalGeral.gapGarantido ||
        jogo.jogadores.reduce((s, j) => s + (j.gapGarantido ?? 0), 0);
      const jogoPremio =
        jogo.totalGeral.premio ||
        jogo.jogadores.reduce((s, j) => s + (j.premio ?? 0), 0);
      const jogoRecompensa =
        jogo.totalGeral.recompensa ||
        jogo.jogadores.reduce((s, j) => s + (j.recompensa ?? 0), 0);
      const jogoValorTicket =
        jogo.totalGeral.valorTicket ||
        jogo.jogadores.reduce((s, j) => s + (j.valorTicket ?? 0), 0);

      totalBuyin += jogoBuyinFichas;
      totalGeralBuyin += jogoBuyinFichas;
      totalGeralTicket += jogoBuyinTicket;
      totalGeralGanhos += jogoGanhos;
      totalGeralTaxa += jogoTaxa;
      totalGeralGapGarantido += jogoGapGarantido;
      totalGeralPremio += jogoPremio;
      totalGeralRecompensa += jogoRecompensa;
      totalGeralValorTicket += jogoValorTicket;

      // Calculate arrecadação (buy-ins collected) for GTD tournaments
      // IMPORTANT: Only count tournaments organized by PPST (tipoJogo starts with "PPST")
      const isPPSTOrganized = jogo.metadata.tipoJogo.toUpperCase().startsWith("PPST");
      if (
        isPPSTOrganized &&
        jogo.metadata.premiacaoGarantida &&
        jogo.metadata.premiacaoGarantida > 0
      ) {
        totalGTD += jogo.metadata.premiacaoGarantida;
        gtdTourneysCount++;

        // Usa o total com fallback
        totalArrecadacaoGTD += jogoBuyinFichas;
        totalTaxaGTD += jogoTaxa;

        // Calculate overlay: (Buyin - Taxa) - GTD
        // Only sum negative results (overlays), ignore profits
        const buyinLiquido = jogoBuyinFichas - jogoTaxa;
        const resultado = buyinLiquido - jogo.metadata.premiacaoGarantida;
        if (resultado < 0) {
          totalOverlayOnly += resultado; // Add negative value (overlay)
          overlayCount++;
          arrecadacaoOverlay += buyinLiquido; // Sum buyin líquido only from overlay tournaments
          gtdOverlay += jogo.metadata.premiacaoGarantida; // Sum GTD only from overlay tournaments
        }
      }

      const tipoJogo = jogo.metadata.tipoJogo;
      const subtipo = jogo.metadata.subtipo;

      // Count by type
      gameTypes[tipoJogo] = (gameTypes[tipoJogo] || 0) + 1;

      // Aggregate categories
      if (tipoJogo.includes("SPINUP")) {
        spinCount++;
      } else if (subtipo === "knockout") {
        if (tipoJogo.includes("PKO")) {
          pkoCount++;
        } else {
          mkoCount++;
        }
      } else if (subtipo === "satellite") {
        satCount++;
      } else {
        mttCount++;
      }
    }

    const jogosCount = filteredData.length;
    const cancelledCount =
      inicioCount > data.length ? inicioCount - data.length : 0;

    // Gap = GTD - Arrecadação (positive = overlay/loss, negative = profit)
    const totalGap = totalGTD - totalArrecadacaoGTD;

    return {
      gameTypes,
      totalPlayers: uniquePlayerIds.size,
      totalBuyin,
      totalGTD,
      totalArrecadacaoGTD,
      totalTaxaGTD,
      gtdTourneysCount,
      totalGap,
      totalOverlayOnly,
      overlayCount,
      arrecadacaoOverlay,
      gtdOverlay,
      mttCount,
      spinCount,
      pkoCount,
      mkoCount,
      satCount,
      jogosCount,
      cancelledCount,
      // Total Geral de todos os torneios
      totalGeralBuyin,
      totalGeralTicket,
      totalGeralGanhos,
      totalGeralTaxa,
      totalGeralGapGarantido,
      totalGeralPremio,
      totalGeralRecompensa,
      totalGeralValorTicket,
    };
  }, [filteredData, data, inicioCount]);

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
      {/* Summary Stats Header */}
      <div className="space-y-4">
        {/* Game Types Legend */}
        <div className="bg-muted/20 rounded-lg p-3 border">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
            Tipos de Torneio
          </div>
          <div className="flex flex-wrap gap-2">
            {summaryStats.mttCount > 0 && (
              <div className="flex items-center gap-1.5 bg-blue-500/10 rounded px-2 py-1">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-medium">MTT</span>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(summaryStats.mttCount)}
                </span>
              </div>
            )}
            {summaryStats.spinCount > 0 && (
              <div className="flex items-center gap-1.5 bg-pink-500/10 rounded px-2 py-1">
                <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                <span className="text-xs font-medium">SPIN</span>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(summaryStats.spinCount)}
                </span>
              </div>
            )}
            {summaryStats.pkoCount > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-500/10 rounded px-2 py-1">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-xs font-medium">PKO</span>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(summaryStats.pkoCount)}
                </span>
              </div>
            )}
            {summaryStats.mkoCount > 0 && (
              <div className="flex items-center gap-1.5 bg-orange-400/10 rounded px-2 py-1">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                <span className="text-xs font-medium">MKO</span>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(summaryStats.mkoCount)}
                </span>
              </div>
            )}
            {summaryStats.satCount > 0 && (
              <div className="flex items-center gap-1.5 bg-purple-500/10 rounded px-2 py-1">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span className="text-xs font-medium">SAT</span>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(summaryStats.satCount)}
                </span>
              </div>
            )}
          </div>

          {/* Detailed game types breakdown */}
          {Object.keys(summaryStats.gameTypes).length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="text-[10px] text-muted-foreground mb-1">
                Detalhado:
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(summaryStats.gameTypes)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <span
                      key={type}
                      className="text-[10px] font-mono text-muted-foreground"
                    >
                      {type}: <span className="text-foreground">{count}</span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pagination Header */}
      <div className="flex items-center justify-between py-2 px-1">
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} de{" "}
            {filteredData.length} jogos
            {typeFilter !== "all" && (
              <span className="text-muted-foreground/60 ml-1">
                (filtrado de {data.length})
              </span>
            )}
          </div>
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={typeFilter}
              onValueChange={(v) => handleFilterChange(v as TournamentFilter)}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Filtrar tipo" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === "overlay"
                      ? `${option.label} (${summaryStats.overlayCount})`
                      : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {/* Totals */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-muted-foreground">GTD ({summaryStats.gtdTourneysCount})</span>
              <span className="text-[#00C969]">{formatCurrency(summaryStats.totalGTD)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-muted-foreground">Buyin GTD</span>
              <span className="text-blue-500">{formatCurrency(summaryStats.totalArrecadacaoGTD)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-muted-foreground">Buyin GTD - Taxa</span>
              <span className="text-cyan-500">{formatCurrency(summaryStats.totalArrecadacaoGTD - summaryStats.totalTaxaGTD)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-muted-foreground">Só Overlay ({summaryStats.overlayCount})</span>
              <span className="text-red-500">{formatCurrency(summaryStats.totalOverlayOnly)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-muted-foreground">Arrec. Overlay</span>
              <span className="text-orange-500">{formatCurrency(summaryStats.arrecadacaoOverlay)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-muted-foreground">GTD Overlay</span>
              <span className="text-[#00C969]">{formatCurrency(summaryStats.gtdOverlay)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-muted-foreground">Ganhos</span>
              <span className={summaryStats.totalGeralGanhos < 0 ? "text-red-500" : "text-green-500"}>{formatCurrency(summaryStats.totalGeralGanhos)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-muted-foreground">Taxa</span>
              <span className="text-green-500">{formatCurrency(summaryStats.totalGeralTaxa)}</span>
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
            <span className="text-[10px] text-muted-foreground">
              (primeiro)
            </span>
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
            <span className="text-[10px] text-muted-foreground">
              (último pela Planilha)
            </span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
          </div>
        </div>
      </div>

      {/* Games List */}
      <div className="border rounded-lg overflow-hidden">
        {paginatedData.map((jogo, pageIndex) => {
          const globalIndex = getGlobalIndex(pageIndex);
          return (
            <JogoItem
              key={globalIndex}
              jogo={jogo}
              isOpen={openJogos.has(globalIndex)}
              onToggle={() => toggleJogo(globalIndex)}
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
