"use client";

import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@midpoker/ui/card";
import { cn } from "@midpoker/ui/cn";
import { Skeleton } from "@midpoker/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@midpoker/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useLastUpdate } from "@/hooks/use-last-update";
import {
  Loader2,
  Users,
  Trophy,
  DollarSign,
  LayoutGrid,
  AlertCircle,
  Clock,
  Timer,
  RotateCcw,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  next_start_ts?: number;
  last_update_ts?: number;
  creation_ts?: number;
  late_reg_level?: number;
  re_entry_min?: number;
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

type SortKey = "status" | "players" | "buyin" | "name";
type SortDir = "asc" | "desc";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GAME_TYPE_COLORS: Record<string, string> = {
  NLH: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "NLH Cash": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  PLO4: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  PLO5: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  PLO6: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/20",
  MTT: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  SNG: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  SpinUp: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  OFC: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  ShortDeck: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

const STATUS_CONFIG: Record<number, { label: string; color: string; dot: string }> = {
  0: { label: "Idle", color: "text-gray-400", dot: "bg-gray-400" },
  1: { label: "Registrando", color: "text-yellow-400", dot: "bg-yellow-400 animate-pulse" },
  2: { label: "Rodando", color: "text-green-400", dot: "bg-green-400 animate-pulse" },
  3: { label: "Finalizado", color: "text-red-400", dot: "bg-red-400" },
};

function statusInfo(status: number) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG[0]!;
}

function formatChips(value: number) {
  if (value === 0) return "-";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return value.toLocaleString("pt-BR");
}

function formatTime(ts: number) {
  if (!ts || ts === 0) return null;
  const d = new Date(ts * 1000);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBlindDuration(seconds: number) {
  if (!seconds || seconds === 0) return null;
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}min`;
}

function sortRooms(rooms: Room[], key: SortKey, dir: SortDir): Room[] {
  const sorted = [...rooms].sort((a, b) => {
    switch (key) {
      case "status": {
        // Running first, then registering, then idle, then finished
        const order = [2, 1, 0, 3];
        const ai = order.indexOf(a.status);
        const bi = order.indexOf(b.status);
        if (ai !== bi) return ai - bi;
        return b.current_players - a.current_players;
      }
      case "players":
        return b.current_players - a.current_players;
      case "buyin":
        return b.buy_in - a.buy_in;
      case "name":
        return a.nome.localeCompare(b.nome, "pt-BR");
      default:
        return 0;
    }
  });
  return dir === "desc" ? sorted.reverse() : sorted;
}

// ---------------------------------------------------------------------------
// Stats Bar
// ---------------------------------------------------------------------------

function StatsBar({ rooms }: { rooms: Room[] }) {
  const active = rooms.filter((r) => r.is_running).length;
  const totalPlayers = rooms.reduce((s, r) => s + r.current_players, 0);
  const totalRegistered = rooms.reduce((s, r) => s + (r.is_tournament ? r.registered : 0), 0);
  const tournaments = rooms.filter((r) => r.is_tournament && r.status !== 3).length;
  const cashGames = rooms.filter((r) => !r.is_tournament).length;

  const stats = [
    { icon: LayoutGrid, label: "Total", value: rooms.length, sub: null },
    { icon: Zap, label: "Ativas", value: active, sub: null },
    { icon: Users, label: "Jogadores", value: totalPlayers, sub: totalRegistered > 0 ? `+${totalRegistered} reg` : null },
    { icon: Trophy, label: "Torneios", value: tournaments, sub: cashGames > 0 ? `${cashGames} cash` : null },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
        >
          <s.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-mono text-sm font-medium">{s.value}</p>
              {s.sub && (
                <p className="text-[10px] text-muted-foreground">{s.sub}</p>
              )}
            </div>
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
  const gameColor = GAME_TYPE_COLORS[room.game_type] ?? "bg-muted text-muted-foreground border-border";
  const playerPercent = room.max_players > 0 ? (room.current_players / room.max_players) * 100 : 0;

  return (
    <Card className={cn(
      "overflow-hidden transition-colors",
      room.is_running && "border-green-500/20",
      room.status === 1 && "border-yellow-500/20",
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header: name + badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium leading-tight truncate">
              {room.nome}
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              ID: {room.room_id}
            </p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border", gameColor)}>
              {room.game_type}
            </span>
          </div>
        </div>

        {/* Status + players row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full flex-shrink-0", si.dot)} />
            <span className={cn("text-xs font-medium", si.color)}>{si.label}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono font-medium">
              {room.current_players}/{room.max_players}
            </span>
            {room.is_tournament && room.registered > 0 && (
              <span className="text-muted-foreground">
                ({room.registered} reg)
              </span>
            )}
          </div>
        </div>

        {/* Player fill bar */}
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              playerPercent >= 80 ? "bg-red-500" : playerPercent >= 50 ? "bg-yellow-500" : "bg-green-500",
            )}
            style={{ width: `${Math.min(playerPercent, 100)}%` }}
          />
        </div>

        {/* Buy-in / Rake / Fee */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {room.buy_in > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Buy-in:</span>
              <span className="font-medium font-mono">{formatChips(room.buy_in)}</span>
              {room.fee > 0 && (
                <span className="text-muted-foreground">+{formatChips(room.fee)}</span>
              )}
            </div>
          )}
          {room.rake > 0 && (
            <span className="text-muted-foreground">
              Rake: <span className="text-foreground font-medium">{room.rake}%</span>
            </span>
          )}
        </div>

        {/* Tournament details */}
        {room.is_tournament && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {room.guaranteed > 0 && (
              <span>
                GTD: <span className="text-foreground font-medium font-mono">{formatChips(room.guaranteed)}</span>
              </span>
            )}
            {room.starting_chips > 0 && (
              <span>
                Stack: <span className="text-foreground font-medium font-mono">{formatChips(room.starting_chips)}</span>
              </span>
            )}
            {room.prize && room.prize.total > 0 && (
              <span>
                Prize: <span className="text-foreground font-medium font-mono">{formatChips(room.prize.total)}</span>
              </span>
            )}
            {room.blind_duration > 0 && (
              <span className="flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Blinds: <span className="text-foreground font-medium">{formatBlindDuration(room.blind_duration)}</span>
              </span>
            )}
            {!!room.late_reg_level && room.late_reg_level > 0 && (
              <span>
                Late reg: <span className="text-foreground font-medium">Nv. {room.late_reg_level}</span>
              </span>
            )}
            {!!room.re_entry_min && room.re_entry_min > 0 && (
              <span className="flex items-center gap-1">
                <RotateCcw className="h-3 w-3" />
                Re-entry: <span className="text-foreground font-medium">{room.re_entry_min}min</span>
              </span>
            )}
          </div>
        )}

        {/* Timestamps */}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
          {room.start_ts ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Inicio: {formatTime(room.start_ts)}
            </span>
          ) : room.scheduled_ts ? (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Agendado: {formatTime(room.scheduled_ts)}
            </span>
          ) : null}
          {room.creation_ts ? (
            <span>Criado: {formatTime(room.creation_ts)}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sort Controls
// ---------------------------------------------------------------------------

function SortControls({
  sortKey,
  sortDir,
  onSort,
}: {
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const options: { key: SortKey; label: string }[] = [
    { key: "status", label: "Status" },
    { key: "players", label: "Jogadores" },
    { key: "buyin", label: "Buy-in" },
    { key: "name", label: "Nome" },
  ];

  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-muted-foreground mr-1">Ordenar:</span>
      {options.map((opt) => {
        const isActive = sortKey === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onSort(opt.key)}
            className={cn(
              "px-2 py-1 rounded transition-colors flex items-center gap-0.5",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {opt.label}
            {isActive && (
              sortDir === "asc"
                ? <ChevronUp className="h-3 w-3" />
                : <ChevronDown className="h-3 w-3" />
            )}
          </button>
        );
      })}
    </div>
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
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-1 w-full" />
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
// Room Grid (filtered + sorted)
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
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data, isLoading, isError, dataUpdatedAt } = useQuery(
    trpc.poker.rooms.getLive.queryOptions(
      {},
      { refetchInterval: 30_000 },
    ),
  );
  const lastUpdate = useLastUpdate(dataUpdatedAt);

  const rooms = (data?.rooms ?? []) as Room[];

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    let result: Room[];
    switch (tab) {
      case "ativas":
        result = rooms.filter((r) => r.is_running);
        break;
      case "torneios":
        result = rooms.filter((r) => r.is_tournament);
        break;
      case "cash":
        result = rooms.filter((r) => !r.is_tournament);
        break;
      default:
        result = rooms;
    }
    return sortRooms(result, sortKey, sortDir);
  }, [rooms, tab, sortKey, sortDir]);

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
              Nao foi possivel conectar ao PPPoker
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Verifique se o bridge esta online e tente novamente.
          </p>
        </div>
      )}

      <StatsBar rooms={rooms} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        {lastUpdate && (
          <p className="text-xs text-muted-foreground">
            Atualizado {lastUpdate}
          </p>
        )}
        <SortControls sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
      </div>

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
            Cash ({rooms.filter((r) => !r.is_tournament).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <RoomGrid rooms={filtered} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
