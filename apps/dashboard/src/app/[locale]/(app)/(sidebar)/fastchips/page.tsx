"use client";

import { ActivationLanding } from "@/components/fastchips/activation-landing";
import { PaymentOrdersTable } from "@/components/fastchips/payment-orders-table";
import { SetupWizard } from "@/components/fastchips/setup-wizard";
import { useFastchipsServiceQuery } from "@/hooks/use-team";
import { useI18n } from "@/locales/client";
import { Suspense } from "react";

function FastChipsPageContent() {
  const t = useI18n();
  const { data: service } = useFastchipsServiceQuery();

  if (service.status === "inactive") {
    return <ActivationLanding />;
  }

  if (service.status === "setup") {
    return <SetupWizard />;
  }

  // status === "active"
  return (
    <div className="flex flex-col gap-6 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("fastchips.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("fastchips.description")}
          </p>
        </div>
      </div>
      <PaymentOrdersTable />
    </div>
  );
}

export default function FastChipsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center mt-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <FastChipsPageContent />
    </Suspense>
  );
}
