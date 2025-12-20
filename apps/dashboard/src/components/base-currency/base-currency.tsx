"use client";

import { useScopedI18n } from "@/locales/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@midday/ui/card";
import { SelectCurrency } from "./select-currency";

export function BaseCurrency() {
  const t = useScopedI18n("settings.base_currency");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <CardContent>
        <SelectCurrency />
      </CardContent>
    </Card>
  );
}
