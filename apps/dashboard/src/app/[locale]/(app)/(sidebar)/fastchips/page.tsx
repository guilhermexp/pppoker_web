import { PaymentOrdersTable } from "@/components/fastchips/payment-orders-table";
import { getI18n } from "@/locales/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n();
  return {
    title: t("fastchips.title"),
  };
}

export default async function FastChipsPage() {
  const t = await getI18n();

  return (
    <div className="flex flex-col gap-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("fastchips.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("fastchips.description")}
          </p>
        </div>
      </div>

      {/* Payment Orders Dashboard */}
      <PaymentOrdersTable />
    </div>
  );
}
