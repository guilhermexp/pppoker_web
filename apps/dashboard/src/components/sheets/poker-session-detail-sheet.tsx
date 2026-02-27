"use client";

import { usePokerSessionParams } from "@/hooks/use-poker-session-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { formatDecimal as formatCurrency } from "@/utils/format";
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
import { ScrollArea } from "@midpoker/ui/scroll-area";
import { Separator } from "@midpoker/ui/separator";
import { Sheet, SheetContent, SheetHeader } from "@midpoker/ui/sheet";
import { Skeleton } from "@midpoker/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@midpoker/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================
// Helper Functions
// ============================================

function getSessionTypeLabel(type: string) {
  const types: Record<string, string> = {
    cash_game: "Cash Game",
    mtt: "MTT",
    sit_n_go: "Sit & Go",
    spin: "SPIN",
  };
  return types[type] ?? type;
}

function getSessionTypeColor(type: string) {
  const colors: Record<string, string> = {
    cash_game: "bg-green-500/10 text-green-500 border-green-500/20",
    mtt: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    sit_n_go: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    spin: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };
  return colors[type] ?? "";
}

function getGameVariantLabel(variant: string) {
  const labels: Record<string, string> = {
    nlh: "NLH",
    nlh_6plus: "6+",
    nlh_aof: "AOF",
    plo4: "PLO4",
    plo5: "PLO5",
    plo6: "PLO6",
    ofc: "OFC",
    mixed: "Mixed",
  };
  return labels[variant] ?? variant.toUpperCase();
}

function formatDuration(startedAt: string, endedAt: string | null) {
  if (!endedAt) return "Em andamento";
  return formatDistanceStrict(new Date(startedAt), new Date(endedAt), {
    locale: ptBR,
  });
}

// ============================================
// Skeleton Components
// ============================================

function SessionInfoSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
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

