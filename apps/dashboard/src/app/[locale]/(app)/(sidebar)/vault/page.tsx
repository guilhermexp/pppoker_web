import { VaultHeader } from "@/components/vault/vault-header";
import { VaultSkeleton } from "@/components/vault/vault-skeleton";
import { VaultView } from "@/components/vault/vault-view";
import { loadDocumentFilterParams } from "@/hooks/use-document-filter-params";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Vault | Midday",
};

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function Page(props: Props) {
  const queryClient = getQueryClient();
  const searchParams = await props.searchParams;

  const filter = loadDocumentFilterParams(searchParams);

  // Use prefetchInfiniteQuery (non-throwing) to avoid crashing the page
  // if the server-side fetch fails. The client will retry via useSuspenseInfiniteQuery.
  await queryClient.prefetchInfiniteQuery(
    trpc.documents.get.infiniteQueryOptions({
      pageSize: 20,
      ...filter,
    }),
  );

  return (
    <HydrateClient>
      <div>
        <VaultHeader />

        <Suspense fallback={<VaultSkeleton />}>
          <VaultView />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
