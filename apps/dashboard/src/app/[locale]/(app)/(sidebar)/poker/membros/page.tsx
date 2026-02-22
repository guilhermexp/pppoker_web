import { ErrorBoundary } from "@/components/error-boundary";
import { MembrosPageTabs } from "@/components/poker/membros-page-tabs";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Membros | Poker Club | Midday",
};

export default async function PokerMembrosPage() {
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
            {t("poker.members.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("poker.members.description")}
          </p>
        </div>

        <ErrorBoundary>
          <MembrosPageTabs />
        </ErrorBoundary>
      </div>
    </HydrateClient>
  );
}
