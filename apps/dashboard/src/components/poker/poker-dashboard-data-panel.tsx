"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { ScrollArea } from "@midpoker/ui/scroll-area";
import { Skeleton } from "@midpoker/ui/skeleton";
import { Sheet, SheetContent, SheetHeader } from "@midpoker/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${dd}`;
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatNum(v: number): string {
  if (v === 0) return "0";
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(Math.round(v));
}

function formatCurrency(v: number): string {
  if (v === 0) return "0";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

// ---------------------------------------------------------------------------
// Game type mapping
// ---------------------------------------------------------------------------

type GameTab = {
  label: string;
  sessionType?: string;
  gameVariant?: string;
  badge?: string;
};

const GAME_TABS: GameTab[] = [
  { label: "TUDO" },
  { label: "NLH", gameVariant: "nlh" },
  { label: "PLO4", gameVariant: "plo4" },
  { label: "PLO5", gameVariant: "plo5" },
  { label: "MTT", sessionType: "mtt" },
  { label: "SNG", sessionType: "sit_n_go" },
  { label: "SPIN", sessionType: "spin" },
];

// ---------------------------------------------------------------------------
// Session Row
// ---------------------------------------------------------------------------

type SessionRow = {
  id: string;
  tableName: string | null;
  sessionType: string | null;
  gameVariant: string | null;
  startedAt: string | null;
  totalRake: number | null;
  totalBuyIn: number | null;
  totalCashOut: number | null;
  playerCount: number | null;
  handsPlayed: number | null;
  guaranteedPrize: number | null;
};

const TYPE_COLORS: Record<string, string> = {
  cash_game: "bg-blue-500/15 text-blue-400",
  mtt: "bg-amber-500/15 text-amber-400",
  sit_n_go: "bg-emerald-500/15 text-emerald-400",
  spin: "bg-rose-500/15 text-rose-400",
};

const TYPE_LABELS: Record<string, string> = {
  cash_game: "Cash",
  mtt: "MTT",
  sit_n_go: "SNG",
  spin: "Spin",
};

const VARIANT_LABELS: Record<string, string> = {
  nlh: "NLH",
  plo4: "PLO4",
  plo5: "PLO5",
  plo6: "PLO6",
  ofc: "OFC",
  nlh_6plus: "6+",
  mixed: "Mix",
};

function SessionCard({ session }: { session: SessionRow }) {
  const rake = session.totalRake ?? 0;
  const buyIn = session.totalBuyIn ?? 0;
  const players = session.playerCount ?? 0;
  const hands = session.handsPlayed ?? 0;
  const typeLabel = TYPE_LABELS[session.sessionType ?? ""] ?? session.sessionType ?? "";
  const typeColor = TYPE_COLORS[session.sessionType ?? ""] ?? "bg-muted text-muted-foreground";
  const variantLabel = VARIANT_LABELS[session.gameVariant ?? ""] ?? session.gameVariant ?? "";

  const time = session.startedAt
    ? new Date(session.startedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {typeLabel}
          </Badge>
          {variantLabel && (
            <span className="text-[10px] text-muted-foreground font-medium">
              {variantLabel}
            </span>
          )}
          {time && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {time}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs font-medium truncate">
          {session.tableName || `Partida #${session.id.slice(0, 6)}`}
        </p>
        <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
          {players > 0 && (
            <span className="flex items-center gap-0.5">
              <Users className="h-3 w-3" /> {players}
            </span>
          )}
          {hands > 0 && <span>{hands} mãos</span>}
          {buyIn > 0 && <span>Buy-in: {formatCurrency(buyIn)}</span>}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {rake > 0 && (
          <p className="text-xs font-mono font-medium text-green-600">
            +{formatCurrency(rake)}
          </p>
        )}
        {(session.guaranteedPrize ?? 0) > 0 && (
          <p className="text-[10px] text-muted-foreground">
            GTD {formatCurrency(session.guaranteedPrize!)}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

export function PokerDashboardDataPanel() {
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  // Date range state
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const activeTab = GAME_TABS[selectedTab]!;

  // Build query input
  const statsInput = useMemo(
    () => ({
      dateFrom: toISO(dateFrom),
      dateTo: toISO(addDays(dateTo, 1)), // inclusive end
      sessionType: (activeTab.sessionType as any) ?? undefined,
      gameVariant: (activeTab.gameVariant as any) ?? undefined,
    }),
    [dateFrom, dateTo, activeTab],
  );

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery(
    trpc.poker.sessions.getStats.queryOptions(statsInput, {
      enabled: open,
    }),
  );

  // Fetch recent sessions list
  const { data: sessions, isLoading: sessionsLoading } = useQuery(
    trpc.poker.sessions.get.queryOptions(
      {
        ...statsInput,
        pageSize: 20,
        sort: ["started_at", "desc"],
      },
      {
        enabled: open,
      },
    ),
  );

  const sessionsList = (sessions as any)?.data ?? [];

  // Compute derived stats
  const topStats = useMemo(() => {
    if (!stats) {
      return [
        { label: "Partidas", value: "0" },
        { label: "Ganhos do jogador", value: "0" },
        { label: "Taxa", value: "0" },
        { label: "Buy-in de SpinUp", value: "0" },
        { label: "Premiação de SpinUp", value: "0" },
        { label: "Ganhos de SpinUp", value: "0" },
      ];
    }

    const spinStats = stats.byType?.["spin"] ?? { count: 0, rake: 0, buyIn: 0 };
    const totalCashOut = (stats as any).totalCashOut ?? 0;
    const playerWinnings = totalCashOut > 0
      ? totalCashOut - stats.totalBuyIn
      : 0;

    return [
      { label: "Partidas", value: formatNum(stats.totalSessions) },
      { label: "Ganhos do jogador", value: formatCurrency(playerWinnings) },
      { label: "Taxa", value: formatCurrency(stats.totalRake) },
      { label: "Buy-in de SpinUp", value: formatCurrency(spinStats.buyIn) },
      { label: "Premiação de SpinUp", value: formatCurrency(stats.totalGtd) },
      { label: "Ganhos de SpinUp", value: formatCurrency(spinStats.rake) },
    ];
  }, [stats]);

  // Date navigation
  function goToPrevDay() {
    setDateFrom((d) => addDays(d, -1));
    setDateTo((d) => addDays(d, -1));
  }

  function goToNextDay() {
    const next = addDays(dateTo, 1);
    if (next <= new Date()) {
      setDateFrom((d) => addDays(d, 1));
      setDateTo((d) => addDays(d, 1));
    }
  }

  function setYesterday() {
    const y = addDays(new Date(), -1);
    y.setHours(0, 0, 0, 0);
    setDateFrom(y);
    setDateTo(y);
  }

  function setLast7Days() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    setDateFrom(addDays(t, -7));
    setDateTo(t);
  }

  function setToday() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    setDateFrom(t);
    setDateTo(t);
  }

  // League time (UTC-5)
  const leagueTime = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });

  const isLoading = statsLoading || sessionsLoading;
  const dateLabel =
    toISO(dateFrom) === toISO(dateTo)
      ? formatDate(dateFrom)
      : `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;

  return (
    <>
      {!open && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 z-40 h-11 -translate-y-1/2 rounded-r-none rounded-l-lg px-4 shadow-lg"
        >
          Dados no clube
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 bg-background" title="Dados no clube">
          <SheetHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Dados no clube</h2>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Fechar painel"
                onClick={() => setOpen(false)}
              >
                <Icons.Close className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="space-y-4 px-6 py-4">
              {/* Date range selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goToPrevDay}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium tracking-tight">
                    {dateLabel}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goToNextDay}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={setYesterday}
                  >
                    Ontem
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={setLast7Days}
                  >
                    7 d anter.
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={setToday}
                  >
                    Hoje
                  </Button>
                </div>
              </div>

              {/* Top stats grid */}
              <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-border">
                {topStats.map((item, index) => (
                  <div
                    key={item.label}
                    className={cn(
                      "min-h-[88px] border-border p-3 text-center",
                      index % 3 !== 2 && "border-r",
                      index < 3 && "border-b",
                    )}
                  >
                    {statsLoading ? (
                      <Skeleton className="mx-auto h-7 w-16" />
                    ) : (
                      <p className="font-mono text-[28px] font-semibold leading-none tracking-tight">
                        {item.value}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground leading-tight">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Game type tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {GAME_TABS.map((tab, i) => (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => setSelectedTab(i)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                      selectedTab === i
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sessions list or empty state */}
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : sessionsList.length > 0 ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {stats?.totalSessions ?? 0} partidas encontradas
                  </p>
                  <div className="flex flex-col border-t border-border">
                    {sessionsList.map((s: any) => (
                      <SessionCard
                        key={s.id}
                        session={{
                          id: s.id,
                          tableName: s.tableName,
                          sessionType: s.sessionType,
                          gameVariant: s.gameVariant,
                          startedAt: s.startedAt,
                          totalRake: s.totalRake,
                          totalBuyIn: s.totalBuyIn,
                          totalCashOut: s.totalCashOut,
                          playerCount: s.playerCount,
                          handsPlayed: s.handsPlayed,
                          guaranteedPrize: s.guaranteedPrize,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-16 text-center">
                  <Icons.Invoice className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Nenhum dado</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajuste filtros ou período para visualizar resultados
                  </p>
                </div>
              )}

              {/* League time */}
              <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                <span>Horário da liga: UTC-05:00 {leagueTime}</span>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
