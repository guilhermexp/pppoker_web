"use client";

import { useFastchipsLinkedAccountParams } from "@/hooks/use-fastchips-linked-account-params";
import { useI18n } from "@/locales/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { Sheet, SheetContent } from "@midpoker/ui/sheet";
import { fastChipsLinkedAccounts } from "./linked-accounts-data";

export function FastChipsLinkedAccountDetailSheet() {
  const t = useI18n();
  const { fastchipsLinkedAccountId, setParams } =
    useFastchipsLinkedAccountParams();
  const isOpen = Boolean(fastchipsLinkedAccountId);
  const account =
    fastChipsLinkedAccounts.find(
      (item) => item.id === fastchipsLinkedAccountId,
    ) ?? fastChipsLinkedAccounts[0];

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setParams({ fastchipsLinkedAccountId: null });
        }
      }}
    >
      <SheetContent>
        <div className="flex items-center gap-2 border-b pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setParams({ fastchipsLinkedAccountId: null })}
          >
            <Icons.ArrowBack className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold text-sm">
            {t("fastchips.contas_vinculadas.details_title")}
          </h2>
        </div>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("fastchips.contas_vinculadas.player_data")}
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.contas_vinculadas.player_fields.name")}
                </span>
                <span>{account?.name}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.contas_vinculadas.player_fields.id")}
                </span>
                <span>{account?.playerId}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.contas_vinculadas.player_fields.phone")}
                </span>
                <span>{account?.phone}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("fastchips.contas_vinculadas.account_data")}
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.contas_vinculadas.account_fields.date")}
                </span>
                <span>{account?.date}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.contas_vinculadas.account_fields.status")}
                </span>
                {account?.status ? (
                  <Badge
                    variant="secondary"
                    className={`border ${
                      account.status === "active"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-gray-200 text-gray-700 border-gray-300"
                    }`}
                  >
                    {account.status === "active"
                      ? t("fastchips.contas_vinculadas.status_active")
                      : t("fastchips.contas_vinculadas.status_inactive")}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.contas_vinculadas.account_fields.restriction")}
                </span>
                {account?.restriction ? (
                  <Badge
                    variant="secondary"
                    className="border bg-emerald-100 text-emerald-700 border-emerald-200"
                  >
                    {account.restriction === "auto_withdraw"
                      ? t(
                          "fastchips.contas_vinculadas.restriction_auto_withdraw",
                        )
                      : t("fastchips.contas_vinculadas.restriction_blocked")}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            </div>
          </div>

          <Button className="w-full" size="sm">
            {t("fastchips.contas_vinculadas.view_movements")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
