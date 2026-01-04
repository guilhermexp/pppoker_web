"use client";

import { usePokerSessionParams } from "@/hooks/use-poker-session-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@midday/ui/badge";
import { Icons } from "@midday/ui/icons";
import { Skeleton } from "@midday/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

const SESSION_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  cash_game: {
    label: "Cash Game",
    color: "text-green-600",
    bgColor: "bg-green-500/10",
  },
  mtt: {
    label: "MTT",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
  },
  sit_n_go: {
    label: "Sit & Go",
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
  },
  spin: {
    label: "SPIN",
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
  },
};

const GAME_VARIANT_CONFIG: Record<string, { label: string; color: string }> = {
  nlh: { label: "NLH", color: "bg-blue-500" },
  nlh_6plus: { label: "6+", color: "bg-cyan-500" },
  plo4: { label: "PLO4", color: "bg-green-500" },
  plo5: { label: "PLO5", color: "bg-emerald-500" },
  plo6: { label: "PLO6", color: "bg-teal-500" },
  ofc: { label: "OFC", color: "bg-purple-500" },
  mixed: { label: "Mixed", color: "bg-gray-500" },
  other: { label: "Other", color: "bg-gray-400" },
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SessionsBreakdownWidget() {
  const trpc = useTRPC();
  const t = useI18n();
  const { dateFrom, dateTo, sessionType, gameVariant } =
    usePokerSessionParams();

  const { data, isLoading } = useQuery(
    trpc.poker.sessions.getStats.queryOptions({
      dateFrom: dateFrom ?? undefined,
      dateTo: dateTo ?? undefined,
      sessionType: sessionType ?? undefined,
      gameVariant: gameVariant ?? undefined,
    }),
  );

  if (isLoading) {
    return <SessionsBreakdownWidget.Skeleton />;
  }

  const byType = data?.byType ?? {};
  const byVariant = data?.byVariant ?? {};

  // Sort types by count descending
  const sortedTypes = Object.entries(byType)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4);

  // Sort variants by count descending
  const sortedVariants = Object.entries(byVariant)
    .filter(([key]) => key !== "unknown")
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* By Type */}
      <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
        <div className="flex items-center gap-2 mb-4">
          <Icons.Category className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {t("poker.sessions.widgets.by_type")}
          </h3>
        </div>

        {sortedTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma sessao registrada
          </p>
        ) : (
          <div className="space-y-3">
            {sortedTypes.map(([type, stats]) => {
              const config = SESSION_TYPE_CONFIG[type] ?? {
                label: type,
                color: "text-gray-600",
                bgColor: "bg-gray-500/10",
              };
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`${config.bgColor} ${config.color} border-0 text-xs`}
                    >
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground w-16 text-right">
                      {stats.count}
                    </span>
                    <span className="font-mono text-green-600 w-20 text-right">
                      {formatCurrency(stats.rake)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* By Game Variant */}
      <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
        <div className="flex items-center gap-2 mb-4">
          <Icons.Status className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {t("poker.sessions.widgets.by_game")}
          </h3>
        </div>

        {sortedVariants.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma sessao registrada
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sortedVariants.map(([variant, stats]) => {
              const config = GAME_VARIANT_CONFIG[variant] ?? {
                label: variant.toUpperCase(),
                color: "bg-gray-500",
              };
              return (
                <Badge
                  key={variant}
                  variant="secondary"
                  className="text-xs py-1 px-2"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${config.color} mr-1.5`}
                  />
                  {config.label}
                  <span className="ml-1.5 text-muted-foreground">
                    {stats.count}
                  </span>
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

SessionsBreakdownWidget.Skeleton = function SessionsBreakdownWidgetSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-6 w-16" />
          ))}
        </div>
      </div>
    </div>
  );
};
