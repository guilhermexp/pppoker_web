"use client";

import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function TopPlayersWidget() {
  const trpc = useTRPC();
  const t = useI18n();

  const { data, isLoading } = useQuery(
    trpc.poker.analytics.getTopPlayers.queryOptions({ limit: 5 }),
  );

  if (isLoading) {
    return <TopPlayersWidget.Skeleton />;
  }

  const players = data?.players ?? [];

  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icons.TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs text-muted-foreground font-medium">
            {t("poker.dashboard.topPlayers")}
          </h3>
        </div>
        <Link
          href="/poker/players"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {t("poker.dashboard.viewAll")}
        </Link>
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("poker.dashboard.noPlayersYet")}
        </p>
      ) : (
        <div className="space-y-3">
          {players.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center justify-between py-2 border-b last:border-0 dark:border-[#1d1d1d]"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{player.nickname}</p>
                  <p className="text-xs text-muted-foreground">
                    {player.ppPokerId}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium">
                {player.chipBalance.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

TopPlayersWidget.Skeleton = function TopPlayersWidgetSkeleton() {
  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
};
