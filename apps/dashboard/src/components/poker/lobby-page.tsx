"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@midpoker/ui/badge";
import { Card, CardContent, CardHeader } from "@midpoker/ui/card";
import { cn } from "@midpoker/ui/cn";
import { Skeleton } from "@midpoker/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useLastUpdate } from "@/hooks/use-last-update";
import { Loader2, Users, Trophy, DollarSign, LayoutGrid, AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Room = {
  room_id: number;
  nome: string;
  game_type: string;
  game_type_num: number;
  is_tournament: boolean;
  is_running: boolean;
  max_players: number;
  current_players: number;
  registered: number;
  buy_in: number;
  fee: number;
  starting_chips: number;
  blind_duration: number;
  status: number; // 0=idle, 1=reg, 2=running, 3=finished
  scheduled_ts: number;
  start_ts: number;
  guaranteed: number;
  prize?: {
    total: number;
    collected: number;
    remaining: number;
    guarantee: number;
  };
  rake: number;
  creator_uid: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GAME_TYPE_COLORS: Record<string, string> = {
  NLH: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  PLO4: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  PLO5: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  MTT: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  SNG: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  SpinUp: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  OFC: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
};

const STATUS_MAP: Record<number, { label: string; variant: string }> = {
  0: { label: "Idle", variant: "bg-gray-500/15 text-gray-600 dark:text-gray-400" },
  1: { label: "Registrando", variant: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  2: { label: "Rodando", variant: "bg-green-500/15 text-green-700 dark:text-green-400" },
  3: { label: "Finalizado", variant: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

function gameTypeBadgeClass(type: string) {
  return GAME_TYPE_COLORS[type] ?? "bg-muted text-muted-foreground";
}

function statusInfo(status: number) {
  return STATUS_MAP[status] ?? STATUS_MAP[0]!;
}

function formatChips(value: number) {
  if (value === 0) return "-";
  return value.toLocaleString("pt-BR");
}

function formatTime(ts: number) {
  if (ts === 0) return null;
  const d = new Date(ts * 1000);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------

function StatsBar({ rooms }: { rooms: Room[] }) {
  const active = rooms.filter((r) => r.is_running).length;
  const totalPlayers = rooms.reduce((s, r) => s + r.current_players, 0);
  const tournaments = rooms.filter((r) => r.is_tournament && r.status !== 3).length;

  const stats = [
    { icon: LayoutGrid, label: "Total mesas", value: rooms.length },
    { icon: DollarSign, label: "Ativas", value: active },
    { icon: Users, label: "Jogadores", value: totalPlayers },
    { icon: Trophy, label: "Torneios", value: tournaments },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border"
        >
          <s.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-mono text-sm font-medium">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Room Card
// ---------------------------------------------------------------------------

function RoomCard({ room }: { room: Room }) {
  const si = statusInfo(room.status);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium leading-tight truncate">
            {room.nome}
          </h3>
          <div className="flex gap-1 flex-shrink-0">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                gameTypeBadgeClass(room.game_type),
              )}
            >
              {room.game_type}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                si.variant,
              )}
            >
              {si.label}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* Players */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>
            {room.current_players}/{room.max_players}
          </span>
          {room.is_tournament && room.registered > 0 && (
            <span className="ml-1">({room.registered} reg)</span>
          )}
        </div>

        {/* Buy-in / Rake */}
        <div className="flex items-center gap-3 text-xs">
          {room.buy_in > 0 && (
            <span className="text-muted-foreground">
              Buy-in: <span className="text-foreground font-medium">{formatChips(room.buy_in)}</span>
              {room.fee > 0 && <span> +{formatChips(room.fee)}</span>}
            </span>
          )}
          {room.rake > 0 && (
            <span className="text-muted-foreground">
              Rake: <span className="text-foreground font-medium">{room.rake}%</span>
            </span>
          )}
        </div>

        {/* Tournament extras */}
        {room.is_tournament && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {room.guaranteed > 0 && (
              <span>
                GTD: <span className="text-foreground font-medium">{formatChips(room.guaranteed)}</span>
              </span>
            )}
            {room.starting_chips > 0 && (
              <span>
                Stack: <span className="text-foreground font-medium">{formatChips(room.starting_chips)}</span>
              </span>
            )}
            {room.prize && room.prize.total > 0 && (
              <span>
                Prize: <span className="text-foreground font-medium">{formatChips(room.prize.total)}</span>
              </span>
            )}
          </div>
        )}

        {/* Time */}
        {(room.scheduled_ts || room.start_ts) && (
          <p className="text-[11px] text-muted-foreground">
            {room.start_ts
              ? `Inicio: ${formatTime(room.start_ts)}`
              : `Agendado: ${formatTime(room.scheduled_ts)}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Loading
// ---------------------------------------------------------------------------

function RoomsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <LayoutGrid className="h-10 w-10 text-muted-foreground mb-4" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Room Grid (filtered)
// ---------------------------------------------------------------------------

function RoomGrid({ rooms }: { rooms: Room[] }) {
  if (rooms.length === 0) {
    return <EmptyState message="Nenhuma mesa encontrada" />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {rooms.map((room) => (
        <RoomCard key={room.room_id} room={room} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function LobbyPage() {
  const trpc = useTRPC();
  const [tab, setTab] = useState("todas");

  const { data, isLoading, isError, dataUpdatedAt } = useQuery(
    trpc.poker.rooms.getLive.queryOptions(
      {},
      { refetchInterval: 30_000 },
    ),
  );
  const lastUpdate = useLastUpdate(dataUpdatedAt);

  const rooms = (data?.rooms ?? []) as Room[];

  const filtered = useMemo(() => {
    switch (tab) {
      case "ativas":
        return rooms.filter((r) => r.is_running);
      case "torneios":
        return rooms.filter((r) => r.is_tournament);
      case "cash":
        return rooms.filter((r) => !r.is_tournament);
      default:
        return rooms;
    }
  }, [rooms, tab]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <RoomsSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {isError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              Não foi possível conectar ao PPPoker
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Verifique se o bridge está online e tente novamente.
          </p>
        </div>
      )}

      <StatsBar rooms={rooms} />
      {lastUpdate && (
        <p className="text-xs text-muted-foreground text-right">
          Atualizado {lastUpdate}
        </p>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="todas">
            Todas ({rooms.length})
          </TabsTrigger>
          <TabsTrigger value="ativas">
            Ativas ({rooms.filter((r) => r.is_running).length})
          </TabsTrigger>
          <TabsTrigger value="torneios">
            Torneios ({rooms.filter((r) => r.is_tournament).length})
          </TabsTrigger>
          <TabsTrigger value="cash">
            Cash Games ({rooms.filter((r) => !r.is_tournament).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <RoomGrid rooms={filtered} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
