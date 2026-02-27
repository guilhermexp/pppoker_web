"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import {
  formatCurrencyRounded as formatCurrency,
  formatNumberRounded as formatNumber,
} from "@/utils/format";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useSuspenseQuery } from "@tanstack/react-query";

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

export function PokerAgentsStats() {
  const t = useI18n();
  const trpc = useTRPC();
  const { dateFrom, dateTo, superAgentId } = usePokerPlayerParams();

  const { data } = useSuspenseQuery(
    trpc.poker.players.getAgentStats.queryOptions({
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
      superAgentId: superAgentId ?? undefined,
    }),
  );

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Total Agents */}
      <StatBadge
        icon={Icons.Customers}
        label={t("poker.agents.stats.total")}
        value={data.totalAgents}
        variant="default"
      />

      {/* Managed Players */}
      <StatBadge
        icon={Icons.Face}
        label={t("poker.agents.stats.managed_players")}
        value={data.totalManagedPlayers}
        variant="default"
      />

      {/* Total Rake */}
      <StatBadge
        icon={Icons.TrendingUp}
        label={t("poker.agents.stats.rake")}
        value={formatCurrency(data.totalRake)}
        variant="success"
        valueColor="text-[#00C969]"
      />

      {/* Rake PPST */}
      <StatBadge
        icon={Icons.Star}
        label="PPST"
        value={formatCurrency(data.totalRakePpst)}
        variant="info"
        valueColor="text-blue-500"
      />

      {/* Rake PPSR */}
      <StatBadge
        icon={Icons.PlayOutline}
        label="PPSR"
        value={formatCurrency(data.totalRakePpsr)}
        variant="purple"
        valueColor="text-purple-500"
      />

      {/* Total Commission */}
      <StatBadge
        icon={Icons.Currency}
        label={t("poker.agents.stats.commission")}
        value={formatCurrency(data.totalCommission)}
        variant="warning"
        valueColor="text-amber-500"
      />
    </div>
  );
}

export function PokerAgentsStatsSkeleton() {
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
