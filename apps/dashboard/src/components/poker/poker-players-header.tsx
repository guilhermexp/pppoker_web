import { getI18n } from "@/locales/server";
import { OpenPlayerSheet } from "./open-player-sheet";
import { SearchField } from "../search-field";
import { PokerPlayerFilters } from "./poker-player-filters";

export async function PokerPlayersHeader() {
  const t = await getI18n();

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