// ============================================
// Small Components
// ============================================

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? "-"}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="text-center p-3 border rounded-lg dark:bg-[#121212] dark:border-[#1d1d1d]">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />}
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${className ?? ""}`}>{value}</p>
    </div>
  );
}

// ============================================
// Tab Components
// ============================================

function OverviewTab({ session }: { session: any }) {
  const rawData = session.rawData as any;
  const organizer = rawData?.organizer ?? null;
  const rakePercent = rawData?.rakePercent ?? null;
  const rakeCap = rawData?.rakeCap ?? null;

  return (
    <div className="space-y-6">
      {/* Session Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-lg ${getSessionTypeColor(session.sessionType)}`}
            >
              <Icons.PieChart className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">
                {session.tableName ||
                  `Sessao #${session.externalId?.slice(0, 8)}`}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={getSessionTypeColor(session.sessionType)}
                >
                  {getSessionTypeLabel(session.sessionType)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getGameVariantLabel(session.gameVariant)}
                </Badge>
                {organizer && (
                  <Badge variant="secondary" className="text-xs">
                    {organizer}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {format(new Date(session.startedAt), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
                {session.endedAt && (
                  <>
                    {" - "}
                    {format(new Date(session.endedAt), "HH:mm")}
                    {" ("}
                    {formatDuration(session.startedAt, session.endedAt)}
                    {")"}
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Jogadores"
          value={session.playerCount}
          icon={Icons.Customers}
        />
        <StatCard
          label="Maos"
          value={session.handsPlayed || "-"}
          icon={Icons.ShowChart}
        />
        <StatCard
          label="Duracao"
          value={formatDuration(session.startedAt, session.endedAt)}
          icon={Icons.Time}
        />
        <StatCard
          label="Rake"
          value={formatCurrency(session.totalRake)}
          className="text-green-600"
          icon={Icons.Vat}
        />
      </div>

      {/* Session Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Detalhes da Sessao
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="ID Externo" value={session.externalId} />
            <InfoItem
              label="Variante"
              value={getGameVariantLabel(session.gameVariant)}
            />
            <InfoItem label="Blinds" value={session.blinds} />
            {rakePercent && <InfoItem label="Rake %" value={rakePercent} />}
            {rakeCap && <InfoItem label="Rake Cap" value={rakeCap} />}
            {session.buyInAmount && (
              <InfoItem
                label="Buy-in Minimo"
                value={formatCurrency(session.buyInAmount)}
              />
            )}
            {session.guaranteedPrize && (
              <InfoItem
                label="GTD"
                value={formatCurrency(session.guaranteedPrize)}
              />
            )}
            {session.createdBy && (
              <InfoItem label="Criado por" value={session.createdBy.nickname} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlayersTab({ session }: { session: any }) {
  const players = session.sessionPlayers ?? [];
  const sortedPlayers = [...players].sort(
    (a: any, b: any) => (a.ranking ?? 999) - (b.ranking ?? 999),
  );

  const biggestWinner = Math.max(
    ...sortedPlayers.map((p: any) => p.winnings ?? 0),
  );
  const biggestLoser = Math.min(
    ...sortedPlayers.map((p: any) => p.winnings ?? 0),
  );

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Jogadores" value={session.playerCount} />
        <StatCard
          label="Maior Ganho"
          value={formatCurrency(biggestWinner > 0 ? biggestWinner : 0)}
          className="text-green-600"
        />
        <StatCard
          label="Maior Perda"
          value={formatCurrency(biggestLoser < 0 ? Math.abs(biggestLoser) : 0)}
          className="text-red-600"
        />
      </div>

      {/* Players Table */}
      <Card>
        <CardContent className="p-0">
          {sortedPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Icons.Face className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum jogador registrado
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Jogador</TableHead>
                    <TableHead className="text-right">Buy-in</TableHead>
                    <TableHead className="text-right">Cash-out</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                    <TableHead className="text-right">Rake</TableHead>
                    <TableHead className="text-right text-xs">PPST</TableHead>
                    <TableHead className="text-right text-xs">PPSR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPlayers.map((sp: any, index: number) => {
                    const netResult =
                      sp.winnings ??
                      sp.cashOut - (sp.buyInChips + sp.buyInTicket);
                    return (
                      <TableRow key={sp.id}>
                        <TableCell className="font-medium">
                          {sp.ranking ?? index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {sp.player?.nickname
                                  ?.substring(0, 2)
                                  .toUpperCase() ?? "??"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {sp.player?.nickname ?? "Unknown"}
                              </p>
                              {sp.player?.memoName && (
                                <p className="text-xs text-muted-foreground">
                                  {sp.player.memoName}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(sp.buyInChips + sp.buyInTicket)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(sp.cashOut)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono text-sm font-medium ${
                            netResult >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {netResult >= 0 ? "+" : ""}
                          {formatCurrency(netResult)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {formatCurrency(sp.rake)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {sp.rakePpst > 0 ? formatCurrency(sp.rakePpst) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {sp.rakePpsr > 0 ? formatCurrency(sp.rakePpsr) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FinancialTab({ session }: { session: any }) {
  const players = session.sessionPlayers ?? [];
  const totalRakePpst = players.reduce(
    (sum: number, p: any) => sum + (p.rakePpst ?? 0),
    0,
  );
  const totalRakePpsr = players.reduce(
    (sum: number, p: any) => sum + (p.rakePpsr ?? 0),
    0,
  );
  const netBalance = session.totalBuyIn - session.totalCashOut;
  const rakePerPlayer =
    session.playerCount > 0 ? session.totalRake / session.playerCount : 0;
  const rakePerHand =
    session.handsPlayed > 0 ? session.totalRake / session.handsPlayed : 0;
  const rakePercent =
    session.totalBuyIn > 0
      ? ((session.totalRake / session.totalBuyIn) * 100).toFixed(2)
      : "0";

  return (
    <div className="space-y-4">
      {/* Buy-in / Cash-out Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Buy-in</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(session.totalBuyIn)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Cash-out</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(session.totalCashOut)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rake Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Breakdown de Rake
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Rake Total</span>
            <span className="text-xl font-bold text-green-600">
              {formatCurrency(session.totalRake)}
            </span>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Rake PPST</p>
              <p className="text-lg font-medium">
                {formatCurrency(totalRakePpst)}
              </p>
              {session.totalRake > 0 && (
                <p className="text-xs text-muted-foreground">
                  {((totalRakePpst / session.totalRake) * 100).toFixed(1)}%
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Rake PPSR</p>
              <p className="text-lg font-medium">
                {formatCurrency(totalRakePpsr)}
              </p>
              {session.totalRake > 0 && (
                <p className="text-xs text-muted-foreground">
                  {((totalRakePpsr / session.totalRake) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Balance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Balanco da Sessao
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Buy-ins</span>
              <span className="font-mono">
                +{formatCurrency(session.totalBuyIn)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cash-outs</span>
              <span className="font-mono">
                -{formatCurrency(session.totalCashOut)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-medium">Saldo Liquido</span>
              <span
                className={`text-lg font-bold ${
                  netBalance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {netBalance >= 0 ? "+" : ""}
                {formatCurrency(netBalance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rake Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Metricas de Rake
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem
              label="Rake por Jogador"
              value={formatCurrency(rakePerPlayer)}
            />
            <InfoItem
              label="Rake por Mao"
              value={session.handsPlayed ? formatCurrency(rakePerHand) : "N/A"}
            />
            <InfoItem label="Rake % sobre Buy-in" value={`${rakePercent}%`} />
            <InfoItem
              label="Maos por Jogador"
              value={
                session.handsPlayed && session.playerCount
                  ? (session.handsPlayed / session.playerCount).toFixed(1)
                  : "N/A"
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function PokerSessionDetailSheet() {
  const t = useI18n();
  const trpc = useTRPC();
  const { setParams, sessionId } = usePokerSessionParams();

  const isOpen = Boolean(sessionId);

  const { data: session, isLoading } = useQuery(
    trpc.poker.sessions.getById.queryOptions(
      { id: sessionId! },
      {
        enabled: isOpen,
        staleTime: 0,
      },
    ),
  );

  return (
    <Sheet open={isOpen} onOpenChange={() => setParams({ sessionId: null })}>
      <SheetContent className="w-full sm:max-w-2xl p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {t("poker.sessions.detail.title")}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setParams({ sessionId: null })}
            >
              <Icons.Close className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {isLoading ? (
            <SessionInfoSkeleton />
          ) : session ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 px-6">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm"
                >
                  {t("poker.sessions.detail.overview")}
                </TabsTrigger>
                <TabsTrigger
                  value="players"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm"
                >
                  {t("poker.sessions.detail.players")} ({session.playerCount})
                </TabsTrigger>
                <TabsTrigger
                  value="financial"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm"
                >
                  {t("poker.sessions.detail.financial")}
                </TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="overview" className="mt-0">
                  <OverviewTab session={session} />
                </TabsContent>
                <TabsContent value="players" className="mt-0">
                  <PlayersTab session={session} />
                </TabsContent>
                <TabsContent value="financial" className="mt-0">
                  <FinancialTab session={session} />
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icons.Error className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Sessao nao encontrada</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
