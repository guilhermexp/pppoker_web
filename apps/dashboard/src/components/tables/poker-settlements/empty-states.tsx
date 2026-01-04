"use client";

import { usePokerSettlementParams } from "@/hooks/use-poker-settlement-params";
import { useI18n } from "@/locales/client";
import { Button } from "@midday/ui/button";
import { Icons } from "@midday/ui/icons";

export function EmptyState() {
  const t = useI18n();

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center mt-40">
        <div className="p-4 bg-muted rounded-full mb-6">
          <Icons.Vat className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">
            {t("poker.settlements.no_settlements")}
          </h2>
          <p className="text-[#606060] text-sm">
            {t("poker.settlements.no_settlements_description")}
          </p>
        </div>
      </div>
    </div>
  );
}

export function NoResults() {
  const { setParams } = usePokerSettlementParams();
  const t = useI18n();

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center mt-40">
        <div className="p-4 bg-muted rounded-full mb-6">
          <Icons.Search className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">
            {t("transactions.no_results")}
          </h2>
          <p className="text-[#606060] text-sm">
            {t("transactions.no_results_description")}
          </p>
        </div>

        <Button variant="outline" onClick={() => setParams(null)}>
          {t("transactions.clear_filters")}
        </Button>
      </div>
    </div>
  );
}
