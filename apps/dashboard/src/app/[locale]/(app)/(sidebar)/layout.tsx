import { ClientOnly } from "@/components/client-only";
import { ExportStatus } from "@/components/export-status";
import { ClientFeedback } from "@/feedback";
import { GlobalTimerProvider } from "@/components/global-timer-provider";
import { Header } from "@/components/header";
import { GlobalSheets } from "@/components/sheets/global-sheets";
import { SidebarContentWrapper } from "@/components/sidebar-content-wrapper";
import { SidebarProvider } from "@/components/sidebar-context";
import { Sidebar } from "@/components/sidebar";
import { TimezoneDetector } from "@/components/timezone-detector";
import { UpgradeContent } from "@/components/upgrade-content";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { shouldShowUpgradeContent } from "@/utils/trial";
import { createClient } from "@midpoker/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use getUser() instead of getSession() to validate the token with Supabase
  // getSession() only reads from cookies and may return expired tokens
  // getUser() validates the token and refreshes it if needed
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/login");
  }

  const queryClient = getQueryClient();

  // NOTE: Right now we want to fetch the user and hydrate the client
  // Next steps would be to prefetch and suspense
  let user;
  try {
    user = await queryClient.fetchQuery(trpc.user.me.queryOptions());
  } catch (error) {
    // If there's an auth error, redirect to login
    redirect("/login");
  }

  if (!user) {
    redirect("/login");
  }

  if (!user.fullName) {
    redirect("/setup");
  }

  if (!user.teamId) {
    redirect("/teams");
  }

  // NOTE: These are used in the global sheets - only prefetch after auth checks
  // Disabled SSR prefetch to avoid auth timing issues - client will fetch via Suspense
  // batchPrefetch([
  //   trpc.team.current.queryOptions(),
  //   trpc.invoice.defaultSettings.queryOptions(),
  //   trpc.search.global.queryOptions({ searchTerm: "" }),
  // ]);

  // Check if trial has expired - render upgrade content directly instead of redirecting
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const showUpgradeContent = shouldShowUpgradeContent(
    user.team?.plan,
    user.team?.createdAt,
    pathname,
  );

  return (
    <HydrateClient>
      <SidebarProvider>
        <div className="relative">
          {/* Sidebar and Header use client-only hooks (useTRPC, useQueryState, useI18n) */}
          <ClientOnly>
            <Sidebar />
          </ClientOnly>

          <SidebarContentWrapper>
            <ClientOnly>
              <Header />
            </ClientOnly>
            {showUpgradeContent ? (
              <ClientOnly>
                <UpgradeContent user={user} />
              </ClientOnly>
            ) : (
              <div className="px-4 md:px-8">{children}</div>
            )}
          </SidebarContentWrapper>

          <ClientOnly>
            <ExportStatus />
            <GlobalSheets />
            <GlobalTimerProvider />
            <TimezoneDetector />
            <ClientFeedback />
          </ClientOnly>
        </div>
      </SidebarProvider>
    </HydrateClient>
  );
}
