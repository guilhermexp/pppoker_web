"use client";

import type { ParsedLeagueGeralPPSRBloco } from "@/lib/league/types";
import { formatDecimal as formatCurrency } from "@/utils/format";
import { Badge } from "@midpoker/ui/badge";
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
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface LeagueGeralPPSRTabProps {
  data: ParsedLeagueGeralPPSRBloco[];
}

export function LeagueGeralPPSRTab({ data }: LeagueGeralPPSRTabProps) {
  const [openBlocos, setOpenBlocos] = useState<Set<number>>(new Set([0])); // First bloco open by default

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
        Nenhum dado encontrado na aba Geral do PPSR
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((bloco, blocoIndex) => (
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
                  bloco.total.ganhosJogadorGeral < 0
                    ? "text-red-600 font-medium"
                    : "text-muted-foreground"
                }
              >
                Jogador: {formatCurrency(bloco.total.ganhosJogadorGeral)}
              </span>
              <span className="text-green-600 font-medium">
                Taxa: {formatCurrency(bloco.total.ganhosLigaTaxa)}
              </span>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">
                        <div className="text-[9px] text-muted-foreground">
                          col. A
                        </div>
                        SU ID
                      </TableHead>
                      <TableHead>
                        <div className="text-[9px] text-muted-foreground">
                          col. B/C
                        </div>
                        Liga
                      </TableHead>
                      <TableHead className="w-[70px]">
                        <div className="text-[9px] text-muted-foreground">
                          col. D
                        </div>
                        ID Liga
                      </TableHead>
                      <TableHead className="w-[80px]">
                        <div className="text-[9px] text-muted-foreground">
                          col. E
                        </div>
                        Class.
                      </TableHead>
                      <TableHead
                        className="text-right"
                        title="Ganhos Jogador - Geral"
                      >
                        <div className="text-[9px] text-muted-foreground">
                          col. F
                        </div>
                        Jogador
                      </TableHead>
                      <TableHead
                        className="text-right"
                        title="Ganhos Jogador - De adversários"
                      >
                        <div className="text-[9px] text-muted-foreground">
                          col. G
                        </div>
                        Advers.
                      </TableHead>
                      <TableHead
                        className="text-right"
                        title="Ganhos Jogador - De Jackpot"
                      >
                        <div className="text-[9px] text-muted-foreground">
                          col. H
                        </div>
                        Jackpot
                      </TableHead>
                      <TableHead
                        className="text-right"
                        title="Ganhos Jogador - Dividir EV"
                      >
                        <div className="text-[9px] text-muted-foreground">
                          col. I
                        </div>
                        Div. EV
                      </TableHead>
                      <TableHead
                        className="text-right"
                        title="Ganhos Liga - Geral"
                      >
                        <div className="text-[9px] text-muted-foreground">
                          col. J
                        </div>
                        Liga
                      </TableHead>
                      <TableHead
                        className="text-right"
                        title="Ganhos Liga - Taxa"
                      >
                        <div className="text-[9px] text-muted-foreground">
                          col. K
                        </div>
                        Taxa
                      </TableHead>
                      <TableHead className="text-right" title="Taxa do Jackpot">
                        <div className="text-[9px] text-muted-foreground">
                          col. L
                        </div>
                        Tx. JP
                      </TableHead>
                      <TableHead className="text-right" title="Prêmio Jackpot">
                        <div className="text-[9px] text-muted-foreground">
                          col. M
                        </div>
                        Pr. JP
                      </TableHead>
                      <TableHead className="text-right" title="Dividir EV">
                        <div className="text-[9px] text-muted-foreground">
                          col. N
                        </div>
                        Div. EV
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bloco.ligas.map((liga, ligaIndex) => (
                      <TableRow key={ligaIndex}>
                        <TableCell className="font-mono text-xs">
                          {liga.superUnionId ?? "-"}
                        </TableCell>
                        <TableCell
                          className="font-medium max-w-[150px] truncate"
                          title={liga.ligaNome}
                        >
                          {liga.ligaNome}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {liga.ligaId}
                        </TableCell>
                        <TableCell className="text-xs">
                          {liga.classificacaoPPSR || "-"}
                        </TableCell>
                        <TableCell
                          className={`text-right ${liga.ganhosJogadorGeral < 0 ? "text-red-600" : ""}`}
                        >
                          {formatCurrency(liga.ganhosJogadorGeral)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(liga.ganhosJogadorDeAdversarios)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(liga.ganhosJogadorDeJackpot)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(liga.ganhosJogadorDeDividirEV)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(liga.ganhosLigaGeral)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(liga.ganhosLigaTaxa)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(liga.ganhosLigaTaxaJackpot)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(liga.ganhosLigaPremioJackpot)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(liga.ganhosLigaDividirEV)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total Row */}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell
                        className={`text-right ${bloco.total.ganhosJogadorGeral < 0 ? "text-red-600" : ""}`}
                      >
                        {formatCurrency(bloco.total.ganhosJogadorGeral)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bloco.total.ganhosJogadorDeAdversarios)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bloco.total.ganhosJogadorDeJackpot)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bloco.total.ganhosJogadorDeDividirEV)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bloco.total.ganhosLigaGeral)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(bloco.total.ganhosLigaTaxa)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bloco.total.ganhosLigaTaxaJackpot)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bloco.total.ganhosLigaPremioJackpot)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bloco.total.ganhosLigaDividirEV)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
