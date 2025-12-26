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
import { Progress } from "@midday/ui/progress";
import { ScrollArea } from "@midday/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@midday/ui/sheet";
import { Skeleton } from "@midday/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midday/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

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

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Informacoes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="PPPoker ID" value={player.ppPokerId} />
            <InfoItem label="Pais" value={player.country} />
            <InfoItem label="Tipo" value={player.type === "agent" ? "Agente" : "Jogador"} />
            <InfoItem
              label="Ultima atividade"
              value={
                player.lastActiveAt
                  ? format(new Date(player.lastActiveAt), "dd/MM/yyyy HH:mm")
                  : "Nunca"
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
  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Atual</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                player.currentBalance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(player.currentBalance ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Fichas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(player.chipBalance ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Credito</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InfoItem
              label="Limite de Credito"
              value={formatCurrency(player.creditLimit ?? 0)}
            />
            <InfoItem
              label="Credito Agente"
              value={formatCurrency(player.agentCreditBalance ?? 0)}
            />
          </div>
          {player.creditLimit > 0 && (
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Utilizacao</span>
                <span className="font-medium">
                  {Math.min(
                    100,
                    Math.round(
                      (Math.abs(player.currentBalance) / player.creditLimit) * 100
                    )
                  )}
                  %
                </span>
              </div>
              <Progress
                value={Math.min(
                  100,
                  (Math.abs(player.currentBalance) / player.creditLimit) * 100
                )}
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rakeback */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Rakeback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold">
              {player.rakebackPercent ?? 0}%
            </span>
            <span className="text-muted-foreground">de retorno</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionsTab({ playerId }: { playerId: string }) {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.poker.transactions.get.queryOptions({
      playerId,
      pageSize: 10,
    })
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
      {transactions.map((tx: any) => (
        <Card key={tx.id}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    tx.amount >= 0
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {tx.amount >= 0 ? (
                    <Icons.ArrowDownward className="h-4 w-4" />
                  ) : (
                    <Icons.ArrowUpward className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{tx.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(tx.occurredAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </div>
              <p
                className={`font-mono font-medium ${
                  tx.amount >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {tx.amount >= 0 ? "+" : ""}
                {formatCurrency(tx.amount)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SessionsTab({ playerId }: { playerId: string }) {
  // Note: This would need an endpoint to get sessions for a specific player
  // For now, we'll show a placeholder
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icons.Time className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">
        Historico de sessoes em desenvolvimento
      </p>
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
      }
    )
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
              onClick={() =>
                setParams({ playerId: null, createPlayer: null })
              }
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
