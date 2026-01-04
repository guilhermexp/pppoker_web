"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useI18n } from "@/locales/client";
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
import { Progress } from "@midday/ui/progress";
import { ScrollArea } from "@midday/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@midday/ui/sheet";
import { Skeleton } from "@midday/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midday/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";

function AgentInfoSkeleton() {
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

function OverviewTab({ agent, metrics }: { agent: any; metrics: any }) {
  const t = useI18n();

  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl bg-primary/10 text-primary">
            {agent.nickname?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold">{agent.nickname}</h3>
          {agent.memoName && (
            <p className="text-sm text-muted-foreground">{agent.memoName}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className={statusColors[agent.status] ?? ""}
            >
              {agent.status}
            </Badge>
            <Badge variant="secondary" className="font-mono">
              {agent.rakebackPercent ?? 0}% Rakeback
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs">Jogadores</CardDescription>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <p className="text-2xl font-bold">{metrics?.playerCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardDescription className="text-xs">Rake Total</CardDescription>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <p className="text-2xl font-bold text-green-600">
              R$ {formatCurrency(metrics?.totalRake ?? 0)}
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
              R$ {formatCurrency(metrics?.rakePpst ?? 0)}
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
              R$ {formatCurrency(metrics?.rakePpsr ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Informacoes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="PPPoker ID" value={agent.ppPokerId} />
            <InfoItem label="Pais" value={agent.country} />
            <InfoItem
              label="Rakeback %"
              value={`${agent.rakebackPercent ?? 0}%`}
            />
            <InfoItem
              label="Ultima atividade"
              value={
                agent.lastActiveAt
                  ? format(new Date(agent.lastActiveAt), "dd/MM/yyyy HH:mm")
                  : "Nunca"
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Super Agent Info */}
      {agent.superAgent && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Super Agente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {agent.superAgent.nickname?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {agent.superAgent.nickname}
                </p>
                {agent.superAgent.memoName && (
                  <p className="text-xs text-muted-foreground">
                    {agent.superAgent.memoName}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Contato</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <InfoItem label="Email" value={agent.email} icon={Icons.Email} />
            <InfoItem label="Telefone" value={agent.phone} />
            {agent.whatsappNumber && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://wa.me/${agent.whatsappNumber.replace(/\D/g, "")}`}
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
      {agent.note && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {agent.note}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlayersTab({ agentId }: { agentId: string }) {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.poker.players.get.queryOptions({
      agentId,
      pageSize: 50,
    }),
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const players = data?.data ?? [];

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icons.Customers className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhum jogador vinculado</p>
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
            <p className="text-xl font-bold">{players.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-3">
            <p className="text-xs text-muted-foreground mb-1">Ativos</p>
            <p className="text-xl font-bold text-green-600">
              {players.filter((p: any) => p.status === "active").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-3">
            <p className="text-xs text-muted-foreground mb-1">VIPs</p>
            <p className="text-xl font-bold text-amber-600">
              {players.filter((p: any) => p.isVip).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Players List */}
      <div className="space-y-2">
        {players.map((player: any) => (
          <Card key={player.id}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {player.nickname?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{player.nickname}</p>
                      {player.isVip && (
                        <Icons.Star className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {player.ppPokerId}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={statusColors[player.status] ?? ""}
                >
                  {player.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettlementsHistory({
  agentId,
  currentRakebackPercent,
}: { agentId: string; currentRakebackPercent: number }) {
  const trpc = useTRPC();

  // Fetch settlements for this agent's players
  const { data, isLoading } = useQuery(
    trpc.poker.settlements.get.queryOptions({
      agentId,
      pageSize: 10,
    }),
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const settlements = data?.data ?? [];

  if (settlements.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Nenhum acerto encontrado
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {settlements.map((settlement: any) => {
        const percentUsed = settlement.rakebackPercentUsed;
        const isDifferent =
          percentUsed !== null && percentUsed !== currentRakebackPercent;

        return (
          <div
            key={settlement.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/10"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {settlement.player?.nickname ??
                    settlement.agent?.nickname ??
                    "N/A"}
                </span>
                {isDifferent && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-orange-500 border-orange-500/30 px-1.5 py-0"
                  >
                    % diferente
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(settlement.periodStart), "dd/MM")} -{" "}
                {format(new Date(settlement.periodEnd), "dd/MM/yyyy")}
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-sm font-mono font-medium ${settlement.netAmount >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(settlement.netAmount)}
              </p>
              {percentUsed !== null && (
                <p
                  className={`text-xs font-mono ${isDifferent ? "text-orange-500" : "text-muted-foreground"}`}
                >
                  {percentUsed.toFixed(2)}%
                  {isDifferent && (
                    <span className="text-muted-foreground">
                      {" "}
                      (atual: {currentRakebackPercent}%)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FinancialTab({ agent, metrics }: { agent: any; metrics: any }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [rakebackValue, setRakebackValue] = useState<string>(
    String(agent.rakebackPercent ?? 0),
  );
  const [isEditingRakeback, setIsEditingRakeback] = useState(false);

  const updateRakebackMutation = useMutation(
    trpc.poker.players.updateRakeback.mutationOptions({
      onSuccess: () => {
        // Invalidate both player and agent queries so both update
        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.getById.queryKey({ id: agent.id }),
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
        id: agent.id,
        rakebackPercent: value,
      });
    }
  };

  const handleRakebackCancel = () => {
    setRakebackValue(String(agent.rakebackPercent ?? 0));
    setIsEditingRakeback(false);
  };

  const rakeTotal = metrics?.totalRake ?? 0;
  const rakebackPercent = agent.rakebackPercent ?? 0;
  const estimatedCommission = rakeTotal * (rakebackPercent / 100);

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro - All in one card like player sheet */}
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
                className={`text-xl font-bold ${agent.currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(agent.currentBalance ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo Fichas</p>
              <p className="text-xl font-bold">
                {formatCurrency(agent.chipBalance ?? 0)}
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
                  {formatCurrency(agent.creditLimit ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Credito Agente</p>
                <p className="text-sm font-medium">
                  {formatCurrency(agent.agentCreditBalance ?? 0)}
                </p>
              </div>
            </div>
            {agent.creditLimit > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Utilizacao</span>
                  <span className="font-medium">
                    {Math.min(
                      100,
                      Math.round(
                        (Math.abs(agent.currentBalance) / agent.creditLimit) *
                          100,
                      ),
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (Math.abs(agent.currentBalance) / agent.creditLimit) * 100,
                  )}
                  className="h-2"
                />
              </div>
            )}
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

          {/* Historico de Rake */}
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Historico de Rake
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  Jogadores Gerenciados
                </p>
                <p className="text-lg font-semibold">
                  {metrics?.playerCount ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Total Rake Gerado
                </p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatCurrency(rakeTotal)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jogadores Gerenciados */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Jogadores Gerenciados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Total de Jogadores
              </p>
              <p className="text-lg font-semibold">
                {metrics?.playerCount ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Rake dos Jogadores
              </p>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(rakeTotal)}
              </p>
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Comissao do Agente
                </p>
                <p className="text-xs text-muted-foreground">
                  ({rakebackPercent}% do rake)
                </p>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(estimatedCommission)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historico de Acertos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Historico de Acertos
            <Badge variant="outline" className="text-[10px] font-normal">
              Ultimos 10
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Acertos dos jogadores deste agente. Destaque para % diferente do
            atual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettlementsHistory
            agentId={agent.id}
            currentRakebackPercent={rakebackPercent}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function PokerAgentDetailSheet() {
  const t = useI18n();
  const trpc = useTRPC();
  const { setParams, viewAgentId, dateFrom, dateTo } = usePokerPlayerParams();

  const isOpen = Boolean(viewAgentId);

  // Fetch agent details
  const { data: agent, isLoading: isLoadingAgent } = useQuery(
    trpc.poker.players.getById.queryOptions(
      { id: viewAgentId! },
      {
        enabled: isOpen,
        staleTime: 0,
      },
    ),
  );

  // Fetch agent stats/metrics
  const { data: allStats } = useQuery(
    trpc.poker.players.getAgentStats.queryOptions(
      {
        dateFrom: dateFrom ?? undefined,
        dateTo: dateTo ?? undefined,
      },
      {
        enabled: isOpen,
        staleTime: 0,
      },
    ),
  );

  // Find metrics for this specific agent
  const metrics = allStats?.agentMetrics?.find(
    (m: any) => m.id === viewAgentId,
  );

  return (
    <Sheet open={isOpen} onOpenChange={() => setParams({ viewAgentId: null })}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Detalhes do Agente</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setParams({ viewAgentId: null })}
            >
              <Icons.Close className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {isLoadingAgent ? (
            <div className="p-6">
              <AgentInfoSkeleton />
            </div>
          ) : agent ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="players"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Jogadores
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
                  <OverviewTab agent={agent} metrics={metrics} />
                </TabsContent>
                <TabsContent value="players" className="mt-0">
                  <PlayersTab agentId={viewAgentId!} />
                </TabsContent>
                <TabsContent value="financial" className="mt-0">
                  <FinancialTab agent={agent} metrics={metrics} />
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icons.Error className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Agente nao encontrado</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
