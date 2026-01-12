"use client";

import { useTeamQuery } from "@/hooks/use-team";
import { useUserQuery } from "@/hooks/use-user";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@midpoker/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FormatAmount } from "./format-amount";

export function TopRevenueClient() {
  const trpc = useTRPC();
  const { data: team } = useTeamQuery();
  const { data: user } = useUserQuery();
  const t = useI18n();
  const { data } = useSuspenseQuery(
    trpc.invoice.topRevenueClient.queryOptions(),
  );

  if (!data) {
    return (
      <Card className="hidden sm:block">
        <CardHeader className="pb-3">
          <CardTitle className="font-medium text-2xl">
            {t("customers.no_revenue_client")}
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-[34px]">
          <div className="flex flex-col gap-2">
            <div>{t("customers.top_revenue_client")}</div>
            <div className="text-sm text-muted-foreground">
              {t("customers.no_revenue_generated")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hidden sm:block">
      <CardHeader className="pb-3">
        <CardTitle className="font-medium text-2xl">
          {data.customerName}
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div>{t("customers.top_revenue_client")}</div>
          <div className="text-sm text-muted-foreground">
            <FormatAmount
              amount={data.totalRevenue}
              currency={data.currency || team?.baseCurrency || "USD"}
              locale={user?.locale ?? undefined}
            />{" "}
            {t("customers.from")} {data.invoiceCount}{" "}
            {t("customers.invoice", { count: data.invoiceCount })}{" "}
            {t("customers.past_30_days")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
