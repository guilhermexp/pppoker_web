"use client";

import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@midpoker/ui/card";
import NumberFlow from "@number-flow/react";
import { useSuspenseQuery } from "@tanstack/react-query";

export function NewCustomersThisMonth() {
  const trpc = useTRPC();
  const t = useI18n();
  const { data } = useSuspenseQuery(
    trpc.invoice.newCustomersCount.queryOptions(),
  );

  return (
    <Card className="hidden sm:block">
      <CardHeader className="pb-3">
        <CardTitle className="font-medium text-2xl">
          <NumberFlow value={data} willChange />
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div>{t("customers.new_customers")}</div>
          <div className="text-sm text-muted-foreground">
            {t("customers.added_past_30_days")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
