"use client";

import { usePokerSessionParams } from "@/hooks/use-poker-session-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function StatBadge({
  icon: Icon,
  label,
  value,
  variant = "default",
  valueColor,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  variant?: "default" | "success" | "warning" | "info" | "purple";
  valueColor?: string;
}) {
  const variantStyles = {
    default: "bg-muted/30 border",
    success: "bg-[#00C969]/10 border-[#00C969]/30",
    warning: "bg-amber-500/10 border-amber-500/30",
    info: "bg-blue-500/10 border-blue-500/30",
    purple: "bg-purple-500/10 border-purple-500/30",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-[#00C969]",
    warning: "text-amber-500",
    info: "text-blue-500",
    purple: "text-purple-500",
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${variantStyles[variant]}`}
    >
      {Icon && <Icon className={`w-4 h-4 ${iconStyles[variant]}`} />}
      <span className="text-sm">
        {label}:{" "}
        <span className={`font-bold ${valueColor ?? ""}`}>
          {typeof value === "number" ? formatNumber(value) : value}
        </span>
      </span>
    </div>
  );
}

function StatBadgeSkeleton() {
  return <Skeleton className="h-10 w-36 rounded-lg" />;
}

export function PokerSessionsStats() {
  const t = useI18n();
  const trpc = useTRPC();
  const { dateFrom, dateTo, sessionType, gameVariant } =
    usePokerSessionParams();

  const { data } = useSuspenseQuery(
    trpc.poker.sessions.getStats.queryOptions({
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
      sessionType: sessionType ?? undefined,
      gameVariant: gameVariant ?? undefined,
    }),
  );

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Total Sessions */}
      <StatBadge
        icon={Icons.PieChart}
        label={t("poker.sessions.stats.total")}
        value={data.totalSessions}
        variant="default"
      />

      {/* Unique Players */}
      <StatBadge
        icon={Icons.Face}
        label={t("poker.sessions.stats.players")}
        value={data.uniquePlayerCount}
        variant="default"
      />

      {/* Total Buy-in */}
      <StatBadge
        icon={Icons.ArrowUpward}
        label={t("poker.sessions.stats.buy_in")}
        value={formatCurrency(data.totalBuyIn)}
        variant="info"
        valueColor="text-blue-500"
      />

      {/* Total Rake */}
      <StatBadge
        icon={Icons.TrendingUp}
        label={t("poker.sessions.stats.rake")}
        value={formatCurrency(data.totalRake)}
        variant="success"
        valueColor="text-[#00C969]"
      />

      {/* Total GTD */}
      <StatBadge
        icon={Icons.Star}
        label="GTD"
        value={formatCurrency(data.totalGtd)}
        variant="warning"
        valueColor="text-amber-500"
      />

      {/* Total Hands */}
      <StatBadge
        icon={Icons.PlayOutline}
        label={t("poker.sessions.stats.hands")}
        value={data.totalHandsPlayed}
        variant="purple"
        valueColor="text-purple-500"
      />
    </div>
  );
}

export function PokerSessionsStatsSkeleton() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <StatBadgeSkeleton />
      <StatBadgeSkeleton />
      <StatBadgeSkeleton />
      <StatBadgeSkeleton />
      <StatBadgeSkeleton />
      <StatBadgeSkeleton />
    </div>
  );
}
