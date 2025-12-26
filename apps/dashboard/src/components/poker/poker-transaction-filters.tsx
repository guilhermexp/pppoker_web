"use client";

import { PokerDateFilter } from "@/components/poker/poker-date-filter";
import { usePokerTransactionParams } from "@/hooks/use-poker-transaction-params";
import { useI18n } from "@/locales/client";
import { Button } from "@midday/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@midday/ui/dropdown-menu";
import { Icons } from "@midday/ui/icons";

const transactionTypes = [
  { value: "buy_in", label: "Buy-in" },
  { value: "cash_out", label: "Cash-out" },
  { value: "credit_given", label: "Crédito Dado" },
  { value: "credit_received", label: "Crédito Recebido" },
  { value: "credit_paid", label: "Crédito Pago" },
  { value: "rake", label: "Rake" },
  { value: "agent_commission", label: "Comissão Agente" },
  { value: "rakeback", label: "Rakeback" },
  { value: "jackpot", label: "Jackpot" },
  { value: "adjustment", label: "Ajuste" },
  { value: "transfer_in", label: "Transferência (Entrada)" },
  { value: "transfer_out", label: "Transferência (Saída)" },
] as const;

export function PokerTransactionFilters() {
  const t = useI18n();
  const { type, dateFrom, dateTo, setParams, hasFilters } = usePokerTransactionParams();

  const selectedTypeLabel = type
    ? transactionTypes.find((t) => t.value === type)?.label ?? type
    : "Todos os Tipos";

  return (
    <div className="flex items-center gap-2">
      {/* Date Range Filter */}
      <PokerDateFilter
        from={dateFrom}
        to={dateTo}
        onChange={(params) => setParams({ dateFrom: params.from, dateTo: params.to })}
      />

      {/* Transaction Type Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Icons.Transactions className="mr-2 h-4 w-4" />
            {selectedTypeLabel}
            <Icons.ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
          <DropdownMenuLabel>Tipo de Transação</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={type === null}
            onCheckedChange={() => setParams({ type: null })}
          >
            Todos os Tipos
          </DropdownMenuCheckboxItem>
          {transactionTypes.map((transType) => (
            <DropdownMenuCheckboxItem
              key={transType.value}
              checked={type === transType.value}
              onCheckedChange={() => setParams({ type: transType.value as any })}
            >
              {transType.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => setParams(null)}
        >
          <Icons.Clear className="mr-2 h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
