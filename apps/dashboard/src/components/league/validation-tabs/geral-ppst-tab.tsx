"use client";

import type { ParsedLeagueGeralPPSTBloco } from "@/lib/league/types";
import { Badge } from "@midpoker/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@midpoker/ui/collapsible";
import { Icons } from "@midpoker/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

// Ligas brasileiras (60% responsabilidade)
const LIGAS_BR = [1675, 1765, 2101, 2448];

interface LeagueGeralPPSTTabProps {
  data: ParsedLeagueGeralPPSTBloco[];
}

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

export function LeagueGeralPPSTTab({ data }: LeagueGeralPPSTTabProps) {
  const [openBlocos, setOpenBlocos] = useState<Set<number>>(new Set([0])); // First bloco open by default
  const [showOnlyBR, setShowOnlyBR] = useState(false);

  const toggleBloco = (index: number) => {
    const newOpen = new Set(openBlocos);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenBlocos(newOpen);
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Nenhum dado encontrado na aba Geral do PPST
      </div>
    );
  }

  const filteredData = showOnlyBR
    ? data.filter((bloco) => LIGAS_BR.includes(bloco.contexto.entidadeId))
    : data;

  const brCount = data.filter((bloco) =>
    LIGAS_BR.includes(bloco.contexto.entidadeId),
  ).length;

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowOnlyBR(!showOnlyBR)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors ${
            showOnlyBR
              ? "bg-[#00C969] text-white border-[#00C969]"
              : "bg-transparent text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          🇧🇷 Brasil ({brCount})
        </button>
        {showOnlyBR && (
          <span className="text-xs text-muted-foreground">
            Mostrando apenas ligas brasileiras
          </span>
        )}
      </div>

      {filteredData.map((bloco, blocoIndex) => {
        const isBrazilianLeague = LIGAS_BR.includes(bloco.contexto.entidadeId);

        return (
          <Collapsible
            key={blocoIndex}
            open={openBlocos.has(blocoIndex)}
            onOpenChange={() => toggleBloco(blocoIndex)}
            className="border rounded-lg"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50">
              <div className="flex items-center gap-3">
                {openBlocos.has(blocoIndex) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <div className="flex items-center gap-2">
                  {isBrazilianLeague && <span className="text-xs">🇧🇷</span>}
                  <Badge variant="outline">
                    {bloco.contexto.entidadeTipo} {bloco.contexto.entidadeId}
                  </Badge>
                  <Badge variant="secondary">{bloco.contexto.taxaCambio}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {bloco.periodo.dataInicio} - {bloco.periodo.dataFim}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>{bloco.ligas.length} ligas</span>
                <span
                  className={
                    bloco.total.ganhosJogador < 0
                      ? "text-red-600 font-medium"
                      : "text-muted-foreground"
                  }
                >
                  Jogador: {formatCurrency(bloco.total.ganhosJogador)}
                </span>
                <span className="text-green-600 font-medium">
                  Taxa: {formatCurrency(bloco.total.ganhosLigaTaxa)}
                </span>
                {bloco.total.gapGarantido !== 0 && (
                  <span
                    className={
                      bloco.total.gapGarantido < 0
                        ? "text-red-600 font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    Gap: {formatCurrency(bloco.total.gapGarantido)}
                  </span>
                )}
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="px-4 pb-4">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {/* Primeira linha - headers principais com merge */}
                      <TableRow>
                        <TableHead
                          rowSpan={2}
                          className="w-[60px] align-bottom"
                        >
                          <div className="text-[9px] text-muted-foreground">
                            col. A
                          </div>
                          SU ID
                        </TableHead>
                        <TableHead rowSpan={2} className="align-bottom">
                          <div className="text-[9px] text-muted-foreground">
                            col. B/C
                          </div>
                          Liga
                        </TableHead>
                        <TableHead
                          rowSpan={2}
                          className="w-[60px] align-bottom"
                        >
                          <div className="text-[9px] text-muted-foreground">
                            col. D
                          </div>
                          ID Liga
                        </TableHead>
                        <TableHead
                          colSpan={3}
                          className="text-center border-b-0 bg-red-500/10 text-red-600"
                        >
                          Ganhos do Jogador
                        </TableHead>
                        <TableHead
                          rowSpan={2}
                          className="text-right align-bottom"
                        >
                          <div className="text-[9px] text-muted-foreground">
                            col. H
                          </div>
                          Prêmio Pers.
                        </TableHead>
                        <TableHead
                          colSpan={6}
                          className="text-center border-b-0 bg-green-500/10 text-green-600"
                        >
                          Ganhos da Liga
                        </TableHead>
                        <TableHead
                          rowSpan={2}
                          className="text-right align-bottom text-red-600"
                        >
                          <div className="text-[9px] text-muted-foreground">
                            col. O
                          </div>
                          Gap
                        </TableHead>
                      </TableRow>
                      {/* Segunda linha - sub-headers */}
                      <TableRow>
                        {/* Sub-headers de Ganhos do Jogador (E, F, G) */}
                        <TableHead className="text-right text-xs bg-red-500/5">
                          <div className="text-[9px] text-muted-foreground">
                            col. E
                          </div>
                          Ganhos Jog.
                        </TableHead>
                        <TableHead className="text-right text-xs bg-red-500/5">
                          <div className="text-[9px] text-muted-foreground">
                            col. F
                          </div>
                          Ticket Ganho
                        </TableHead>
                        <TableHead className="text-right text-xs bg-red-500/5">
                          <div className="text-[9px] text-muted-foreground">
                            col. G
                          </div>
                          Buy-in Ticket
                        </TableHead>
                        {/* Sub-headers de Ganhos da Liga */}
                        <TableHead className="text-right text-xs bg-green-500/5">
                          <div className="text-[9px] text-muted-foreground">
                            col. I
                          </div>
                          Geral
                        </TableHead>
                        <TableHead className="text-right text-xs bg-green-500/5">
                          <div className="text-[9px] text-muted-foreground">
                            col. J
                          </div>
                          Taxa
                        </TableHead>
                        <TableHead className="text-right text-xs bg-green-500/5">
                          <div className="text-[9px] text-muted-foreground">
                            col. K
                          </div>
                          Buy-in SPIN
                        </TableHead>
                        <TableHead className="text-right text-xs bg-green-500/5">
                          <div className="text-[9px] text-muted-foreground">
                            col. L
                          </div>
                          Prêmio SPIN
                        </TableHead>
                        <TableHead className="text-right text-xs bg-green-500/5">
                          <div className="text-[9px] text-muted-foreground">
                            col. M
                          </div>
                          Ticket Entreg.
                        </TableHead>
                        <TableHead className="text-right text-xs bg-green-500/5">
                          <div className="text-[9px] text-muted-foreground">
                            col. N
                          </div>
                          Buy-in Ticket
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        // Separar apenas ligas BR das demais
                        const ligasBR = bloco.ligas.filter((l) =>
                          LIGAS_BR.includes(l.ligaId),
                        );
                        const ligasOutras = bloco.ligas.filter(
                          (l) => !LIGAS_BR.includes(l.ligaId),
                        );

                        const renderLigaRow = (
                          liga: (typeof bloco.ligas)[0],
                          ligaIndex: number,
                        ) => (
                          <TableRow key={ligaIndex}>
                            <TableCell className="font-mono text-xs">
                              {liga.superUnionId ?? "-"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {liga.ligaNome}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {liga.ligaId}
                            </TableCell>
                            <TableCell
                              className={`text-right ${liga.ganhosJogador < 0 ? "text-red-600" : ""}`}
                            >
                              {formatCurrency(liga.ganhosJogador)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(liga.valorTicketGanho)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(liga.buyinTicket)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(liga.valorPremioPersonalizado)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(liga.ganhosLigaGeral)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {formatCurrency(liga.ganhosLigaTaxa)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(liga.buyinSpinup)}
                            </TableCell>
                            <TableCell
                              className={`text-right ${liga.premiacaoSpinup < 0 ? "text-red-600" : ""}`}
                            >
                              {formatNumber(liga.premiacaoSpinup)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(liga.valorTicketEntregue)}
                            </TableCell>
                            <TableCell
                              className={`text-right ${liga.buyinTicketLiga < 0 ? "text-red-600" : ""}`}
                            >
                              {formatNumber(liga.buyinTicketLiga)}
                            </TableCell>
                            <TableCell
                              className={`text-right ${(liga.gapGarantido ?? 0) < 0 ? "text-red-600" : "text-muted-foreground"}`}
                            >
                              {liga.gapGarantido != null
                                ? formatCurrency(liga.gapGarantido)
                                : "-"}
                            </TableCell>
                          </TableRow>
                        );

                        return (
                          <>
                            {/* Ligas BR primeiro */}
                            {ligasBR.length > 0 && (
                              <TableRow className="bg-blue-500/5">
                                <TableCell
                                  colSpan={14}
                                  className="py-1 text-[10px] font-medium text-blue-600"
                                >
                                  🇧🇷 Brasil (60%)
                                </TableCell>
                              </TableRow>
                            )}
                            {ligasBR.map((liga, i) => renderLigaRow(liga, i))}

                            {/* Demais ligas */}
                            {ligasOutras.map((liga, i) =>
                              renderLigaRow(liga, ligasBR.length + i),
                            )}
                          </>
                        );
                      })()}
                      {/* Total Row */}
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell colSpan={3}>Total</TableCell>
                        <TableCell
                          className={`text-right ${bloco.total.ganhosJogador < 0 ? "text-red-600" : ""}`}
                        >
                          {formatCurrency(bloco.total.ganhosJogador)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(bloco.total.valorTicketGanho)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(bloco.total.buyinTicket)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(bloco.total.valorPremioPersonalizado)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(bloco.total.ganhosLigaGeral)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(bloco.total.ganhosLigaTaxa)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(bloco.total.buyinSpinup)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${bloco.total.premiacaoSpinup < 0 ? "text-red-600" : ""}`}
                        >
                          {formatNumber(bloco.total.premiacaoSpinup)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(bloco.total.valorTicketEntregue)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${bloco.total.buyinTicketLiga < 0 ? "text-red-600" : ""}`}
                        >
                          {formatNumber(bloco.total.buyinTicketLiga)}
                        </TableCell>
                        <TableCell
                          className={`text-right ${bloco.total.gapGarantido < 0 ? "text-red-600 font-medium" : ""}`}
                        >
                          {formatCurrency(bloco.total.gapGarantido)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
