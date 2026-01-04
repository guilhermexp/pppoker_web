"use client";

import { LoadMore } from "@/components/load-more";
import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useSortParams } from "@/hooks/use-sort-params";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTRPC } from "@/trpc/client";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";
import { Table, TableBody, TableCell, TableRow } from "@midday/ui/table";
import {
  useMutation,
  useQuery,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import { type PokerAgent, columns } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { TableHeader } from "./table-header";

export function AgentsDataTable() {
  const { ref, inView } = useInView();
  const { setParams, q, status, hasFilters, dateFrom, dateTo, superAgentId } =
    usePokerPlayerParams();
  const trpc = useTRPC();
  const { params: sortParams } = useSortParams();
  const [expandedSuperAgents, setExpandedSuperAgents] = useState<Set<string>>(
    new Set(),
  );

  const deferredSearch = useDeferredValue(q);

  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 1,
  });

  const sortArray = sortParams.sort as [string, string] | null;

  // Fetch agents
  const agentsQueryOptions = trpc.poker.players.get.infiniteQueryOptions(
    {
      q: deferredSearch,
      type: "agent",
      status,
      sort: sortArray,
    },
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    },
  );

  const {
    data: agentsData,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useSuspenseInfiniteQuery(agentsQueryOptions);

  // Fetch super_agents
  const { data: superAgentsData } = useQuery(
    trpc.poker.players.get.queryOptions({
      q: deferredSearch,
      type: "super_agent" as any,
      status,
      pageSize: 100,
    }),
  );

  // Fetch agent stats to get metrics
  const { data: statsData } = useQuery(
    trpc.poker.players.getAgentStats.queryOptions({
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
      superAgentId: superAgentId ?? undefined,
    }),
  );

  const deleteAgentMutation = useMutation(
    trpc.poker.players.delete.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    }),
  );

  const handleDeleteAgent = (id: string) => {
    deleteAgentMutation.mutate({ id });
  };

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage]);

  const toggleSuperAgent = (id: string) => {
    setExpandedSuperAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Build hierarchical data
  const { hierarchicalData, flatData } = useMemo(() => {
    const agents = agentsData?.pages.flatMap((page) => page.data) ?? [];
    const superAgents = superAgentsData?.data ?? [];
    const metricsMap = new Map(
      (statsData?.agentMetrics ?? []).map((m) => [m.id, m]),
    );

    // Map agents to PokerAgent type with metrics
    const agentMap = new Map<string, PokerAgent>();
    for (const agent of agents) {
      const metrics = metricsMap.get(agent.id);
      agentMap.set(agent.id, {
        ...agent,
        type: agent.type as PokerAgent["type"],
        playerCount: metrics?.playerCount ?? 0,
        totalRake: metrics?.totalRake ?? 0,
        rakePpst: metrics?.rakePpst ?? 0,
        rakePpsr: metrics?.rakePpsr ?? 0,
        estimatedCommission: metrics?.estimatedCommission ?? 0,
      });
    }

    // Group agents by super_agent_id
    const agentsBySuperAgent = new Map<string, PokerAgent[]>();
    const agentsWithoutSuperAgent: PokerAgent[] = [];

    for (const agent of agentMap.values()) {
      const superAgentId = agent.superAgentId ?? agent.superAgent?.id;
      if (superAgentId) {
        const existing = agentsBySuperAgent.get(superAgentId) ?? [];
        existing.push(agent);
        agentsBySuperAgent.set(superAgentId, existing);
      } else {
        agentsWithoutSuperAgent.push(agent);
      }
    }

    // Build hierarchical structure
    const hierarchy: PokerAgent[] = [];

    // Add super agents with their child agents
    for (const sa of superAgents) {
      const childAgents = agentsBySuperAgent.get(sa.id) ?? [];
      const totalRake = childAgents.reduce(
        (sum, a) => sum + (a.totalRake ?? 0),
        0,
      );
      const totalCommission = childAgents.reduce(
        (sum, a) => sum + (a.estimatedCommission ?? 0),
        0,
      );
      const totalPlayers = childAgents.reduce(
        (sum, a) => sum + (a.playerCount ?? 0),
        0,
      );

      hierarchy.push({
        ...sa,
        type: "super_agent" as const,
        agentCount: childAgents.length,
        playerCount: totalPlayers,
        totalRake,
        estimatedCommission: totalCommission,
        childAgents,
        isExpanded: expandedSuperAgents.has(sa.id),
      });
    }

    // Add agents without super agents
    hierarchy.push(...agentsWithoutSuperAgent);

    // Build flat data for the table (super agents + expanded children)
    const flat: PokerAgent[] = [];
    for (const item of hierarchy) {
      flat.push(item);
      if (
        item.type === "super_agent" &&
        expandedSuperAgents.has(item.id) &&
        item.childAgents
      ) {
        flat.push(...item.childAgents);
      }
    }

    return { hierarchicalData: hierarchy, flatData: flat };
  }, [agentsData, superAgentsData, statsData, expandedSuperAgents]);

  const setOpen = (id?: string) => {
    if (id) {
      setParams({ viewAgentId: id });
    } else {
      setParams({ viewAgentId: null });
    }
  };

  const table = useReactTable({
    data: flatData,
    getRowId: (row) => row.id,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: {
      deletePlayer: handleDeleteAgent,
      toggleSuperAgent,
      expandedSuperAgents,
    },
  });

  if (!flatData.length && hasFilters) {
    return <NoResults />;
  }

  if (!flatData.length) {
    return <EmptyState />;
  }

  return (
    <div className="w-full">
      <div
        ref={tableScroll.containerRef}
        className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
      >
        <Table>
          <TableHeader tableScroll={tableScroll} />

          <TableBody className="border-l-0 border-r-0">
            {table.getRowModel().rows.map((row) => {
              const agent = row.original;
              const isSuperAgent = agent.type === "super_agent";
              const agentSuperAgentId =
                agent.superAgentId ?? agent.superAgent?.id;
              const isChildAgent =
                agentSuperAgentId && expandedSuperAgents.has(agentSuperAgentId);
              const isExpanded = expandedSuperAgents.has(agent.id);

              return (
                <TableRow
                  key={row.id}
                  className={`h-[57px] cursor-pointer hover:bg-accent/50 ${isChildAgent ? "pl-8" : ""}`}
                  onClick={() => {
                    if (isSuperAgent) {
                      setParams({ viewSuperAgentId: agent.id });
                    } else {
                      setOpen(agent.id);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell, index) => {
                    const meta = cell.column.columnDef.meta as
                      | { className?: string }
                      | undefined;

                    // Add expand/collapse icon for super agents in the first column
                    if (index === 0 && isSuperAgent) {
                      return (
                        <TableCell key={cell.id} className={meta?.className}>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSuperAgent(agent.id);
                              }}
                            >
                              {isExpanded ? (
                                <Icons.ChevronDown className="h-4 w-4" />
                              ) : (
                                <Icons.ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        </TableCell>
                      );
                    }

                    // Indent child agents
                    if (index === 0 && isChildAgent) {
                      return (
                        <TableCell key={cell.id} className={meta?.className}>
                          <div className="flex items-center gap-2 pl-8">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell key={cell.id} className={meta?.className}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <LoadMore ref={ref} hasNextPage={hasNextPage} />
    </div>
  );
}
