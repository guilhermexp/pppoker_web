"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midday/ui/icons";
import { Skeleton } from "@midday/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-green-500/10", text: "text-green-600", dot: "bg-green-500" },
  inactive: { bg: "bg-gray-500/10", text: "text-gray-500", dot: "bg-gray-500" },
  suspended: { bg: "bg-orange-500/10", text: "text-orange-600", dot: "bg-orange-500" },
  blacklisted: { bg: "bg-red-500/10", text: "text-red-600", dot: "bg-red-500" },
};

export function AgentsBreakdownWidget() {
  const trpc = useTRPC();
  const t = useI18n();
  const { dateFrom, dateTo, superAgentId } = usePokerPlayerParams();

  const { data, isLoading } = useQuery(
    trpc.poker.players.getAgentStats.queryOptions({
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
      superAgentId: superAgentId ?? undefined,
    })
  );

  if (isLoading) {
    return <AgentsBreakdownWidget.Skeleton />;
  }

  const byStatus = data?.byStatus ?? {};
  const bySuperAgent = data?.bySuperAgent ?? [];

  const statusEntries = Object.entries(byStatus).sort((a, b) => b[1].rake - a[1].rake);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* By Super Agent */}
      <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
        <div className="flex items-center gap-2 mb-4">
          <Icons.Customers className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {t("poker.agents.widgets.by_super_agent")}
          </h3>
        </div>
        <div className="space-y-3">
          {bySuperAgent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("poker.agents.widgets.no_super_agents")}
            </p>
          ) : (
            bySuperAgent.map((sa, index) => {
              const maxRake = bySuperAgent[0]?.rake ?? 1;
              const percentage = (sa.rake / maxRake) * 100;

              return (
                <div key={sa.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        #{index + 1}
                      </span>
                      <span className="font-medium truncate max-w-[140px]">
                        {sa.nickname}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({sa.count} {sa.count === 1 ? "agent" : "agents"})
                      </span>
                    </div>
                    <span className="font-mono text-green-600 font-medium">
                      {formatCurrency(sa.rake)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* By Status */}
      <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
        <div className="flex items-center gap-2 mb-4">
          <Icons.Status className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {t("poker.agents.widgets.by_status")}
          </h3>
        </div>
        <div className="space-y-3">
          {statusEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("poker.agents.widgets.no_agents")}
            </p>
          ) : (
            statusEntries.map(([status, stats]) => {
              const colors = statusColors[status] ?? statusColors.active;
              const totalRake = Object.values(byStatus).reduce((sum, s) => sum + s.rake, 0);
              const percentage = totalRake > 0 ? (stats.rake / totalRake) * 100 : 0;

              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    <div>
                      <span className={`text-sm font-medium capitalize ${colors.text}`}>
                        {t(`poker.status.${status}` as any) ?? status}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({stats.count})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground">
                      {percentage.toFixed(0)}%
                    </span>
                    <span className="text-sm font-mono font-medium">
                      {formatCurrency(stats.rake)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

AgentsBreakdownWidget.Skeleton = function AgentsBreakdownWidgetSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-1.5 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
