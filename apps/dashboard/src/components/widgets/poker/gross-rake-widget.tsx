"use client";

import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useQuery } from "@tanstack/react-query";

export function GrossRakeWidget() {
  const trpc = useTRPC();
  const t = useI18n();

  const { data, isLoading } = useQuery(
    trpc.poker.analytics.getGrossRake.queryOptions(),
  );

  if (isLoading) {
    return <GrossRakeWidget.Skeleton />;
  }

  const grossRake = data?.grossRake ?? 0;

  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d] h-full">
      <div className="flex items-center gap-2 mb-3">
        <Icons.Currency className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs text-muted-foreground font-medium">
          {t("poker.widgets.grossRake")}
        </h3>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-2xl font-medium">
          {grossRake.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("poker.widgets.totalRakeCollected")}
        </p>
      </div>
    </div>
  );
}

GrossRakeWidget.Skeleton = function GrossRakeWidgetSkeleton() {
  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d] h-full">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-32 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
};
