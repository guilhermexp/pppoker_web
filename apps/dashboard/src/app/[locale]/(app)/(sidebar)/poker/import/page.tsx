import { ClientOnly } from "@/components/client-only";
import { ErrorFallback } from "@/components/error-fallback";
import { PokerImportHeader } from "@/components/poker/poker-import-header";
import { ImportUploader } from "@/components/poker/import-uploader";
import { ImportUploaderSkeleton } from "@/components/poker/import-uploader-skeleton";
import { ImportsList } from "@/components/poker/imports-list";
import { ImportsListSkeleton } from "@/components/poker/imports-list-skeleton";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Import Data | Poker Club | Midday",
};

export default async function PokerImportPage() {
  const queryClient = getQueryClient();
  const t = await getI18n();

  // Prefetch recent imports - wrapped in try-catch to handle SSR auth errors gracefully
  try {
    await queryClient.fetchInfiniteQuery(
      trpc.poker.imports.get.infiniteQueryOptions({
        pageSize: 10,
      })
    );
  } catch {
    // SSR prefetch failed, client will fetch via Suspense
  }

  return (
    <HydrateClient>
      <div className="flex flex-col gap-6">
        <div className="pt-6">
          <h1 className="text-2xl font-medium">{t("poker.import.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("poker.import.description")}
          </p>
        </div>

        <PokerImportHeader />

        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<ImportUploaderSkeleton />}>
            <ClientOnly fallback={<ImportUploaderSkeleton />}>
              <ImportUploader />
            </ClientOnly>
          </Suspense>
        </ErrorBoundary>

        <div className="mt-8">
          <h2 className="text-lg font-medium mb-4">{t("poker.import.recentImports")}</h2>
          <ErrorBoundary errorComponent={ErrorFallback}>
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
