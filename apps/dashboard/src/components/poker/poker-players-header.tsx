"use client";

import { useI18n } from "@/locales/client";
import { SearchField } from "../search-field";
import { OpenPlayerSheet } from "./open-player-sheet";
import { PokerPlayerFilters } from "./poker-player-filters";

export function PokerPlayersHeader() {
  const t = useI18n();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 flex-1">
        <SearchField placeholder={t("poker.players.search_placeholder")} />
        <PokerPlayerFilters />
      </div>

      <div className="hidden sm:block">
        <OpenPlayerSheet />
      </div>
    </div>
  );
}
