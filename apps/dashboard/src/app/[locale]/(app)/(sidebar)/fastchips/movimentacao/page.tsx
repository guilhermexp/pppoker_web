import { FastChipsMovementDetailSheet } from "@/components/fastchips/movement-detail-sheet";
import { FastChipsMovementsTable } from "@/components/fastchips/movements-table";
import { getI18n } from "@/locales/server";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n();
  return {
    title: t("fastchips.movimentacao.title"),
  };
}

export default async function FastChipsMovimentacaoPage() {
  const t = await getI18n();

  return (
    <div className="flex flex-col gap-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("fastchips.movimentacao.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("fastchips.movimentacao.description")}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Icons.Refresh className="h-4 w-4" />
          {t("fastchips.movimentacao.refresh")}
        </Button>
      </div>

      <FastChipsMovementsTable />
      <FastChipsMovementDetailSheet />
    </div>
  );
}
