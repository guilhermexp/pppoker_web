import { getI18n } from "@/locales/server";
import { Icons } from "@midpoker/ui/icons";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n();
  return {
    title: t("fastchips.jogadores.title"),
  };
}

export default async function FastChipsJogadoresPage() {
  const t = await getI18n();

  return (
    <div className="flex flex-col gap-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("fastchips.jogadores.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("fastchips.jogadores.description")}
          </p>
        </div>
      </div>

      {/* Em Desenvolvimento */}
      <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-border rounded-lg bg-muted/30">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <div className="p-4 bg-primary/10 rounded-full">
            <Icons.Customers className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{t("fastchips.in_development")}</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              {t("fastchips.in_development_description")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
