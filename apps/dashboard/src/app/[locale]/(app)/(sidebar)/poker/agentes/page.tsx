import { ErrorBoundary } from "@/components/error-boundary";
import { AgentesPage } from "@/components/poker/agentes-page";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agentes | Poker Club | Midday",
};

export default async function PokerAgentesPage() {
  const queryClient = getQueryClient();
  const t = await getI18n();

  try {
    await queryClient.fetchQuery(trpc.poker.members.getLive.queryOptions({}));
  } catch {
    // SSR prefetch failed, client will fetch via Suspense
  }

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="pt-6">
          <h1 className="text-2xl font-medium">{t("poker.agentes.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("poker.agentes.description")}
          </p>
        </div>

        <ErrorBoundary>
          <AgentesPage />
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
