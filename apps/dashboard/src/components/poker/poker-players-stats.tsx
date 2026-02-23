"use client";

import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
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
  variant?: "default" | "success" | "warning" | "danger";
  valueColor?: string;
}) {
  const variantStyles = {
    default: "bg-muted/30 border",
    success: "bg-[#00C969]/10 border-[#00C969]/30",
    warning: "bg-amber-500/10 border-amber-500/30",
    danger: "bg-red-500/10 border-red-500/30",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-[#00C969]",
    warning: "text-amber-500",
    danger: "text-red-500",
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
  return <Skeleton className="h-10 w-32 rounded-lg" />;
}

export function PokerPlayersStats() {
  const t = useI18n();
  const trpc = useTRPC();

  const { data } = useSuspenseQuery(
    trpc.poker.analytics.getPlayersOverview.queryOptions(),
  );

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Total Players */}
      <StatBadge
        icon={Icons.Face}
        label={t("poker.players.stats.total")}
        value={data.totalPlayers}
        variant="default"
      />

      {/* Players Without Rake */}
      <StatBadge
        icon={Icons.AlertCircle}
        label={t("poker.players.stats.without_rake")}
        value={data.playersWithoutRake}
        variant={data.playersWithoutRake > 0 ? "warning" : "default"}
      />

      {/* Total Rake */}
      <StatBadge
        icon={Icons.TrendingUp}
        label={t("poker.players.stats.total_rake")}
        value={data.totalRake}
        variant="success"
        valueColor="text-[#00C969]"
      />

      {/* Net Result (Gains - Losses) */}
      <StatBadge
        icon={Icons.Leaderboard}
        label={t("poker.players.stats.net_result")}
        value={data.netResult}
        variant={data.netResult >= 0 ? "success" : "danger"}
        valueColor={data.netResult >= 0 ? "text-[#00C969]" : "text-red-500"}
      />
    </div>
  );
}

export function PokerPlayersStatsSkeleton() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <StatBadgeSkeleton />
      <StatBadgeSkeleton />
      <StatBadgeSkeleton />
      <StatBadgeSkeleton />
    </div>
  );
}
