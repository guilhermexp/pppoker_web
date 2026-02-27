"use client";

import {
  formatCurrency,
  formatPercentPrecise as formatPercent,
} from "@/utils/format";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { useCallback, useMemo, useState } from "react";
import { RakebackEditDialog } from "./rakeback-edit-dialog";

type Rakeback = {
  agentPpPokerId: string;
  agentNickname: string;
  superAgentPpPokerId: string | null;
  country: string | null;
  memoName: string | null;
  averageRakebackPercent: number;
  totalRt: number;
};

type AgentFromApp = {
  id: string;
  ppPokerId: string;
  nickname: string;
  memoName: string | null;
  type: string;
  rakebackPercent: number;
  spreadsheetPercent: number | null;
  rakeGenerated: number;
  playerCount: number;
};

type Summary = {
  ppPokerId: string;
  nickname: string;
  agentPpPokerId: string | null;
  agentNickname: string | null;
  superAgentPpPokerId: string | null;
  rakeTotal: number;
  playerWinningsTotal: number;
};

type RakebackOverride = {
  agentId: string;
  rakebackPercent: number;
};

type RakebackTabProps = {
  rakebacks: Rakeback[];
  agentsFromApp: AgentFromApp[];
  summaries?: Summary[];
  rakebackOverrides?: RakebackOverride[];
  onOverridesChange?: (overrides: RakebackOverride[]) => void;
};

