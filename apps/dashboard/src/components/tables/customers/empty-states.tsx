"use client";

import { useCustomerParams } from "@/hooks/use-customer-params";
import { useI18n } from "@/locales/client";
import { Button } from "@midday/ui/button";

export function EmptyState() {
  const { setParams } = useCustomerParams();
  const t = useI18n();

  return (
    <div className="flex items-center justify-center ">
      <div className="flex flex-col items-center mt-40">
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">{t("customers.no_customers")}</h2>
          <p className="text-[#606060] text-sm">
            {t("customers.no_customers_description")} <br />
            {t("customers.create_first")}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            setParams({
              createCustomer: true,
            })
          }
        >
          {t("customers.create_customer")}
        </Button>
      </div>
    </div>
  );
}

export function NoResults() {
  const { setParams } = useCustomerParams();
  const t = useI18n();

  return (
    <div className="flex items-center justify-center ">
      <div className="flex flex-col items-center mt-40">
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">{t("transactions.no_results")}</h2>
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
