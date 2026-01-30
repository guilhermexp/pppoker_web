"use client";

import { useFastchipsTransactionParams } from "@/hooks/use-fastchips-transaction-params";
import { useI18n } from "@/locales/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { Sheet, SheetContent } from "@midpoker/ui/sheet";
import { fastChipsTransactions } from "./transactions-data";

export function FastChipsTransactionDetailSheet() {
  const t = useI18n();
  const { fastchipsTransactionId, setParams } = useFastchipsTransactionParams();
  const isOpen = Boolean(fastchipsTransactionId);
  const transaction =
    fastChipsTransactions.find((item) => item.id === fastchipsTransactionId) ??
    fastChipsTransactions[0];

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setParams({ fastchipsTransactionId: null });
        }
      }}
    >
      <SheetContent>
        <div className="flex items-center gap-2 border-b pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setParams({ fastchipsTransactionId: null })}
          >
            <Icons.ArrowBack className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold text-sm">
            {t("fastchips.transacoes.details_title")}
          </h2>
        </div>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("fastchips.transacoes.player_data")}
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.transacoes.player_fields.name")}
                </span>
                <span>{transaction?.name}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.transacoes.player_fields.id")}
                </span>
                <span>{transaction?.playerId}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.transacoes.player_fields.email")}
                </span>
                <span>{transaction?.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.transacoes.player_fields.phone")}
                </span>
                <span>{transaction?.phone}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("fastchips.transacoes.purchase_data")}
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.transacoes.purchase_fields.chips")}
                </span>
                <span>{transaction?.chips}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.transacoes.purchase_fields.amount")}
                </span>
                <span>{transaction?.amount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.transacoes.purchase_fields.date")}
                </span>
                <span>{transaction?.date}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.transacoes.purchase_fields.time")}
                </span>
                <span>{transaction?.time}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.transacoes.purchase_fields.status")}
                </span>
                <Badge
                  variant="secondary"
                  className={`border ${
                    transaction?.status === "completed"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-amber-100 text-amber-700 border-amber-200"
                  }`}
                >
                  {transaction?.status === "completed"
                    ? t("fastchips.transacoes.status_completed")
                    : t("fastchips.transacoes.status_unpaid")}
                </Badge>
              </div>
            </div>
          </div>

          <Button className="w-full" size="sm">
            {t("fastchips.transacoes.view_movements")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
