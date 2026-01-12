"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@midpoker/ui/avatar";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@midpoker/ui/card";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { Progress } from "@midpoker/ui/progress";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@midpoker/ui/sheet";
import { Skeleton } from "@midpoker/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";

function PlayerInfoSkeleton() {
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
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className="text-sm font-medium">{value ?? "-"}</p>
    </div>
  );
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function GeneralTab({ player }: { player: any }) {
  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    inactive: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    suspended: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    blacklisted: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <div className="space-y-6">
      {/* Player Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl">
            {player.nickname?.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="text-xl font-semibold">{player.nickname}</h3>
          {player.memoName && (
            <p className="text-sm text-muted-foreground">{player.memoName}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className={statusColors[player.status] ?? ""}
            >
              {player.status}
            </Badge>
            {player.isVip && (
              <Badge variant="secondary">
                <Icons.Star className="h-3 w-3 mr-1" />
                VIP
              </Badge>
            )}
            {player.isShark && (
              <Badge variant="destructive">
                <Icons.Error className="h-3 w-3 mr-1" />
                Shark
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Risk Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold">{player.riskScore ?? 50}</span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <Progress value={player.riskScore ?? 50} className="h-2" />
        </CardContent>
      </Card>

      {/* Activity Score */}
      {player.activityMetrics && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Atividade</CardTitle>
              <Badge
                variant="outline"
                className={
                  player.activityMetrics.activityStatus === "active"
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : player.activityMetrics.activityStatus === "at_risk"
                      ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                      : player.activityMetrics.activityStatus === "inactive"
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                }
              >
                {player.activityMetrics.activityStatus === "active"
                  ? "Ativo"
                  : player.activityMetrics.activityStatus === "at_risk"
                    ? "Em Risco"
                    : player.activityMetrics.activityStatus === "inactive"
                      ? "Inativo"
                      : "Novo"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Activity Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  Score de Atividade
                </span>
                <span className="text-sm font-medium">
                  {player.activityMetrics.activityScore}/100
                </span>
              </div>
              <Progress
                value={player.activityMetrics.activityScore}
                className={`h-2 ${
                  player.activityMetrics.activityScore >= 70
                    ? "[&>div]:bg-green-500"
                    : player.activityMetrics.activityScore >= 40
                      ? "[&>div]:bg-yellow-500"
                      : "[&>div]:bg-red-500"
                }`}
              />
            </div>

            {/* Activity Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">
                  Sessões (4 semanas)
                </p>
                <p className="text-xl font-bold">
                  {player.activityMetrics.sessionsLast4Weeks}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Semanas Ativas</p>
                <p className="text-xl font-bold">
                  {player.activityMetrics.weeksActiveLast4}/4
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Última Sessão</p>
                <p className="text-xl font-bold">
                  {player.activityMetrics.daysSinceLastSession !== null
                    ? player.activityMetrics.daysSinceLastSession === 0
                      ? "Hoje"
                      : player.activityMetrics.daysSinceLastSession === 1
                        ? "Ontem"
                        : `${player.activityMetrics.daysSinceLastSession}d`
                    : "—"}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Frequência</p>
                <p className="text-sm font-bold capitalize">
                  {player.activityMetrics.sessionFrequency === "daily"
                    ? "Diária"
                    : player.activityMetrics.sessionFrequency === "weekly"
                      ? "Semanal"
                      : player.activityMetrics.sessionFrequency === "biweekly"
                        ? "Quinzenal"
                        : player.activityMetrics.sessionFrequency === "monthly"
                          ? "Mensal"
                          : player.activityMetrics.sessionFrequency ===
                              "sporadic"
                            ? "Esporádica"
                            : "Desconhecida"}
                </p>
              </div>
            </div>

            {/* Last App Activity */}
            {player.activityMetrics.daysSinceLastAppActivity !== null && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Última vez no App
                  </span>
                  <span className="text-sm font-medium">
                    {player.activityMetrics.daysSinceLastAppActivity === 0
                      ? "Hoje"
                      : player.activityMetrics.daysSinceLastAppActivity === 1
                        ? "Ontem"
                        : `${player.activityMetrics.daysSinceLastAppActivity} dias atrás`}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Informacoes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="PPPoker ID" value={player.ppPokerId} />
            <InfoItem label="Pais" value={player.country} />
            <InfoItem
              label="Tipo"
              value={player.type === "agent" ? "Agente" : "Jogador"}
            />
            <InfoItem
              label="Cadastro"
              value={
                player.createdAt
                  ? format(new Date(player.createdAt), "dd/MM/yyyy")
                  : "-"
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Agent Info */}
      {player.agent && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {player.agent.nickname?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{player.agent.nickname}</p>
                {player.agent.memoName && (
                  <p className="text-xs text-muted-foreground">
                    {player.agent.memoName}
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
            <InfoItem label="Email" value={player.email} icon={Icons.Email} />
            <InfoItem label="Telefone" value={player.phone} />
            {player.whatsappNumber && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://wa.me/${player.whatsappNumber.replace(/\D/g, "")}`}
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
      {player.note && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {player.note}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FinancialTab({ player }: { player: any }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [rakebackValue, setRakebackValue] = useState<string>(
    String(player.rakebackPercent ?? 0),
  );
  const [isEditingRakeback, setIsEditingRakeback] = useState(false);

  const updateRakebackMutation = useMutation(
    trpc.poker.players.updateRakeback.mutationOptions({
      onSuccess: () => {
        // Invalidate both player and agent queries so both update
        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.getById.queryKey({ id: player.id }),
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
        id: player.id,
        rakebackPercent: value,
      });
    }
  };

  const handleRakebackCancel = () => {
    setRakebackValue(String(player.rakebackPercent ?? 0));
    setIsEditingRakeback(false);
  };

  return (
    <div className="space-y-6">
      {/* Agent Info - only show if player has an agent */}
      {player.agent && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Agente Vinculado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {player.agent.nickname?.charAt(0)?.toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {player.agent.memoName || player.agent.nickname}
                </p>
                <p className="text-xs text-muted-foreground">
                  ID PPPoker: {player.agent.ppPokerId || "N/A"}
                </p>
                {player.agent.rakebackPercent > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Rakeback Agente: {player.agent.rakebackPercent}%
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Financial Info in One Card */}
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
                className={`text-xl font-bold ${player.currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {formatCurrency(player.currentBalance ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo Fichas</p>
              <p className="text-xl font-bold">
                {formatCurrency(player.chipBalance ?? 0)}
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
                  {formatCurrency(player.creditLimit ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Credito Agente</p>
                <p className="text-sm font-medium">
                  {formatCurrency(player.agentCreditBalance ?? 0)}
                </p>
              </div>
            </div>
            {player.creditLimit > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Utilizacao</span>
                  <span className="font-medium">
                    {Math.min(
                      100,
                      Math.round(
                        (Math.abs(player.currentBalance) / player.creditLimit) *
                          100,
                      ),
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (Math.abs(player.currentBalance) / player.creditLimit) *
                      100,
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
                <span className="text-2xl font-bold">
                  {player.rakebackPercent ?? 0}%
                </span>
                <span className="text-muted-foreground text-sm">
                  de retorno
                </span>
              </div>
            )}
          </div>

          {/* Historico de Rake */}
          {player.rakeStats && (
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Historico de Rake
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Partidas Jogadas
                  </p>
                  <p className="text-lg font-semibold">
                    {player.rakeStats.sessionsPlayed}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total Rake Gerado
                  </p>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(player.rakeStats.totalRake)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Resultado Total
                  </p>
                  <p
                    className={`text-lg font-semibold ${player.rakeStats.totalWinnings >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(player.rakeStats.totalWinnings)}
                  </p>
                </div>
                {player.rakebackPercent > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Retorno de Taxa
                    </p>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(player.rakeStats.totalRakeback)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ({player.rakebackPercent}% de{" "}
                      {formatCurrency(player.rakeStats.totalRake)})
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Stats - only show if player is an agent */}
      {player.type === "agent" && player.agentStats && (
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
                  {player.agentStats.playerCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Rake dos Jogadores
                </p>
                <p className="text-lg font-semibold text-blue-600">
                  {formatCurrency(player.agentStats.totalRake)}
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
                    ({player.rakebackPercent ?? 0}% do rake)
                  </p>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(player.agentStats.totalRakeback)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TransactionsTab({ playerId }: { playerId: string }) {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.poker.transactions.get.queryOptions({
      playerId,
      pageSize: 50,
      sort: ["occurred_at", "desc"],
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

  const transactions = data?.data ?? [];

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icons.Transactions className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhuma transacao encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        {data?.meta.totalCount ?? 0} transacoes encontradas
      </p>
      {transactions.map((tx: any) => {
        // Determine if this player is sender or recipient
        const isSender = tx.sender?.id === playerId;
        const otherParty = isSender ? tx.recipient : tx.sender;

        // Calculate effective amount for this player
        const chipFlow = isSender
          ? -(tx.chipsSent || 0) + (tx.chipsRedeemed || 0)
          : (tx.chipsSent || 0) - (tx.chipsRedeemed || 0);
        const creditFlow = isSender
          ? -(tx.creditSent || 0) + (tx.creditRedeemed || 0)
          : (tx.creditSent || 0) - (tx.creditRedeemed || 0);

        const totalFlow = chipFlow + creditFlow;
        const isPositive = totalFlow >= 0;

        return (
          <Card key={tx.id}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`p-2 rounded-full shrink-0 ${
                      isPositive
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {isPositive ? (
                      <Icons.ArrowDownward className="h-4 w-4" />
                    ) : (
                      <Icons.ArrowUpward className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {isSender ? "Enviou para" : "Recebeu de"}{" "}
                        <span className="text-muted-foreground">
                          {otherParty?.nickname ||
                            otherParty?.memoName ||
                            "Clube"}
                        </span>
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tx.occurredAt), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {tx.chipsSent > 0 || tx.chipsRedeemed > 0 ? (
                    <p
                      className={`font-mono text-sm font-medium ${
                        chipFlow >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {chipFlow >= 0 ? "+" : ""}
                      {formatCurrency(chipFlow)} fichas
                    </p>
                  ) : null}
                  {tx.creditSent > 0 || tx.creditRedeemed > 0 ? (
                    <p
                      className={`font-mono text-sm font-medium ${
                        creditFlow >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {creditFlow >= 0 ? "+" : ""}
                      {formatCurrency(creditFlow)} credito
                    </p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {data?.meta.hasNextPage && (
        <p className="text-xs text-center text-muted-foreground pt-2">
          Mostrando {transactions.length} de {data.meta.totalCount}
        </p>
      )}
    </div>
  );
}

function SessionsTab({ playerId }: { playerId: string }) {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.poker.sessions.getByPlayer.queryOptions({
      playerId,
      pageSize: 50,
    }),
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const sessions = data?.data ?? [];

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icons.Time className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhuma sessao encontrada</p>
      </div>
    );
  }

  const gameTypeLabels: Record<string, string> = {
    nlh: "NLH",
    plo4: "PLO4",
    plo5: "PLO5",
    plo6: "PLO6",
    "plo4-hilo": "PLO4 Hi/Lo",
    "plo5-hilo": "PLO5 Hi/Lo",
    mtt: "MTT",
    sitng: "SitNGo",
    spin: "SPIN",
    other: "Outro",
  };

  const sessionTypeLabels: Record<string, string> = {
    cash_game: "Cash Game",
    tournament: "Torneio",
    sit_n_go: "Sit & Go",
    spin: "SPIN",
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        {data?.meta.totalCount ?? 0} sessoes encontradas
      </p>
      {sessions.map((session: any) => {
        const playerData = session.playerData;
        const winnings = playerData?.winnings ?? 0;
        const rake = playerData?.rake ?? 0;
        const isPositive = winnings >= 0;

        return (
          <Card key={session.id}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`p-2 rounded-full shrink-0 ${
                      isPositive
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    <Icons.Play className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {session.tableName || "Sessão"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {sessionTypeLabels[session.sessionType] ||
                          session.sessionType}
                      </span>
                      <span>•</span>
                      <span>
                        {gameTypeLabels[session.gameVariant] ||
                          session.gameVariant}
                      </span>
                      {session.blinds && (
                        <>
                          <span>•</span>
                          <span>{session.blinds}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {session.startedAt
                        ? format(
                            new Date(session.startedAt),
                            "dd/MM/yyyy HH:mm",
                          )
                        : "Data não disponível"}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-mono text-sm font-medium ${
                      isPositive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {formatCurrency(winnings)}
                  </p>
                  {rake > 0 && (
                    <p className="font-mono text-xs text-muted-foreground">
                      Taxa: {formatCurrency(rake)}
                    </p>
                  )}
                  {playerData?.ranking && playerData.ranking > 0 && (
                    <p className="text-xs text-muted-foreground">
                      #{playerData.ranking}º lugar
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {data?.meta.hasNextPage && (
        <p className="text-xs text-center text-muted-foreground pt-2">
          Mostrando {sessions.length} de {data.meta.totalCount}
        </p>
      )}
    </div>
  );
}

export function PokerPlayerDetailSheet() {
  const t = useI18n();
  const trpc = useTRPC();
  const { setParams, playerId } = usePokerPlayerParams();

  const isOpen = Boolean(playerId);

  const { data: player, isLoading } = useQuery(
    trpc.poker.players.getById.queryOptions(
      { id: playerId! },
      {
        enabled: isOpen,
        staleTime: 0,
      },
    ),
  );

  return (
    <Sheet open={isOpen} onOpenChange={() => setParams({ playerId: null })}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Detalhes do Jogador</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setParams({ playerId: null, createPlayer: null })}
            >
              <Icons.Close className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="p-6">
              <PlayerInfoSkeleton />
            </div>
          ) : player ? (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
                <TabsTrigger
                  value="general"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Geral
                </TabsTrigger>
                <TabsTrigger
                  value="financial"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Financeiro
                </TabsTrigger>
                <TabsTrigger
                  value="transactions"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Transacoes
                </TabsTrigger>
                <TabsTrigger
                  value="sessions"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  Sessoes
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="general" className="mt-0">
                  <GeneralTab player={player} />
                </TabsContent>
                <TabsContent value="financial" className="mt-0">
                  <FinancialTab player={player} />
                </TabsContent>
                <TabsContent value="transactions" className="mt-0">
                  <TransactionsTab playerId={playerId!} />
                </TabsContent>
                <TabsContent value="sessions" className="mt-0">
                  <SessionsTab playerId={playerId!} />
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icons.Error className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Jogador nao encontrado</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
