"use client";

import { useI18n } from "@/locales/client";
import { Icons } from "@midday/ui/icons";
import { Skeleton } from "@midday/ui/skeleton";

export function BankResultWidget() {
  const t = useI18n();

  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d] h-full">
      <div className="flex items-center gap-2 mb-4">
        <Icons.Vat className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {t("poker.dashboard.bank_result")}
        </h3>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Icons.ShowChart className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          Em breve
        </p>
      </div>
    </div>
  );
}

BankResultWidget.Skeleton = function BankResultWidgetSkeleton() {
  return (
    <div className="border rounded-lg p-4 dark:bg-[#0c0c0c] dark:border-[#1d1d1d] h-full">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-10 w-40 mb-1" />
      <Skeleton className="h-3 w-24 mb-4" />
    </div>
  );
};
