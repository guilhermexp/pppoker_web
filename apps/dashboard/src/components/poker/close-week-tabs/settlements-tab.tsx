"use client";

import { Icons } from "@midpoker/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";

type Settlement = {
  playerId: string;
  playerNickname: string;
  playerMemoName: string | null;
  playerType: "player" | "agent" | "super_agent";
  agentNickname: string | null;
  chipBalance: number;
  rakebackPercent: number;
  rakebackAmount: number;
  netAmount: number;
  grossAmount: number;
};

type SettlementsTabProps = {
  settlements: Settlement[];
  summary: {
    totalSettlements: number;
    totalGross: number;
    totalRakeback: number;
    totalNet: number;
    playersWithPositiveBalance: number;
    playersWithNegativeBalance: number;
  };
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SettlementsTab({ settlements, summary }: SettlementsTabProps) {
  if (settlements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Icons.Inbox className="h-12 w-12 mb-4 opacity-20" />
        <p>Nenhum jogador com saldo pendente</p>
        <p className="text-sm">
          Não há acertos a serem gerados para esta semana
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        <SummaryCard
          title="Acertos"
          value={summary.totalSettlements}
          type="number"
        />
        <SummaryCard
          title="Valor Bruto"
          value={summary.totalGross}
          type="currency"
        />
        <SummaryCard
          title="Rakeback"
          value={summary.totalRakeback}
          type="currency"
          color="orange"
        />
        <SummaryCard
          title="Valor Líquido"
          value={summary.totalNet}
          type="currency"
          color="green"
        />
        <SummaryCard
          title="Saldo"
          value={`${summary.playersWithPositiveBalance} / ${summary.playersWithNegativeBalance}`}
          subtitle="positivos / negativos"
          type="text"
        />
      </div>

      {/* Settlements Table */}
      <div className="border border-[#1d1d1d]/50 rounded-md overflow-auto max-h-[500px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-[200px]">Jogador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Agente</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Rakeback %</TableHead>
              <TableHead className="text-right">Rakeback</TableHead>
              <TableHead className="text-right">Líquido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.map((settlement) => (
              <TableRow key={settlement.playerId}>
                <TableCell className="font-medium">
                  {settlement.playerNickname}
                  {settlement.playerMemoName && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({settlement.playerMemoName})
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs capitalize">
                    {settlement.playerType === "super_agent"
                      ? "Super Agent"
                      : settlement.playerType === "agent"
                        ? "Agent"
                        : "Player"}
                  </span>
                </TableCell>
                <TableCell>{settlement.agentNickname ?? "-"}</TableCell>
                <TableCell
                  className={`text-right font-mono ${
                    settlement.chipBalance >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(settlement.chipBalance)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {settlement.rakebackPercent.toFixed(0)}%
                </TableCell>
                <TableCell className="text-right font-mono text-orange-600">
                  {formatCurrency(settlement.rakebackAmount)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono font-medium ${
                    settlement.netAmount >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(settlement.netAmount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  type,
  color,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  type: "number" | "currency" | "text";
  color?: "green" | "orange" | "red";
}) {
  const colorClass =
    color === "green"
      ? "text-green-600"
      : color === "orange"
        ? "text-orange-600"
        : color === "red"
          ? "text-red-600"
          : "";

  const formattedValue =
    type === "currency"
      ? formatCurrency(value as number)
      : type === "number"
        ? (value as number).toLocaleString("pt-BR")
        : value;

  return (
    <div className="p-3 border border-[#1d1d1d]/50 rounded-lg bg-card">
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className={`text-lg font-semibold ${colorClass}`}>{formattedValue}</p>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
