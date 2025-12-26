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

  await queryClient.fetchInfiniteQuery(
    trpc.documents.get.infiniteQueryOptions({
      ...filter,
      pageSize: 20,
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
