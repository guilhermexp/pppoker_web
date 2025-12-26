import { ClientOnly } from "@/components/client-only";
import { ErrorFallback } from "@/components/error-fallback";
import { LeagueImportUploader } from "@/components/poker/league-import-uploader";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Import League Data | Poker | Midday",
};

function LeagueImportSkeleton() {
  return (
    <div className="h-[calc(100vh-250px)] flex items-center justify-center">
      <div className="w-full max-w-[380px] flex flex-col items-center gap-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        <div className="h-10 w-24 bg-muted animate-pulse rounded mt-2" />
      </div>
    </div>
  );
}

export default async function PokerLeaguesImportPage() {
  return (
    <ErrorBoundary errorComponent={ErrorFallback}>
      <Suspense fallback={<LeagueImportSkeleton />}>
        <ClientOnly fallback={<LeagueImportSkeleton />}>
          <LeagueImportUploader />
        </ClientOnly>
      </Suspense>
    </ErrorBoundary>
  );
}
