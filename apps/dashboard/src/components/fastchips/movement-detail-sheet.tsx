"use client";

import { useFastchipsMovementParams } from "@/hooks/use-fastchips-movement-params";
import { useI18n } from "@/locales/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { Sheet, SheetContent } from "@midpoker/ui/sheet";
import { fastChipsMovements } from "./movements-data";

export function FastChipsMovementDetailSheet() {
  const t = useI18n();
  const { fastchipsMovementId, setParams } = useFastchipsMovementParams();
  const isOpen = Boolean(fastchipsMovementId);
  const movement =
    fastChipsMovements.find((item) => item.id === fastchipsMovementId) ??
    fastChipsMovements[0];

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setParams({ fastchipsMovementId: null });
        }
      }}
    >
      <SheetContent>
        <div className="flex items-center gap-2 border-b pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setParams({ fastchipsMovementId: null })}
          >
            <Icons.ArrowBack className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold text-sm">
              {t("fastchips.movimentacao.details_title", {
                date: movement.date,
                time: movement.time,
              })}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {t("fastchips.movimentacao.payment_id")}
              {movement.paymentId}
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("fastchips.movimentacao.operation_data")}
            </h3>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.movimentacao.fields.type")}
                </span>
                <span>
                  {movement.type === "entry"
                    ? t("fastchips.movimentacao.type_entry")
                    : t("fastchips.movimentacao.type_exit")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.movimentacao.fields.purpose")}
                </span>
                <span>{movement.purpose}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.movimentacao.fields.gross")}
                </span>
                <span>{movement.grossAmount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.movimentacao.fields.net")}
                </span>
                <span>{movement.netAmount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.movimentacao.fields.player_id")}
                </span>
                <span>{movement.playerId}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.movimentacao.fields.payer")}
                </span>
                <span>{movement.payer}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.movimentacao.fields.fee")}
                </span>
                <span>{movement.fee}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("fastchips.movimentacao.fields.status")}
                </span>
                <Badge
                  variant="secondary"
                  className="border bg-emerald-100 text-emerald-700 border-emerald-200"
                >
                  {movement.status === "completed"
                    ? t("fastchips.movimentacao.status_completed")
                    : t("fastchips.movimentacao.status_pending")}
                </Badge>
              </div>
            </div>
          </div>

          <Button className="w-full" size="sm">
            {t("fastchips.movimentacao.view_transaction")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
