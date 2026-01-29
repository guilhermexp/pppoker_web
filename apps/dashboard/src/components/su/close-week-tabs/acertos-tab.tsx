"use client";

import { formatNumber } from "@/utils/format";
import { cn } from "@midpoker/ui/cn";
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

interface Settlement {
  ligaId: number;
  ligaNome: string;
  ppstLeagueFee: number;
  ppsrLeagueFee: number;
  ppstGapGuaranteed: number;
  grossAmount: number;
  netAmount: number;
  existingSettlement: {
    id: string;
    status: string;
    paidAmount: number;
  } | null;
}

interface AcertosTabProps {
  settlements: Settlement[];
}

function StatusBadge({ settlement }: { settlement: Settlement }) {
  if (settlement.existingSettlement) {
    const { status } = settlement.existingSettlement;
    const config = {
      completed: {
        label: "Pago",
        className:
          "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      },
      partial: {
        label: "Parcial",
        className:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      },
      pending: {
        label: "Pendente",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
    }[status] ?? {
      label: status,
      className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    };

    return (
      <span
        className={cn("px-2 py-0.5 rounded text-xs font-medium", config.className)}
      >
        {config.label}
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
      Novo
    </span>
  );
}

export function AcertosTab({ settlements }: AcertosTabProps) {
  const totals = useMemo(() => {
    return settlements.reduce(
      (acc, s) => ({
        ppstFee: acc.ppstFee + s.ppstLeagueFee,
        ppsrFee: acc.ppsrFee + s.ppsrLeagueFee,
        gapGtd: acc.gapGtd + s.ppstGapGuaranteed,
        gross: acc.gross + s.grossAmount,
        net: acc.net + s.netAmount,
      }),
      { ppstFee: 0, ppsrFee: 0, gapGtd: 0, gross: 0, net: 0 },
    );
  }, [settlements]);

  return (
    <div className="p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Liga</TableHead>
            <TableHead className="text-right">Taxa PPST</TableHead>
            <TableHead className="text-right">Taxa PPSR</TableHead>
            <TableHead className="text-right">Gap GTD</TableHead>
            <TableHead className="text-right">Bruto</TableHead>
            <TableHead className="text-right">Liquido</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settlements.map((settlement) => (
            <TableRow key={settlement.ligaId}>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{settlement.ligaNome}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {settlement.ligaId}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatNumber(settlement.ppstLeagueFee)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatNumber(settlement.ppsrLeagueFee)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-yellow-600">
                {formatNumber(settlement.ppstGapGuaranteed)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatNumber(settlement.grossAmount)}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums font-semibold text-green-600">
                {formatNumber(settlement.netAmount)}
              </TableCell>
              <TableCell>
                <StatusBadge settlement={settlement} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow className="font-semibold">
            <TableCell>Total ({settlements.length} ligas)</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(totals.ppstFee)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(totals.ppsrFee)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-yellow-600">
              {formatNumber(totals.gapGtd)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(totals.gross)}
            </TableCell>
            <TableCell className="text-right tabular-nums text-green-600">
              {formatNumber(totals.net)}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
