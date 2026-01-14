"use client";

import { useFastchipsPlayerParams } from "@/hooks/use-fastchips-player-params";
import { useI18n } from "@/locales/client";
import { Badge } from "@midpoker/ui/badge";
import { Button } from "@midpoker/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@midpoker/ui/dropdown-menu";
import { Icons } from "@midpoker/ui/icons";
import { Sheet, SheetContent } from "@midpoker/ui/sheet";
import {
  fastChipsPlayerLinkedAccounts,
  fastChipsPlayers,
} from "./players-data";

export function FastChipsPlayerDetailSheet() {
  const t = useI18n();
  const { fastchipsPlayerId, setParams } = useFastchipsPlayerParams();
  const isOpen = Boolean(fastchipsPlayerId);
  const player =
    fastChipsPlayers.find((item) => item.id === fastchipsPlayerId) ??
    fastChipsPlayers[0];
  const accounts = fastChipsPlayerLinkedAccounts[player?.id ?? "p-1"] ?? [];

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setParams({ fastchipsPlayerId: null });
        }
      }}
    >
      <SheetContent>
        <div className="flex items-center gap-2 border-b pb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setParams({ fastchipsPlayerId: null })}
          >
            <Icons.ArrowBack className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold text-sm">
            {t("fastchips.jogadores.linked_accounts_title")}
          </h2>
        </div>

        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center">
              <Icons.AccountCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{player?.name}</p>
              <p className="text-xs text-muted-foreground">
                {t("fastchips.jogadores.player_id")}
                {player?.playerId}
              </p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1.4fr_0.8fr_1fr_52px] gap-2 border-b bg-muted/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
              <span>{t("fastchips.jogadores.sheet_table.name")}</span>
              <span>{t("fastchips.jogadores.sheet_table.status")}</span>
              <span>{t("fastchips.jogadores.sheet_table.restriction")}</span>
              <span className="text-right">
                {t("fastchips.jogadores.sheet_table.action")}
              </span>
            </div>
            <div className="divide-y">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="grid grid-cols-[1.4fr_0.8fr_1fr_52px] gap-2 px-3 py-3 text-sm items-center"
                >
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("fastchips.jogadores.sheet_table.id_label")}
                      {account.playerId}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`border ${
                      account.status === "active"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-gray-200 text-gray-700 border-gray-300"
                    }`}
                  >
                    {account.status === "active"
                      ? t("fastchips.jogadores.status_active")
                      : t("fastchips.jogadores.status_inactive")}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`border ${
                      account.restriction === "auto_withdraw"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : "bg-amber-100 text-amber-700 border-amber-200"
                    }`}
                  >
                    {account.restriction === "auto_withdraw"
                      ? t("fastchips.jogadores.restriction_auto_withdraw")
                      : t("fastchips.jogadores.restriction_blocked")}
                  </Badge>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 border border-border text-muted-foreground"
                        >
                          <Icons.MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          {t("fastchips.jogadores.actions.reset_withdraw")}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {t("fastchips.jogadores.actions.block_withdraw")}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {t("fastchips.jogadores.actions.block_account")}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {t("fastchips.jogadores.actions.manual_withdraw")}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          {t("fastchips.jogadores.actions.customize_withdraw")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
