"use client";

import { usePokerMembrosParams } from "@/hooks/use-poker-membros-params";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { CreditRequestsList } from "./credit-requests-list";
import { PendingMembersList } from "./pending-members-list";
import { MembersDataTable } from "@/components/tables/poker-membros/data-table";
import { DataTableSkeleton } from "@/components/tables/poker-membros/skeleton";
import { ErrorBoundary } from "@/components/error-boundary";

export function MembrosPageTabs() {
  const { tab, setParams } = usePokerMembrosParams();
  const trpc = useTRPC();

  const { data: stats } = useQuery(
    trpc.poker.members.getStats.queryOptions(),
  );

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setParams({ tab: value })}
      className="w-full"
    >
      <TabsList>
        <TabsTrigger value="members" className="gap-2">
          Todos os Membros
          {stats && stats.totalMembers > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {stats.totalMembers}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="pending" className="gap-2">
          Novos Membros
          {stats && stats.pendingMembers > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
              {stats.pendingMembers}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="credit" className="gap-2">
          Credito
          {stats && stats.pendingCredits > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
              {stats.pendingCredits}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="members" className="mt-4">
        <ErrorBoundary>
          <Suspense fallback={<DataTableSkeleton />}>
            <MembersDataTable />
          </Suspense>
        </ErrorBoundary>
      </TabsContent>

      <TabsContent value="pending" className="mt-4">
        <PendingMembersList />
      </TabsContent>

      <TabsContent value="credit" className="mt-4">
        <CreditRequestsList />
      </TabsContent>
    </Tabs>
  );
}
