"use client";

import type { ParsedLeagueGeralPPSTBloco } from "@/lib/league/types";
import { Badge } from "@midday/ui/badge";
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
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

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
              <span className="text-green-600 font-medium">
                Taxa: {formatCurrency(bloco.total.ganhosLigaTaxa)}
              </span>
              {bloco.total.gapGarantido !== 0 && (
                <span className={bloco.total.gapGarantido < 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>
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
                    <TableRow>
                      <TableHead className="w-[80px]">SU ID</TableHead>
                      <TableHead>Liga</TableHead>
                      <TableHead className="w-[80px]">ID Liga</TableHead>
                      <TableHead className="text-right">
                        Ganhos Jogador
                      </TableHead>
                      <TableHead className="text-right">Ticket Ganho</TableHead>
                      <TableHead className="text-right">
                        Buy-in Ticket
                      </TableHead>
                      <TableHead className="text-right">Ganhos Liga</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                      <TableHead className="text-right">Buy-in SPIN</TableHead>
                      <TableHead className="text-right">Prêmio SPIN</TableHead>
                      <TableHead className="text-right">Gap</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bloco.ligas.map((liga, ligaIndex) => (
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
                        <TableCell className="text-right text-muted-foreground">
                          -
                        </TableCell>
                      </TableRow>
                    ))}
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
      ))}
    </div>
  );
}
