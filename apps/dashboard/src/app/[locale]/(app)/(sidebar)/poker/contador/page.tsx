import { ErrorBoundary } from "@/components/error-boundary";
import { ContadorPage } from "@/components/poker/contador-page";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contador | Poker Club | Midday",
};

export default async function PokerContadorPage() {
  const queryClient = getQueryClient();
  const t = await getI18n();

  // No SSR prefetch for getLive — it calls the PPPoker bridge
  // which requires a TCP connection and is too slow for SSR.

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="pt-6">
          <h1 className="text-2xl font-medium">
            {t("poker.contador.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("poker.contador.description")}
          </p>
        </div>

        <ErrorBoundary>
          <ContadorPage />
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
