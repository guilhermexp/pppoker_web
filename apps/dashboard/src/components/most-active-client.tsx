"use client";

import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@midday/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";

export function MostActiveClient() {
  const trpc = useTRPC();
  const t = useI18n();
  const { data } = useSuspenseQuery(
    trpc.invoice.mostActiveClient.queryOptions(),
  );

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-medium text-2xl">
            {t("customers.no_active_client")}
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-[34px]">
          <div className="flex flex-col gap-2">
            <div>{t("customers.most_active_client")}</div>
            <div className="text-sm text-muted-foreground">
              {t("customers.no_client_activity")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const trackerHours = Math.round(data.totalTrackerTime / 3600);
  const trackerMinutes = Math.round((data.totalTrackerTime % 3600) / 60);

  const timeDisplay =
    trackerHours > 0
      ? `${trackerHours}h${trackerMinutes > 0 ? ` ${trackerMinutes}m` : ""}`
      : `${trackerMinutes}m`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-medium text-2xl">
          {data.customerName}
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div>{t("customers.most_active_client")}</div>
          <div className="text-sm text-muted-foreground">
            {data.totalTrackerTime > 0 && (
              <>
                {timeDisplay} {t("customers.tracked")}
                {data.invoiceCount > 0 && ` ${t("customers.and")} `}
              </>
            )}
            {data.invoiceCount > 0 && (
              <>
                {data.invoiceCount}{" "}
                {t("customers.invoice", { count: data.invoiceCount })}
              </>
            )}
            {` ${t("customers.past_30_days")}`}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
