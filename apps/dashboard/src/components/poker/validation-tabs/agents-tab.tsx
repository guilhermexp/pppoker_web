"use client";

import type { AgentSummary } from "@/lib/poker/types";

type AgentsTabProps = {
  agents: AgentSummary[];
};

export function AgentsTab({ agents }: AgentsTabProps) {
  const totalPlayers = agents.reduce((sum, a) => sum + a.playerCount, 0);
  const totalRake = agents.reduce((sum, a) => sum + a.totalRake, 0);
  const totalCommission = agents.reduce((sum, a) => sum + a.estimatedCommission, 0);

  if (agents.length === 0) {
    return (
      <p className="text-center text-[#878787] py-8">
        Nenhum agente encontrado
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-[#878787] mb-1">Agentes</p>
          <p className="text-xl font-mono">{agents.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-[#878787] mb-1">Jogadores</p>
          <p className="text-xl font-mono">{totalPlayers}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-[#878787] mb-1">Rake Gerado</p>
          <p className="text-xl font-mono">{formatCurrency(totalRake)}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-[#878787] mb-1">Comissão</p>
          <p className="text-xl font-mono">{formatCurrency(totalCommission)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Agente</th>
              <th className="text-right p-3 font-medium">Jogadores</th>
              <th className="text-right p-3 font-medium">Rake</th>
              <th className="text-right p-3 font-medium">Rakeback %</th>
              <th className="text-right p-3 font-medium">Comissão</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {agents.map((agent) => (
              <tr key={agent.agentPpPokerId} className="hover:bg-muted/30">
                <td className="p-3">
                  <div className="flex flex-col">
                    <span>{agent.agentNickname}</span>
                    <span className="text-xs text-[#878787] font-mono">
                      {agent.agentPpPokerId}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-right font-mono">{agent.playerCount}</td>
                <td className="p-3 text-right font-mono">
                  {formatCurrency(agent.totalRake)}
                </td>
                <td className="p-3 text-right font-mono text-[#878787]">
                  {agent.rakebackPercent.toFixed(1)}%
                </td>
                <td className="p-3 text-right font-mono">
                  {formatCurrency(agent.estimatedCommission)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
