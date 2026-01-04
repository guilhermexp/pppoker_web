"use client";

import { AddAccountButton } from "@/components/add-account-button";
import { useTransactionFilterParamsWithPersistence } from "@/hooks/use-transaction-filter-params-with-persistence";
import { useI18n } from "@/locales/client";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";

export function NoResults() {
  const t = useI18n();
  const { clearAllFilters } = useTransactionFilterParamsWithPersistence();

  return (
    <div className="h-[calc(100vh-300px)] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Icons.Transactions2 className="mb-4" />
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">
            {t("transactions.no_results")}
          </h2>
          <p className="text-[#606060] text-sm">
            {t("transactions.no_results_description")}
          </p>
        </div>

        <Button variant="outline" onClick={clearAllFilters}>
          {t("transactions.clear_filters")}
        </Button>
      </div>
    </div>
  );
}

export function NoTransactions() {
  const t = useI18n();

  return (
    <div className="absolute w-full h-[calc(100vh-300px)] top-0 left-0 flex items-center justify-center z-20">
      <div className="text-center max-w-sm mx-auto flex flex-col items-center justify-center">
        <h2 className="text-xl font-medium mb-2">
          {t("transactions.no_transactions")}
        </h2>
        <p className="text-sm text-[#878787] mb-6">
          {t("transactions.no_transactions_description")}
        </p>

        <AddAccountButton />
      </div>
    </div>
  );
}
