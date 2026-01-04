"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Button } from "@midday/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@midday/ui/dropdown-menu";
import { Icons } from "@midday/ui/icons";
import { useQuery } from "@tanstack/react-query";

export function PokerPlayerFilters() {
  const t = useI18n();
  const trpc = useTRPC();
  const {
    type,
    status,
    agentId,
    hasCreditLimit,
    hasRake,
    hasBalance,
    hasAgent,
    setParams,
    hasFilters,
  } = usePokerPlayerParams();

  // Fetch agents for the agent filter dropdown
  const { data: agentsData } = useQuery(
    trpc.poker.players.getAgents.queryOptions({ pageSize: 100 }),
  );

  const agents = agentsData?.data ?? [];
  const selectedAgent = agents.find((a) => a.id === agentId);

  // Count active boolean filters
  const activeBooleanFilters = [
    hasCreditLimit,
    hasRake,
    hasBalance,
    hasAgent,
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Type Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Icons.Customers className="mr-2 h-4 w-4" />
            {type === "player"
              ? t("poker.players.filter.players_only")
              : type === "agent"
                ? t("poker.players.filter.agents_only")
                : t("poker.players.filter.all_types")}
            <Icons.ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Tipo</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={type === null}
            onCheckedChange={() => setParams({ type: null })}
          >
            {t("poker.players.filter.all_types")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={type === "player"}
            onCheckedChange={() => setParams({ type: "player" })}
          >
            {t("poker.players.filter.players_only")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={type === "agent"}
            onCheckedChange={() => setParams({ type: "agent" })}
          >
            {t("poker.players.filter.agents_only")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Icons.Filter className="mr-2 h-4 w-4" />
            {status === "active"
              ? t("poker.players.filter.active")
              : status === "inactive"
                ? t("poker.players.filter.inactive")
                : status === "suspended"
                  ? t("poker.players.filter.suspended")
                  : status === "blacklisted"
                    ? t("poker.players.filter.blacklisted")
                    : t("poker.players.filter.all_statuses")}
            <Icons.ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={status === null}
            onCheckedChange={() => setParams({ status: null })}
          >
            {t("poker.players.filter.all_statuses")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={status === "active"}
            onCheckedChange={() => setParams({ status: "active" })}
          >
            {t("poker.players.filter.active")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={status === "inactive"}
            onCheckedChange={() => setParams({ status: "inactive" })}
          >
            {t("poker.players.filter.inactive")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={status === "suspended"}
            onCheckedChange={() => setParams({ status: "suspended" })}
          >
            {t("poker.players.filter.suspended")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={status === "blacklisted"}
            onCheckedChange={() => setParams({ status: "blacklisted" })}
          >
            {t("poker.players.filter.blacklisted")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Agent Dropdown Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Icons.AccountCircle className="mr-2 h-4 w-4" />
            {selectedAgent ? selectedAgent.nickname : "Agente"}
            <Icons.ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
          <DropdownMenuLabel>Agente</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={agentId === null}
            onCheckedChange={() => setParams({ agentId: null })}
          >
            Todos os agentes
          </DropdownMenuCheckboxItem>
          {agents.map((agent) => (
            <DropdownMenuCheckboxItem
              key={agent.id}
              checked={agentId === agent.id}
              onCheckedChange={() => setParams({ agentId: agent.id })}
            >
              {agent.memoName || agent.nickname}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Unified Filters Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9">
            <Icons.Settings className="mr-2 h-4 w-4" />
            Filtros
            {activeBooleanFilters > 0 && (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                {activeBooleanFilters}
              </span>
            )}
            <Icons.ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Mostrar apenas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={hasCreditLimit}
            onCheckedChange={(checked) =>
              setParams({ hasCreditLimit: checked ? true : null })
            }
          >
            Com Limite de Crédito
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={hasBalance}
            onCheckedChange={(checked) =>
              setParams({ hasBalance: checked ? true : null })
            }
          >
            Com Saldo
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={hasRake}
            onCheckedChange={(checked) =>
              setParams({ hasRake: checked ? true : null })
            }
          >
            Com Taxa
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={hasAgent}
            onCheckedChange={(checked) =>
              setParams({ hasAgent: checked ? true : null })
            }
          >
            Com Agente
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => setParams(null)}
        >
          <Icons.Clear className="mr-2 h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
