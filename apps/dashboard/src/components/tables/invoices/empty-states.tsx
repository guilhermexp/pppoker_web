"use client";

import { useInvoiceFilterParams } from "@/hooks/use-invoice-filter-params";
import { useInvoiceParams } from "@/hooks/use-invoice-params";
import { useI18n } from "@/locales/client";
import { Button } from "@midday/ui/button";

export function EmptyState() {
  const t = useI18n();
  const { setParams } = useInvoiceParams();

  return (
    <div className="flex items-center justify-center ">
      <div className="flex flex-col items-center mt-40">
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">
            {t("invoice_table.empty.no_invoices")}
          </h2>
          <p className="text-[#606060] text-sm">
            {t("invoice_table.empty.no_invoices_description")}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            setParams({
              type: "create",
            })
          }
        >
          {t("invoice_table.empty.create_invoice")}
        </Button>
      </div>
    </div>
  );
}

export function NoResults() {
  const t = useI18n();
  const { setFilter } = useInvoiceFilterParams();

  return (
    <div className="flex items-center justify-center ">
      <div className="flex flex-col items-center mt-40">
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">
            {t("invoice_table.empty.no_results")}
          </h2>
          <p className="text-[#606060] text-sm">
            {t("invoice_table.empty.no_results_description")}
          </p>
        </div>

        <Button variant="outline" onClick={() => setFilter(null)}>
          {t("invoice_table.empty.clear_filters")}
        </Button>
      </div>
    </div>
  );
}
