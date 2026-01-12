"use client";

import { useI18n } from "@/locales/client";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import {
  usePokerIsCustomizing,
  usePokerWidgetActions,
} from "./poker-widget-provider";

export function PokerCustomize() {
  const isCustomizing = usePokerIsCustomizing();
  const { setIsCustomizing } = usePokerWidgetActions();
  const t = useI18n();

  return (
    <Button
      variant="outline"
      size="sm"
      className="space-x-2"
      onClick={() => setIsCustomizing(!isCustomizing)}
      data-no-close
    >
      <span>
        {isCustomizing ? t("dashboard.save") : t("dashboard.customize")}
      </span>
      {isCustomizing ? (
        <Icons.Check size={16} />
      ) : (
        <Icons.DashboardCustomize size={16} />
      )}
    </Button>
  );
}
