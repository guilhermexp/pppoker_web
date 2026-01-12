"use client";

import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function DebtorsWidget() {
  const trpc = useTRPC();
  const t = useI18n();

  const { data, isLoading } = useQuery(
    trpc.poker.analytics.getDebtors.queryOptions({ limit: 5 }),
  );

  if (isLoading) {
    return <DebtorsWidget.Skeleton />;
  }

  const debtors = data?.debtors ?? [];
  const totalDebt = data?.totalDebt ?? 0;

  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icons.TrendingDown className="h-4 w-4 text-destructive" />
          <h3 className="text-xs text-muted-foreground font-medium">
            {t("poker.dashboard.debtors")}
          </h3>
        </div>
        {totalDebt > 0 && (
          <span className="text-xs text-destructive font-medium">
            {t("poker.dashboard.totalDebt")}: {totalDebt.toLocaleString()}
          </span>
        )}
      </div>

      {debtors.length === 0 ? (
        <div className="text-center py-4">
          <Icons.Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {t("poker.dashboard.noDebtors")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {debtors.map((debtor) => (
            <div
              key={debtor.id}
              className="flex items-center justify-between py-2 border-b last:border-0 dark:border-[#1d1d1d]"
            >
              <div>
                <p className="text-sm font-medium">{debtor.nickname}</p>
                <p className="text-xs text-muted-foreground">
                  {debtor.ppPokerId}
                </p>
              </div>
              <p className="text-sm font-medium text-destructive">
                -{debtor.debt.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {debtors.length > 0 && (
        <Link
          href="/poker/settlements"
          className="block text-center text-xs text-muted-foreground hover:text-primary transition-colors mt-4"
        >
          {t("poker.dashboard.viewSettlements")}
        </Link>
      )}
    </div>
  );
}

DebtorsWidget.Skeleton = function DebtorsWidgetSkeleton() {
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
