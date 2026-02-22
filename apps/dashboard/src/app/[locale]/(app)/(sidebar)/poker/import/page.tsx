import { ClientOnly } from "@/components/client-only";
import { ErrorBoundary } from "@/components/error-boundary";
import { ImportsList } from "@/components/poker/imports-list";
import { ImportsListSkeleton } from "@/components/poker/imports-list-skeleton";
import { SyncStatusBanner } from "@/components/poker/sync-status-banner";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Dados do Clube | Poker | Mid Poker",
};

export default async function PokerImportPage() {
  const queryClient = getQueryClient();
  const t = await getI18n();

  // Prefetch recent imports - wrapped in try-catch to handle SSR auth errors gracefully
  try {
    await queryClient.fetchInfiniteQuery(
      trpc.poker.imports.get.infiniteQueryOptions({
        pageSize: 10,
      }),
    );
  } catch {
    // SSR prefetch failed, client will fetch via Suspense
  }

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="pt-6">
          <h1 className="text-2xl font-medium">Dados do Clube</h1>
          <p className="text-muted-foreground mt-1">
            Dados do clube sincronizam automaticamente via PPPoker API.
            Importação manual disponível apenas para dados de liga.
          </p>
        </div>

        <ErrorBoundary>
          <Suspense fallback={<div className="h-16 animate-pulse bg-muted rounded" />}>
            <ClientOnly fallback={<div className="h-16 animate-pulse bg-muted rounded" />}>
              <SyncStatusBanner />
            </ClientOnly>
          </Suspense>
        </ErrorBoundary>

        <div className="mt-4">
          <h2 className="text-lg font-medium mb-4">
            Importações anteriores (liga)
          </h2>
          <ErrorBoundary>
            <Suspense fallback={<ImportsListSkeleton />}>
              <ClientOnly fallback={<ImportsListSkeleton />}>
                <ImportsList />
              </ClientOnly>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </HydrateClient>
  );
}
