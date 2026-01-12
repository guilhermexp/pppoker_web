"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useI18n } from "@/locales/client";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";

export function OpenAgentSheet() {
  const t = useI18n();
  const { setParams } = usePokerPlayerParams();

  return (
    <Button onClick={() => setParams({ createPlayer: true })}>
      <Icons.Add className="mr-2 h-4 w-4" />
      {t("poker.agents.create_agent")}
    </Button>
  );
}
