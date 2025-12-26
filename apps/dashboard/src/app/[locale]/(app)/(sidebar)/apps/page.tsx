import { Apps } from "@/components/apps";
import { AppsHeader } from "@/components/apps-header";
import { AppsSkeleton } from "@/components/apps.skeleton";
import { ClientOnly } from "@/components/client-only";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { createClient } from "@midday/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Apps | Midday",
};

export default async function Page() {
  // Validate session before making any tRPC calls
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const queryClient = getQueryClient();

  // Change this to prefetch once this is fixed: https://github.com/trpc/trpc/issues/6632
  try {
    await Promise.all([
      queryClient.fetchQuery(trpc.apps.get.queryOptions()),
      queryClient.fetchQuery(trpc.oauthApplications.list.queryOptions()),
      queryClient.fetchQuery(trpc.oauthApplications.authorized.queryOptions()),
    ]);
  } catch (error) {
    redirect("/login");
  }

  return (
    <HydrateClient>
      <div className="mt-4">
        {/* AppsHeader uses nuqs hooks that require client-side rendering */}
        <ClientOnly>
          <AppsHeader />
        </ClientOnly>

        <Suspense fallback={<AppsSkeleton />}>
          <Apps />
        </Suspense>
      </div>
    </HydrateClient>
  );
}
