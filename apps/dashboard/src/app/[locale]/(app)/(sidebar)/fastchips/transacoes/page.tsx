import { FastChipsTransactionDetailSheet } from "@/components/fastchips/transaction-detail-sheet";
import { FastChipsTransactionsTable } from "@/components/fastchips/transactions-table";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transações | Fastchips",
};

export default async function FastChipsTransacoesPage() {
  return (
    <div className="flex flex-col gap-6 mt-6">
      <div>
        <h1 className="text-2xl font-semibold">Transações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Movimentação de fichas — entradas e saídas
        </p>
      </div>

      <FastChipsTransactionsTable />
      <FastChipsTransactionDetailSheet />
    </div>
  );
}
