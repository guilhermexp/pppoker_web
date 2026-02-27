"use client";

import { ErrorBoundary } from "@/components/error-boundary";
import { ActivationLanding } from "@/components/fastchips/activation-landing";
import { PaymentOrdersTable } from "@/components/fastchips/payment-orders-table";
import { SetupWizard } from "@/components/fastchips/setup-wizard";
import { useFastchipsServiceQuery } from "@/hooks/use-team";
import { useI18n } from "@/locales/client";
import { Icons } from "@midpoker/ui/icons";
import { Suspense, useEffect, useRef, useState } from "react";

function ActivationSuccessBanner() {
  const t = useI18n();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <Icons.Check className="h-5 w-5 text-green-600 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          {t("fastchips.service.finish_success")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("fastchips.service.finish_success_description")}
        </p>
      </div>
    </div>
  );
}

function FastChipsPageContent() {
  const t = useI18n();
  const { data: service } = useFastchipsServiceQuery();
  const prevStatusRef = useRef(service.status);
  const [justActivated, setJustActivated] = useState(false);

  useEffect(() => {
    if (prevStatusRef.current === "setup" && service.status === "active") {
      setJustActivated(true);
    }
    prevStatusRef.current = service.status;
  }, [service.status]);

  if (service.status === "inactive") {
    return <ActivationLanding />;
  }

  if (service.status === "setup") {
    return <SetupWizard />;
  }

  // status === "active"
  return (
    <div className="flex flex-col gap-6 mt-6">
      {justActivated && <ActivationSuccessBanner />}
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
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex items-center justify-center mt-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }
      >
        <FastChipsPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
