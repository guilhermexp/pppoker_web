"use client";

import { useI18n } from "@/locales/client";
import { Card, CardContent } from "@midpoker/ui/card";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@midpoker/ui/select";
import { Switch } from "@midpoker/ui/switch";
import { useEffect, useState } from "react";

export function FastChipsControlPanel() {
  const t = useI18n();
  const [mounted, setMounted] = useState(false);
  const [withdrawType, setWithdrawType] = useState("auto");

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          <h2 className="text-lg font-semibold">
            {t("fastchips.controle.players_title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {t("fastchips.controle.players_description")}
          </p>
        </div>
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
              <span className="text-sm font-medium">
                {t("fastchips.controle.min_purchase")}
              </span>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-10 items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
                  R$
                </span>
                <Input className="max-w-[160px]" defaultValue="5,00" />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
              <span className="text-sm font-medium">
                {t("fastchips.controle.min_withdraw")}
              </span>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-10 items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
                  R$
                </span>
                <Input className="max-w-[160px]" defaultValue="50,00" />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
              <span className="text-sm font-medium">
                {t("fastchips.controle.daily_limit")}
              </span>
              <Input className="max-w-[120px]" defaultValue="4" />
            </div>

            <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
              <span className="text-sm font-medium">
                {t("fastchips.controle.notifications")}
              </span>
              <div className="flex items-center gap-3">
                <Switch defaultChecked />
                <span className="text-sm text-muted-foreground">
                  {t("fastchips.controle.notifications_enabled")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          <h2 className="text-lg font-semibold">
            {t("fastchips.controle.withdraw_title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {t("fastchips.controle.withdraw_description")}
          </p>
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
                <span className="text-sm font-medium">
                  {t("fastchips.controle.withdraw_type")}
                </span>
                {mounted ? (
                  <Select value={withdrawType} onValueChange={setWithdrawType}>
                    <SelectTrigger className="max-w-[240px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        {t("fastchips.controle.withdraw_auto")}
                      </SelectItem>
                      <SelectItem value="manual">
                        {t("fastchips.controle.withdraw_manual")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-9 max-w-[240px] rounded-md border border-border bg-muted/30" />
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
                <span className="text-sm font-medium">
                  {t("fastchips.controle.max_value")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-10 items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input className="max-w-[160px]" defaultValue="3.000,00" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <Icons.InfoOutline className="h-4 w-4 mt-0.5" />
            <span>{t("fastchips.controle.withdraw_notice")}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          <h2 className="text-lg font-semibold">
            {t("fastchips.controle.league_title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {t("fastchips.controle.league_description")}
          </p>
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
                <span className="text-sm font-medium">
                  {t("fastchips.controle.league_id")}
                </span>
                <Input className="max-w-[240px]" defaultValue="2136" />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <Icons.InfoOutline className="h-4 w-4 mt-0.5" />
            <span>{t("fastchips.controle.league_notice")}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
