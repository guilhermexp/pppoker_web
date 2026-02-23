import { ErrorBoundary } from "@/components/error-boundary";
import { SuperAgentesPage } from "@/components/poker/super-agentes-page";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Super Agentes | Poker Club | Midday",
};

export default async function PokerSuperAgentesPage() {
  const queryClient = getQueryClient();
  const t = await getI18n();

  try {
    await queryClient.fetchQuery(
      trpc.poker.members.getLive.queryOptions({}),
    );
  } catch {
    // SSR prefetch failed, client will fetch via Suspense
  }

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="pt-6">
          <h1 className="text-2xl font-medium">
            {t("poker.super_agentes.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("poker.super_agentes.description")}
          </p>
        </div>

        <ErrorBoundary>
          <SuperAgentesPage />
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
