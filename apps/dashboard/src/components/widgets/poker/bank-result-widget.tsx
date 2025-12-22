"use client";

import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midday/ui/icons";
import { Skeleton } from "@midday/ui/skeleton";
import { cn } from "@midday/ui/cn";
import { useQuery } from "@tanstack/react-query";

export function BankResultWidget() {
  const trpc = useTRPC();
  const t = useI18n();

  const { data, isLoading } = useQuery(
    trpc.poker.analytics.getBankResult.queryOptions()
  );

  if (isLoading) {
    return <BankResultWidget.Skeleton />;
  }

  const bankResult = data?.bankResult ?? 0;
  const isPositive = bankResult >= 0;

  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d] h-full">
      <div className="flex items-center gap-2 mb-3">
        <Icons.Vat className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs text-muted-foreground font-medium">
          {t("poker.widgets.bankResult")}
        </h3>
      </div>

      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "text-2xl font-medium",
            isPositive ? "text-green-500" : "text-red-500"
          )}
        >
          {isPositive ? "+" : ""}
          {bankResult.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("poker.widgets.netBankResult")}
        </p>
      </div>
    </div>
  );
}

BankResultWidget.Skeleton = function BankResultWidgetSkeleton() {
  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d] h-full">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-32 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
};
