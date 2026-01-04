"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@midday/ui/avatar";
import { Badge } from "@midday/ui/badge";
import { Button } from "@midday/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@midday/ui/card";
import { Icons } from "@midday/ui/icons";
import { Input } from "@midday/ui/input";
import { ScrollArea } from "@midday/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@midday/ui/sheet";
import { Skeleton } from "@midday/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midday/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";

function SuperAgentInfoSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className={`text-sm font-medium ${className ?? ""}`}>{value ?? "-"}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  inactive: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  suspended: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  blacklisted: "bg-red-500/10 text-red-500 border-red-500/20",
};

function OverviewTab({
  superAgent,
  agentMetrics,
  childAgents,
}: {
  superAgent: any;
  agentMetrics: any[];
  childAgents: any[];
}) {
  // Aggregate metrics from all child agents
  const totalPlayers = agentMetrics.reduce(
    (sum, m) => sum + (m.playerCount ?? 0),
    0,
  );
  const totalRake = agentMetrics.reduce(
    (sum, m) => sum + (m.totalRake ?? 0),
    0,
  );
  const totalRakePpst = agentMetrics.reduce(
    (sum, m) => sum + (m.rakePpst ?? 0),
    0,
  );
  const totalRakePpsr = agentMetrics.reduce(
    (sum, m) => sum + (m.rakePpsr ?? 0),
    0,
  );
  const totalCommission = agentMetrics.reduce(
    (sum, m) => sum + (m.estimatedCommission ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Super Agent Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl bg-amber-500/10 text-amber-600">
            {superAgent.nickname?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold">{superAgent.nickname}</h3>
          {superAgent.memoName && (
            <p className="text-sm text-muted-foreground">
              {superAgent.memoName}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className={statusColors[superAgent.status] ?? ""}
            >
              {superAgent.status}
            </Badge>
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 border-amber-500/30"
            >
              Super Agent
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs">Agentes</CardDescription>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <p className="text-2xl font-bold">{childAgents.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs">Jogadores</CardDescription>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <p className="text-2xl font-bold">{totalPlayers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs">Rake Total</CardDescription>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <p className="text-2xl font-bold text-green-600">
              R$ {formatCurrency(totalRake)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs">
              Comissao Total
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <p className="text-2xl font-bold text-orange-600">
              R$ {formatCurrency(totalCommission)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Rake PPST
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <p className="text-xl font-bold text-blue-600">
              R$ {formatCurrency(totalRakePpst)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Rake PPSR
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <p className="text-xl font-bold text-purple-600">
              R$ {formatCurrency(totalRakePpsr)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Super Agent Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Informacoes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="PPPoker ID" value={superAgent.ppPokerId} />
            <InfoItem label="Pais" value={superAgent.country} />
            <InfoItem
              label="Rakeback %"
              value={`${superAgent.rakebackPercent ?? 0}%`}
            />
            <InfoItem
              label="Ultima atividade"
              value={
                superAgent.lastActiveAt
                  ? format(
                      new Date(superAgent.lastActiveAt),
                      "dd/MM/yyyy HH:mm",
                    )
                  : "Nunca"
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Contato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <InfoItem
              label="Email"
              value={superAgent.email}
              icon={Icons.Email}
            />
            <InfoItem label="Telefone" value={superAgent.phone} />
            {superAgent.whatsappNumber && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://wa.me/${superAgent.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icons.ExternalLink className="h-4 w-4 mr-2" />
                    WhatsApp
                  </a>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {superAgent.note && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {superAgent.note}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AgentsTab({
  childAgents,
  agentMetrics,
  onAgentClick,
}: {
  childAgents: any[];
  agentMetrics: any[];
  onAgentClick: (agentId: string) => void;
}) {
  const metricsMap = new Map(agentMetrics.map((m) => [m.id, m]));

  if (childAgents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icons.Customers className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhum agente vinculado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 px-3">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-xl font-bold">{childAgents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-3">
            <p className="text-xs text-muted-foreground mb-1">Ativos</p>
            <p className="text-xl font-bold text-green-600">
              {childAgents.filter((a) => a.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-3">
            <p className="text-xs text-muted-foreground mb-1">Jogadores</p>
            <p className="text-xl font-bold text-blue-600">
              {agentMetrics.reduce((sum, m) => sum + (m.playerCount ?? 0), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agents List */}
      <div className="space-y-2">
        {childAgents.map((agent) => {
          const metrics = metricsMap.get(agent.id);
          return (
            <Card
              key={agent.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onAgentClick(agent.id)}
            >
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {agent.nickname?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{agent.nickname}</p>
                        <Badge
                          variant="outline"
                          className="text-xs bg-primary/10 text-primary"
                        >
                          Agent
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{agent.ppPokerId}</span>
                        {metrics && (
                          <>
                            <span>•</span>
                            <span>{metrics.playerCount ?? 0} jogadores</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">
                      R$ {formatCurrency(metrics?.totalRake ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {agent.rakebackPercent ?? 0}% rakeback
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FinancialTab({
  superAgent,
  childAgents,
  agentMetrics,
}: {
  superAgent: any;
  childAgents: any[];
  agentMetrics: any[];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [rakebackValue, setRakebackValue] = useState<string>(
    String(superAgent.rakebackPercent ?? 0),
  );
  const [isEditingRakeback, setIsEditingRakeback] = useState(false);

  const updateRakebackMutation = useMutation(
    trpc.poker.players.updateRakeback.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.getById.queryKey({ id: superAgent.id }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.getAgentStats.queryKey({}),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.get.queryKey({}),
        });
        setIsEditingRakeback(false);
      },
    }),
  );

  const handleRakebackSave = () => {
    const value = Number.parseFloat(rakebackValue);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      updateRakebackMutation.mutate({
        id: superAgent.id,
        rakebackPercent: value,
      });
    }
  };

  const handleRakebackCancel = () => {
    setRakebackValue(String(superAgent.rakebackPercent ?? 0));
    setIsEditingRakeback(false);
  };

  // Aggregate metrics from all child agents
  const totalPlayers = agentMetrics.reduce(
    (sum, m) => sum + (m.playerCount ?? 0),
    0,
  );
  const totalRake = agentMetrics.reduce(
    (sum, m) => sum + (m.totalRake ?? 0),
    0,
  );
  const totalRakePpst = agentMetrics.reduce(
    (sum, m) => sum + (m.rakePpst ?? 0),
    0,
  );
  const totalRakePpsr = agentMetrics.reduce(
    (sum, m) => sum + (m.rakePpsr ?? 0),
    0,
  );
  const totalCommission = agentMetrics.reduce(
    (sum, m) => sum + (m.estimatedCommission ?? 0),
    0,
  );

  const rakebackPercent = superAgent.rakebackPercent ?? 0;
  const estimatedOwnCommission = totalRake * (rakebackPercent / 100);

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Resumo Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Saldos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Saldo Atual</p>
              <p
                className={`text-xl font-bold ${superAgent.currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(superAgent.currentBalance ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo Fichas</p>
              <p className="text-xl font-bold">
                {formatCurrency(superAgent.chipBalance ?? 0)}
              </p>
            </div>
          </div>

          {/* Credito */}
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Credito
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Limite de Credito
                </p>
                <p className="text-sm font-medium">
                  {formatCurrency(superAgent.creditLimit ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Credito Agente</p>
                <p className="text-sm font-medium">
                  {formatCurrency(superAgent.agentCreditBalance ?? 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Rakeback */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">
                Rakeback
              </p>
              {!isEditingRakeback && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingRakeback(true)}
                >
                  <Icons.Edit className="h-3 w-3" />
                </Button>
              )}
            </div>
            {isEditingRakeback ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={rakebackValue}
                    onChange={(e) => setRakebackValue(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleRakebackSave}
                    disabled={updateRakebackMutation.isPending}
                  >
                    {updateRakebackMutation.isPending
                      ? "Salvando..."
                      : "Salvar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRakebackCancel}
                    disabled={updateRakebackMutation.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{rakebackPercent}%</span>
                <span className="text-muted-foreground text-sm">
                  de retorno
                </span>
              </div>
            )}
          </div>

          {/* Comissao Estimada */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Comissao Estimada
                </p>
                <p className="text-xs text-muted-foreground">
                  ({rakebackPercent}% do rake total)
                </p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                R$ {formatCurrency(estimatedOwnCommission)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rede de Agentes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Rede de Agentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Agentes na Rede</p>
              <p className="text-lg font-semibold">{childAgents.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Total de Jogadores
              </p>
              <p className="text-lg font-semibold">{totalPlayers}</p>
            </div>
          </div>

          <div className="border-t pt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Rake Total da Rede
              </p>
              <p className="text-lg font-semibold text-green-600">
                R$ {formatCurrency(totalRake)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Comissao Total</p>
              <p className="text-lg font-semibold text-orange-600">
                R$ {formatCurrency(totalCommission)}
              </p>
            </div>
          </div>

          <div className="border-t pt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Rake PPST</p>
              <p className="text-lg font-semibold text-blue-600">
                R$ {formatCurrency(totalRakePpst)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rake PPSR</p>
              <p className="text-lg font-semibold text-purple-600">
                R$ {formatCurrency(totalRakePpsr)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown por Agente */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Breakdown por Agente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {childAgents.map((agent) => {
              const metrics = agentMetrics.find((m) => m.id === agent.id);
              const rake = metrics?.totalRake ?? 0;
              const percentage = totalRake > 0 ? (rake / totalRake) * 100 : 0;

              return (
                <div key={agent.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{agent.nickname}</span>
                    <span className="text-green-600">
                      R$ {formatCurrency(rake)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function PokerSuperAgentDetailSheet() {
  const trpc = useTRPC();
  const { setParams, viewSuperAgentId, dateFrom, dateTo } =
    usePokerPlayerParams();

  const isOpen = Boolean(viewSuperAgentId);

  // Fetch super agent details
  const { data: superAgent, isLoading: isLoadingSuperAgent } = useQuery(
    trpc.poker.players.getById.queryOptions(
      { id: viewSuperAgentId! },
      {
        enabled: isOpen,
        staleTime: 0,
      },
    ),
  );

  // Fetch all agents under this super agent
  const { data: childAgentsData, isLoading: isLoadingAgents } = useQuery(
    trpc.poker.players.get.queryOptions(
      {
        type: "agent",
        pageSize: 100,
      },
      {
        enabled: isOpen,
        staleTime: 0,
      },
    ),
  );

  // Filter child agents that belong to this super agent
  const childAgents =
    childAgentsData?.data?.filter(
      (agent: any) =>
        agent.superAgentId === viewSuperAgentId ||
        agent.superAgent?.id === viewSuperAgentId,
    ) ?? [];

  // Fetch agent stats/metrics
  const { data: allStats } = useQuery(
    trpc.poker.players.getAgentStats.queryOptions(
      {
        dateFrom: dateFrom ?? undefined,
        dateTo: dateTo ?? undefined,
        superAgentId: viewSuperAgentId ?? undefined,
      },
      {
        enabled: isOpen,
        staleTime: 0,
      },
    ),
  );

  // Filter metrics for child agents
  const childAgentIds = new Set(childAgents.map((a: any) => a.id));
  const agentMetrics =
    allStats?.agentMetrics?.filter((m: any) => childAgentIds.has(m.id)) ?? [];

  const handleAgentClick = (agentId: string) => {
    // Close super agent sheet and open agent sheet
    setParams({ viewSuperAgentId: null, viewAgentId: agentId });
  };

  const isLoading = isLoadingSuperAgent || isLoadingAgents;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={() => setParams({ viewSuperAgentId: null })}
    >
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Detalhes do Super Agente</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setParams({ viewSuperAgentId: null })}
            >
              <Icons.Close className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="p-6">
              <SuperAgentInfoSkeleton />
            </div>
          ) : superAgent ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="agents"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Agentes ({childAgents.length})
                </TabsTrigger>
                <TabsTrigger
                  value="financial"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Financeiro
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="overview" className="mt-0">
                  <OverviewTab
                    superAgent={superAgent}
                    agentMetrics={agentMetrics}
                    childAgents={childAgents}
                  />
                </TabsContent>
                <TabsContent value="agents" className="mt-0">
                  <AgentsTab
                    childAgents={childAgents}
                    agentMetrics={agentMetrics}
                    onAgentClick={handleAgentClick}
                  />
                </TabsContent>
                <TabsContent value="financial" className="mt-0">
                  <FinancialTab
                    superAgent={superAgent}
                    childAgents={childAgents}
                    agentMetrics={agentMetrics}
                  />
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icons.Error className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Super Agente nao encontrado
              </p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
