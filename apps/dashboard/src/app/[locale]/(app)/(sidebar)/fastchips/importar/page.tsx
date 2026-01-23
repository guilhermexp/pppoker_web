import { ClientOnly } from "@/components/client-only";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  FastchipsImportUploader,
  FastchipsImportsList,
  FastchipsImportsListSkeleton,
} from "@/components/fastchips/import";
import { getI18n } from "@/locales/server";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Importar Extrato | Fastchips | Mid Poker",
};

export default async function FastchipsImportPage() {
  const queryClient = getQueryClient();
  const t = await getI18n();

  // Prefetch recent imports
  try {
    await queryClient.fetchQuery(
      trpc.fastchips.imports.get.queryOptions({
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
          <h1 className="text-2xl font-medium">Importar Extrato Fastchips</h1>
          <p className="text-muted-foreground mt-1">
            Faça upload de uma planilha Fastchips/Chippix para importar
            operações
          </p>
        </div>

        <ErrorBoundary>
          <FastchipsImportUploader />
        </ErrorBoundary>

        <div className="mt-8">
          <h2 className="text-lg font-medium mb-4">Importações Recentes</h2>
          <ErrorBoundary>
            <Suspense fallback={<FastchipsImportsListSkeleton />}>
              <ClientOnly fallback={<FastchipsImportsListSkeleton />}>
                <FastchipsImportsList />
              </ClientOnly>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </HydrateClient>
  );
}
