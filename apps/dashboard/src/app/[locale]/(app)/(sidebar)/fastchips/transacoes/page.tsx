import { FastChipsTransactionDetailSheet } from "@/components/fastchips/transaction-detail-sheet";
import { FastChipsTransactionsTable } from "@/components/fastchips/transactions-table";
import { getI18n } from "@/locales/server";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n();
  return {
    title: t("fastchips.transacoes.title"),
  };
}

export default async function FastChipsTransacoesPage() {
  const t = await getI18n();

  return (
    <div className="flex flex-col gap-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("fastchips.transacoes.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("fastchips.transacoes.description")}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Icons.Refresh className="h-4 w-4" />
          {t("fastchips.transacoes.refresh")}
        </Button>
      </div>

      <FastChipsTransactionsTable />
      <FastChipsTransactionDetailSheet />
    </div>
  );
}
