"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useI18n } from "@/locales/client";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { Sheet, SheetContent, SheetHeader } from "@midpoker/ui/sheet";
import { PokerPlayerForm } from "../forms/poker-player-form";

export function PokerPlayerCreateSheet() {
  const t = useI18n();
  const { setParams, createPlayer } = usePokerPlayerParams();

  const isOpen = Boolean(createPlayer);

  return (
    <Sheet open={isOpen} onOpenChange={() => setParams(null)}>
      <SheetContent stack>
        <SheetHeader className="mb-6 flex justify-between items-center flex-row">
          <h2 className="text-xl">{t("poker.players.form.title_create")}</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setParams(null)}
            className="p-0 m-0 size-auto hover:bg-transparent"
          >
            <Icons.Close className="size-5" />
          </Button>
        </SheetHeader>

        <PokerPlayerForm />
      </SheetContent>
    </Sheet>
  );
}
