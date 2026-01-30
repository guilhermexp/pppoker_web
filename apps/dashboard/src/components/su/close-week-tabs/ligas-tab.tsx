"use client";

import { formatNumber } from "@/utils/format";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { useMemo } from "react";

interface LeagueSummary {
  id: string;
  liga_nome: string;
  liga_id: number;
  ppst_ganhos_jogador: string | number | null;
  ppst_ganhos_liga_geral: string | number | null;
  ppst_ganhos_liga_taxa: string | number | null;
  ppst_gap_garantido: string | number | null;
  ppsr_ganhos_jogador: string | number | null;
  ppsr_ganhos_liga_geral: string | number | null;
  ppsr_ganhos_liga_taxa: string | number | null;
  total_ganhos_jogador: string | number | null;
  total_ganhos_liga_taxa: string | number | null;
}

interface LigasTabProps {
  summaries: LeagueSummary[];
}

function num(v: string | number | null | undefined): number {
  return Number(v || 0);
}

export function LigasTab({ summaries }: LigasTabProps) {
  const totals = useMemo(() => {
    return summaries.reduce(
      (acc, s) => ({
        ppstGanhosJogador: acc.ppstGanhosJogador + num(s.ppst_ganhos_jogador),
        ppstLigaGeral: acc.ppstLigaGeral + num(s.ppst_ganhos_liga_geral),
        ppstLigaTaxa: acc.ppstLigaTaxa + num(s.ppst_ganhos_liga_taxa),
        ppstGapGtd: acc.ppstGapGtd + num(s.ppst_gap_garantido),
        ppsrGanhosJogador: acc.ppsrGanhosJogador + num(s.ppsr_ganhos_jogador),
        ppsrLigaGeral: acc.ppsrLigaGeral + num(s.ppsr_ganhos_liga_geral),
        ppsrLigaTaxa: acc.ppsrLigaTaxa + num(s.ppsr_ganhos_liga_taxa),
        totalJogador: acc.totalJogador + num(s.total_ganhos_jogador),
        totalTaxa: acc.totalTaxa + num(s.total_ganhos_liga_taxa),
      }),
      {
        ppstGanhosJogador: 0,
        ppstLigaGeral: 0,
        ppstLigaTaxa: 0,
        ppstGapGtd: 0,
        ppsrGanhosJogador: 0,
        ppsrLigaGeral: 0,
        ppsrLigaTaxa: 0,
        totalJogador: 0,
        totalTaxa: 0,
      },
    );
  }, [summaries]);

  return (
    <div className="p-6 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b-0">
            <TableHead rowSpan={2} className="align-bottom border-b">
              Liga
            </TableHead>
            <TableHead
              colSpan={4}
              className="text-center text-blue-600 dark:text-blue-400 border-b border-blue-200 dark:border-blue-800"
            >
              PPST
            </TableHead>
            <TableHead
              colSpan={3}
              className="text-center text-green-600 dark:text-green-400 border-b border-green-200 dark:border-green-800"
            >
              PPSR
            </TableHead>
            <TableHead
              colSpan={2}
              className="text-center font-semibold border-b"
            >
              Totais
            </TableHead>
          </TableRow>
          <TableRow>
            <TableHead className="text-right text-xs">Ganhos Jogador</TableHead>
            <TableHead className="text-right text-xs">Liga Geral</TableHead>
            <TableHead className="text-right text-xs">Liga Taxa</TableHead>
            <TableHead className="text-right text-xs">Gap GTD</TableHead>
            <TableHead className="text-right text-xs">Ganhos Jogador</TableHead>
            <TableHead className="text-right text-xs">Liga Geral</TableHead>
            <TableHead className="text-right text-xs">Liga Taxa</TableHead>
            <TableHead className="text-right text-xs">Jogador</TableHead>
            <TableHead className="text-right text-xs">Taxa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaries.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{s.liga_nome}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {s.liga_id}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatNumber(num(s.ppst_ganhos_jogador))}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatNumber(num(s.ppst_ganhos_liga_geral))}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-green-600">
                {formatNumber(num(s.ppst_ganhos_liga_taxa))}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-yellow-600">
                {formatNumber(num(s.ppst_gap_garantido))}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatNumber(num(s.ppsr_ganhos_jogador))}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatNumber(num(s.ppsr_ganhos_liga_geral))}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-green-600">
                {formatNumber(num(s.ppsr_ganhos_liga_taxa))}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums font-medium">
                {formatNumber(num(s.total_ganhos_jogador))}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums font-semibold text-green-600">
                {formatNumber(num(s.total_ganhos_liga_taxa))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="font-semibold">
            <TableCell>Total ({summaries.length} ligas)</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(totals.ppstGanhosJogador)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(totals.ppstLigaGeral)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-green-600">
              {formatNumber(totals.ppstLigaTaxa)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-yellow-600">
              {formatNumber(totals.ppstGapGtd)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(totals.ppsrGanhosJogador)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(totals.ppsrLigaGeral)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-green-600">
              {formatNumber(totals.ppsrLigaTaxa)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(totals.totalJogador)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-green-600">
              {formatNumber(totals.totalTaxa)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
