import { FastChipsControlPanel } from "@/components/fastchips/control-panel";
import { getI18n } from "@/locales/server";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import type { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n();
  return {
    title: t("fastchips.controle.title"),
  };
}

export default async function FastChipsControlePage() {
  const t = await getI18n();

  return (
    <div className="flex flex-col gap-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {t("fastchips.controle.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("fastchips.controle.description")}
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }
      >
        <FastChipsControlPanel />
      </Suspense>
    </div>
  );
}
