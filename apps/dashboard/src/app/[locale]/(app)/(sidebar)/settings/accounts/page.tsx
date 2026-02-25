import { ConnectedAccounts } from "@/components/connected-accounts";
import { InfinitePaySettings } from "@/components/infinitepay-settings";
import { prefetch, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bank Connections | Midday",
};

export default async function Page() {
  prefetch(trpc.bankConnections.get.queryOptions());
  prefetch(trpc.bankAccounts.get.queryOptions({ manual: true }));
  prefetch(trpc.team.getInfinitePaySettings.queryOptions());

  return (
    <div className="space-y-12">
      <ConnectedAccounts />
      <InfinitePaySettings />
    </div>
  );
}
