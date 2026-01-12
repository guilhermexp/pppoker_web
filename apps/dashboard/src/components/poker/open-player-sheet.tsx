"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useI18n } from "@/locales/client";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";

export function OpenPlayerSheet() {
  const { setParams } = usePokerPlayerParams();
  const t = useI18n();

  return (
    <Button variant="outline" onClick={() => setParams({ createPlayer: true })}>
      <Icons.Add className="mr-2 h-4 w-4" />
      {t("poker.players.create_player")}
    </Button>
  );
}
