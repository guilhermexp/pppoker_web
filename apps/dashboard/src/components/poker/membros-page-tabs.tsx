"use client";

import { ErrorBoundary } from "@/components/error-boundary";
import { usePokerMembrosParams } from "@/hooks/use-poker-membros-params";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@midpoker/ui/avatar";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@midpoker/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { Suspense, useDeferredValue, useMemo, useState } from "react";
import { CreditRequestsList } from "./credit-requests-list";
import { MemberDetailView } from "./member-detail-view";
import { PendingMembersList } from "./pending-members-list";
import type { ClubMember } from "@/components/tables/poker-membros/columns";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function CompactMemberRow({
  member,
  onClick,
}: {
  member: ClubMember;
  onClick?: () => void;
}) {
  const initials = member.nickname.slice(0, 2).toUpperCase();
  const subtitle = member.memoName
    ? member.memoName
    : member.agent?.nickname
      ? `Agente: ${member.agent.nickname}`
      : undefined;

  const badgeVariant =
    member.type === "super_agent"
      ? "default"
      : member.type === "agent"
        ? "outline"
        : "secondary";

  return (
    <div
      className="flex items-center gap-3 border-b border-border py-3 last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
      role="button"
      tabIndex={0}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
            member.isOnline ? "bg-green-500" : "bg-gray-400",
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{member.nickname}</p>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          {member.ppPokerId}
        </p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <span
          className={cn(
            "font-mono text-sm",
            member.cashboxBalance > 0 && "text-green-600",
            member.cashboxBalance < 0 && "text-red-600",
            member.cashboxBalance === 0 && "text-muted-foreground",
          )}
        >
          {member.cashboxBalance >= 0 ? "+" : ""}
          {formatMoney(member.cashboxBalance)}
        </span>
        <Badge variant={badgeVariant}>{member.roleLabel}</Badge>
      </div>
    </div>
  );
}

function MembrosCompactTab() {
  const trpc = useTRPC();
  const { q, memberId, setParams } = usePokerMembrosParams();
  const deferredSearch = useDeferredValue(q);
  const [sortLabel, setSortLabel] = useState<"Taxa" | "Entrada">("Taxa");

  const { data: stats } = useQuery(
    trpc.poker.members.getStats.queryOptions(undefined, {
      refetchInterval: 60_000,
    }),
  );

  const queryOptions = trpc.poker.members.list.infiniteQueryOptions(
    { q: deferredSearch || undefined },
    { getNextPageParam: ({ meta }) => meta?.cursor },
  );

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(queryOptions);

  const members = useMemo(
    () => data?.pages.flatMap((page) => page.data as ClubMember[]) ?? [],
    [data],
  );

  if (memberId) {
    return (
      <MemberDetailView
        memberId={memberId}
        onBack={() => setParams({ memberId: null })}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setParams({ q: e.target.value || null })}
          placeholder="Pesquisar membro"
          className="h-11 rounded-lg pl-9"
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="font-medium text-foreground">
            Membro: {stats?.totalMembers ?? members.length}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 rounded border border-border" />
            <span>Certificado: {stats?.pendingCredits ?? 0}</span>
          </span>
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            setSortLabel((prev) => (prev === "Taxa" ? "Entrada" : "Taxa"))
          }
        >
          {sortLabel}
          <Icons.ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </div>

      <div className="flex max-h-[calc(100vh-330px)] flex-col overflow-y-auto border-t border-border">
        {members.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Icons.Customers className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {q ? "Nenhum membro encontrado" : "Nenhum membro listado"}
            </p>
          </div>
        ) : (
          members.map((member) => (
            <CompactMemberRow
              key={member.id}
              member={member}
              onClick={() => setParams({ memberId: member.id })}
            />
          ))
        )}
      </div>

      {hasNextPage && (
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Carregar mais
        </Button>
      )}
    </div>
  );
}

export function MembrosPageTabs() {
  const { tab, setParams } = usePokerMembrosParams();
  const trpc = useTRPC();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const { data: stats } = useQuery(
    trpc.poker.members.getStats.queryOptions(undefined, {
      refetchInterval: 60_000,
    }),
  );

  return (
    <>
      {!isPanelOpen && (
        <Button
          type="button"
          onClick={() => setIsPanelOpen(true)}
          className="fixed right-0 top-1/2 z-40 h-11 -translate-y-1/2 rounded-r-none rounded-l-lg px-4 shadow-lg"
        >
          Membros
        </Button>
      )}

      <div className="min-h-[680px]">
        <section className="hidden xl:flex min-h-[680px] items-center justify-center rounded-xl border border-dashed bg-muted/20">
          <div className="max-w-sm px-6 text-center">
            <p className="text-sm font-medium">Área central vazia (temporário)</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A gestão de membros foi movida para o painel lateral.
            </p>
          </div>
        </section>
      </div>

      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 bg-background" title="Lista de membros">
          <SheetHeader className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Lista de membros</h2>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Fechar painel"
                onClick={() => setIsPanelOpen(false)}
              >
                <Icons.Close className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <Tabs
            value={tab}
            onValueChange={(value) => setParams({ tab: value })}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-border bg-transparent h-auto p-0">
              <TabsTrigger
                value="members"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-3 text-sm"
              >
                Membro
                {stats && stats.totalMembers > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                    {stats.totalMembers}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="pending"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-3 text-sm"
              >
                Novo membro
                {stats && stats.pendingMembers > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                    {stats.pendingMembers}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="credit"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-3 text-sm text-center whitespace-normal leading-tight"
              >
                Solicitação de crédito
                {stats && stats.pendingCredits > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                    {stats.pendingCredits}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-160px)]">
              <div className="px-6 py-4">
                <TabsContent value="members" className="mt-0">
                  <MembrosCompactTab />
                </TabsContent>

                <TabsContent value="pending" className="mt-0">
                  <ErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      }
                    >
                      <PendingMembersList />
                    </Suspense>
                  </ErrorBoundary>
                </TabsContent>

                <TabsContent value="credit" className="mt-0">
                  <ErrorBoundary>
                    <Suspense
                      fallback={
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      }
                    >
                      <CreditRequestsList />
                    </Suspense>
                  </ErrorBoundary>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