export function RakebackTab({
  rakebacks,
  agentsFromApp,
  summaries = [],
  rakebackOverrides = [],
  onOverridesChange,
}: RakebackTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showByAgent, setShowByAgent] = useState(false);
  const [searchQueryApp, setSearchQueryApp] = useState("");
  const [isSpreadsheetCollapsed, setIsSpreadsheetCollapsed] = useState(true); // Start collapsed

  // Dialog state for editing rakeback
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentFromApp | null>(null);

  // Create a map of rake by agent - prioritize rakeGenerated from API (comes from spreadsheet)
  const rakeByAgent = useMemo(() => {
    const agentRakeMap = new Map<
      string,
      { rake: number; playerCount: number; nickname: string }
    >();

    // First populate from agentsFromApp which has rakeGenerated from the spreadsheet
    for (const agent of agentsFromApp) {
      agentRakeMap.set(agent.ppPokerId, {
        rake: agent.rakeGenerated,
        playerCount: agent.playerCount,
        nickname: agent.nickname,
      });
    }

    // Fallback: also check summaries for any agents not in agentsFromApp
    for (const summary of summaries) {
      if (!summary.agentPpPokerId) continue;
      if (agentRakeMap.has(summary.agentPpPokerId)) continue; // Already have data from agentsFromApp

      const existing = agentRakeMap.get(summary.agentPpPokerId);
      if (existing) {
        existing.rake += summary.rakeTotal;
        existing.playerCount += 1;
      } else {
        agentRakeMap.set(summary.agentPpPokerId, {
          rake: summary.rakeTotal,
          playerCount: 1,
          nickname: summary.agentNickname || "Unknown",
        });
      }
    }

    return agentRakeMap;
  }, [agentsFromApp, summaries]);

  // Get rake for agent
  const getAgentRake = useCallback(
    (ppPokerId: string): number => {
      return rakeByAgent.get(ppPokerId)?.rake ?? 0;
    },
    [rakeByAgent],
  );

  // Calculate RT amount based on rake and percentage
  const calculateRtAmount = useCallback(
    (ppPokerId: string, rakebackPercent: number): number => {
      const rake = getAgentRake(ppPokerId);
      return (rake * rakebackPercent) / 100;
    },
    [getAgentRake],
  );

  // Get effective percent (with override if exists)
  const getEffectivePercent = useCallback(
    (agent: AgentFromApp): number => {
      const override = rakebackOverrides.find((o) => o.agentId === agent.id);
      return override?.rakebackPercent ?? agent.rakebackPercent;
    },
    [rakebackOverrides],
  );

  // Check if agent has an override
  const hasOverride = useCallback(
    (agent: AgentFromApp): boolean => {
      return rakebackOverrides.some((o) => o.agentId === agent.id);
    },
    [rakebackOverrides],
  );

  // Handle edit button click
  const handleEditClick = (agent: AgentFromApp) => {
    setSelectedAgent(agent);
    setEditDialogOpen(true);
  };

  // Handle temporary override confirmation
  const handleConfirmTemporary = (agentId: string, percent: number) => {
    if (!onOverridesChange) return;

    // Remove existing override for this agent and add new one
    const newOverrides = rakebackOverrides.filter((o) => o.agentId !== agentId);
    newOverrides.push({ agentId, rakebackPercent: percent });
    onOverridesChange(newOverrides);
  };

  const filteredData = rakebacks.filter((row) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.agentNickname.toLowerCase().includes(query) ||
      row.agentPpPokerId.includes(query) ||
      row.memoName?.toLowerCase().includes(query) ||
      row.superAgentPpPokerId?.includes(query)
    );
  });

  // Calculate totals
  const totalRegistros = rakebacks.length;
  const uniqueAgents = new Set(
    rakebacks.map((r) => r.agentPpPokerId).filter(Boolean),
  );
  const uniqueSuperAgents = new Set(
    rakebacks
      .map((r) => r.superAgentPpPokerId)
      .filter(
        (id) =>
          id && id.toLowerCase() !== "(none)" && id.toLowerCase() !== "none",
      ),
  );
  const totalRt = rakebacks.reduce((sum, r) => sum + (r.totalRt || 0), 0);
  const avgRakeback =
    rakebacks.length > 0
      ? rakebacks.reduce((sum, r) => sum + (r.averageRakebackPercent || 0), 0) /
        rakebacks.length
      : 0;

  // Group by agent for expanded view
  const agentsList = useMemo(() => {
    const byAgent = rakebacks.reduce(
      (acc, r) => {
        const id = r.agentPpPokerId;
        if (!acc[id]) {
          acc[id] = {
            id,
            nickname: r.agentNickname,
            totalRt: 0,
            avgPercent: 0,
            count: 0,
          };
        }
        acc[id].totalRt += r.totalRt || 0;
        acc[id].avgPercent += r.averageRakebackPercent || 0;
        acc[id].count += 1;
        return acc;
      },
      {} as Record<
        string,
        {
          id: string;
          nickname: string;
          totalRt: number;
          avgPercent: number;
          count: number;
        }
      >,
    );

    return Object.values(byAgent)
      .map((a) => ({ ...a, avgPercent: a.avgPercent / a.count }))
      .sort((a, b) => b.totalRt - a.totalRt);
  }, [rakebacks]);

  // Filter agents from app
  const filteredAgentsApp = agentsFromApp.filter((agent) => {
    if (!searchQueryApp) return true;
    const query = searchQueryApp.toLowerCase();
    return (
      agent.nickname.toLowerCase().includes(query) ||
      agent.ppPokerId.includes(query) ||
      agent.memoName?.toLowerCase().includes(query)
    );
  });

  if (rakebacks.length === 0 && agentsFromApp.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Icons.Inbox className="h-12 w-12 mb-4 opacity-20" />
        <p>Nenhum dado de retorno de taxa encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* SEÇÃO 1: Dados da Planilha */}
      <section className="border border-[#1d1d1d]/60 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setIsSpreadsheetCollapsed(!isSpreadsheetCollapsed)}
          className="w-full flex items-center justify-between p-3 bg-[#0c0c0c]/50 hover:bg-[#1d1d1d]/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icons.Description className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Retorno de Taxa - Planilha Importada
            </span>
            <span className="text-xs text-muted-foreground">
              ({rakebacks.length} registros)
            </span>
          </div>
          <Icons.ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isSpreadsheetCollapsed && "-rotate-90",
            )}
          />
        </button>

        {!isSpreadsheetCollapsed &&
          (rakebacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/10">
              <Icons.Inbox className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">
                Nenhum dado de retorno de taxa na planilha
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-3">
              {/* Row 1: Counters */}
              <div className="flex items-center gap-4 text-xs py-2">
                <span className="text-muted-foreground">
                  Registros{" "}
                  <span className="text-foreground font-medium">
                    {totalRegistros}
                  </span>
                </span>
                <span className="text-border/60">·</span>
                <button
                  type="button"
                  onClick={() => setShowByAgent(!showByAgent)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Agentes{" "}
                  <span className="text-foreground font-medium">
                    {uniqueAgents.size}
                  </span>
                  <Icons.ChevronDown
                    className={cn(
                      "w-3 h-3 inline ml-1 transition-transform",
                      showByAgent && "rotate-180",
                    )}
                  />
                </button>
                <span className="text-border/60">·</span>
                <span className="text-muted-foreground">
                  Superagentes{" "}
                  <span className="text-foreground font-medium">
                    {uniqueSuperAgents.size}
                  </span>
                </span>
              </div>

              {/* Expanded agents list */}
              {showByAgent && agentsList.length > 0 && (
                <div className="border-t border-[#1d1d1d]/20 py-2">
                  <div className="flex items-center gap-4 flex-wrap text-xs">
                    <span className="text-muted-foreground text-[10px] font-medium">
                      Top agentes:
                    </span>
                    {agentsList.slice(0, 6).map((agent) => (
                      <span key={agent.id} className="text-muted-foreground">
                        {agent.nickname}{" "}
                        <span
                          className={cn(
                            "font-mono",
                            agent.totalRt >= 0
                              ? "text-[#00C969]"
                              : "text-[#FF3638]",
                          )}
                        >
                          {formatCurrency(agent.totalRt)}
                        </span>
                        <span className="text-[9px] text-muted-foreground ml-1">
                          ({formatPercent(agent.avgPercent)})
                        </span>
                      </span>
                    ))}
                    {agentsList.length > 6 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{agentsList.length - 6} mais
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Row 2: Totals */}
              <div className="border-t border-[#1d1d1d]/20 flex items-center gap-4 text-xs py-2">
                <span className="text-muted-foreground">
                  Total RT{" "}
                  <span
                    className={cn(
                      "font-mono font-medium",
                      totalRt >= 0 ? "text-[#00C969]" : "text-[#FF3638]",
                    )}
                  >
                    {formatCurrency(totalRt)}
                  </span>
                </span>
                <span className="text-border/60">·</span>
                <span className="text-muted-foreground">
                  Média RT{" "}
                  <span className="font-mono font-medium text-foreground">
                    {formatPercent(avgRakeback)}
                  </span>
                </span>
              </div>

              {/* Search */}
              <div className="border-t border-[#1d1d1d]/20 flex items-center justify-between py-2">
                <span className="text-xs text-muted-foreground">
                  {filteredData.length} registros
                </span>
                <div className="relative w-48">
                  <Icons.Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar agente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 h-7 text-xs"
                  />
                </div>
              </div>

              {/* Data table */}
              <div className="border-t border-[#1d1d1d]/20 pt-2">
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-xs min-w-[700px]">
                    <thead className="sticky top-0 bg-background">
                      <tr className="text-muted-foreground border-b border-[#1d1d1d]/20">
                        <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                          ID Superagente
                        </th>
                        <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                          ID Agente
                        </th>
                        <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                          País
                        </th>
                        <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                          Apelido
                        </th>
                        <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                          Memorando
                        </th>
                        <th className="py-1.5 px-2 font-medium text-right whitespace-nowrap">
                          Retorno %
                        </th>
                        <th className="py-1.5 px-2 font-medium text-right whitespace-nowrap">
                          Total RT
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1d1d1d]/40">
                      {filteredData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-8 text-center text-muted-foreground"
                          >
                            Nenhum dado encontrado
                          </td>
                        </tr>
                      ) : (
                        filteredData.map((row, index) => (
                          <tr
                            key={`${row.agentPpPokerId}-${index}`}
                            className="hover:bg-muted/30"
                          >
                            <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                              {row.superAgentPpPokerId || "-"}
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                              {row.agentPpPokerId}
                            </td>
                            <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                              {row.country || "-"}
                            </td>
                            <td className="py-1.5 px-2 whitespace-nowrap">
                              {row.agentNickname}
                            </td>
                            <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                              {row.memoName || "-"}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                              {formatPercent(row.averageRakebackPercent)}
                            </td>
                            <td
                              className={cn(
                                "py-1.5 px-2 text-right font-mono whitespace-nowrap",
                                row.totalRt >= 0
                                  ? "text-[#00C969]"
                                  : "text-[#FF3638]",
                              )}
                            >
                              {formatCurrency(row.totalRt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {filteredData.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-[#1d1d1d] font-medium bg-[#1d1d1d]/20">
                          <td colSpan={5} className="py-1.5 px-2">
                            TOTAL
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono">
                            {formatPercent(
                              filteredData.reduce(
                                (sum, r) => sum + r.averageRakebackPercent,
                                0,
                              ) / filteredData.length,
                            )}
                          </td>
                          <td
                            className={cn(
                              "py-1.5 px-2 text-right font-mono",
                              filteredData.reduce(
                                (sum, r) => sum + r.totalRt,
                                0,
                              ) >= 0
                                ? "text-[#00C969]"
                                : "text-[#FF3638]",
                            )}
                          >
                            {formatCurrency(
                              filteredData.reduce(
                                (sum, r) => sum + r.totalRt,
                                0,
                              ),
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          ))}
      </section>

      {/* SEÇÃO 2: Cadastro do App */}
      <section>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Icons.Accounts className="w-4 h-4 text-muted-foreground" />
          Agentes - Cadastro do App
          <span className="text-xs text-muted-foreground font-normal ml-2">
            (% configurado no sistema)
          </span>
        </h3>

        {/* Info note */}
        <div className="flex items-start gap-2 p-2 mb-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
          <Icons.Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Rake Gerado:</strong> soma do rake dos jogadores do agente ·{" "}
            <strong>Valor RT:</strong> calculado com o % cadastrado (editável)
          </span>
        </div>

        {agentsFromApp.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-[#1d1d1d]/30 rounded-lg bg-muted/10">
            <Icons.Accounts className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">Nenhum agente encontrado no cadastro</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Counter and stats */}
            <div className="flex items-center gap-4 text-xs py-2">
              <span className="text-muted-foreground">
                Agentes{" "}
                <span className="text-foreground font-medium">
                  {agentsFromApp.length}
                </span>
              </span>
              <span className="text-border/60">·</span>
              <span className="text-muted-foreground">
                Rake Total{" "}
                <span className="text-[#00C969] font-medium font-mono">
                  {formatCurrency(
                    agentsFromApp.reduce(
                      (sum, a) => sum + getAgentRake(a.ppPokerId),
                      0,
                    ),
                  )}
                </span>
              </span>
              <span className="text-border/60">·</span>
              <span className="text-muted-foreground">
                RT Total{" "}
                <span className="text-[#FF3638] font-medium font-mono">
                  {formatCurrency(
                    agentsFromApp.reduce(
                      (sum, a) =>
                        sum +
                        calculateRtAmount(a.ppPokerId, getEffectivePercent(a)),
                      0,
                    ),
                  )}
                </span>
              </span>
            </div>

            {/* Search */}
            <div className="border-t border-[#1d1d1d]/20 flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">
                {filteredAgentsApp.length} agentes
              </span>
              <div className="relative w-48">
                <Icons.Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar agente..."
                  value={searchQueryApp}
                  onChange={(e) => setSearchQueryApp(e.target.value)}
                  className="pl-7 h-7 text-xs"
                />
              </div>
            </div>

            {/* Data table */}
            <div className="border-t border-[#1d1d1d]/20 pt-2">
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-xs min-w-[800px]">
                  <thead className="sticky top-0 bg-background">
                    <tr className="text-muted-foreground border-b border-[#1d1d1d]/20">
                      <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                        ID PPPoker
                      </th>
                      <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                        Apelido
                      </th>
                      <th className="py-1.5 px-2 font-medium text-left whitespace-nowrap">
                        Tipo
                      </th>
                      <th className="py-1.5 px-2 font-medium text-right whitespace-nowrap">
                        Rake Gerado
                      </th>
                      <th className="py-1.5 px-2 font-medium text-right whitespace-nowrap">
                        % RT
                      </th>
                      <th className="py-1.5 px-2 font-medium text-right whitespace-nowrap">
                        Valor RT
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1d1d1d]/40">
                    {filteredAgentsApp.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-muted-foreground"
                        >
                          Nenhum agente encontrado
                        </td>
                      </tr>
                    ) : (
                      filteredAgentsApp.map((agent) => {
                        const rake = getAgentRake(agent.ppPokerId);
                        const effectivePercent = getEffectivePercent(agent);
                        const rtValue = calculateRtAmount(
                          agent.ppPokerId,
                          effectivePercent,
                        );
                        return (
                          <tr key={agent.id} className="hover:bg-muted/30">
                            <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                              {agent.ppPokerId}
                            </td>
                            <td className="py-1.5 px-2 whitespace-nowrap">
                              {agent.nickname}
                              {agent.memoName && (
                                <span className="text-muted-foreground text-[10px] ml-1">
                                  ({agent.memoName})
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 whitespace-nowrap">
                              <span
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded",
                                  agent.type === "super_agent"
                                    ? "bg-purple-500/20 text-purple-500"
                                    : "bg-blue-500/20 text-blue-500",
                                )}
                              >
                                {agent.type === "super_agent"
                                  ? "Super Agente"
                                  : "Agente"}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap text-[#00C969]">
                              {formatCurrency(rake)}
                            </td>
                            <td className="py-1.5 px-2 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <span
                                  className={cn(
                                    "font-mono font-medium",
                                    hasOverride(agent) && "text-orange-500",
                                  )}
                                >
                                  {formatPercent(effectivePercent)}
                                </span>
                                {hasOverride(agent) && (
                                  <span className="text-[9px] text-orange-500/70">
                                    (temp)
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 opacity-50 hover:opacity-100"
                                  onClick={() => handleEditClick(agent)}
                                >
                                  <Icons.Edit className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                            <td
                              className={cn(
                                "py-1.5 px-2 text-right font-mono whitespace-nowrap",
                                rtValue > 0
                                  ? "text-[#FF3638]"
                                  : "text-muted-foreground",
                              )}
                            >
                              {formatCurrency(rtValue)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredAgentsApp.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-[#1d1d1d] font-medium bg-[#1d1d1d]/20">
                        <td colSpan={3} className="py-1.5 px-2">
                          TOTAL
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-[#00C969]">
                          {formatCurrency(
                            filteredAgentsApp.reduce(
                              (sum, a) => sum + getAgentRake(a.ppPokerId),
                              0,
                            ),
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono">-</td>
                        <td className="py-1.5 px-2 text-right font-mono text-[#FF3638]">
                          {formatCurrency(
                            filteredAgentsApp.reduce(
                              (sum, a) =>
                                sum +
                                calculateRtAmount(
                                  a.ppPokerId,
                                  getEffectivePercent(a),
                                ),
                              0,
                            ),
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Edit Dialog */}
      <RakebackEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        agent={selectedAgent}
        currentPercent={selectedAgent ? getEffectivePercent(selectedAgent) : 0}
        onConfirmTemporary={handleConfirmTemporary}
      />
    </div>
  );
}
