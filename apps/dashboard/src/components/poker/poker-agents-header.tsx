import { getI18n } from "@/locales/server";
import { OpenAgentSheet } from "./open-agent-sheet";
import { SearchField } from "../search-field";
import { PokerAgentFilters } from "./poker-agent-filters";

export async function PokerAgentsHeader() {
  const t = await getI18n();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 flex-1">
        <SearchField placeholder={t("poker.agents.search_placeholder")} />
        <PokerAgentFilters />
      </div>

      <div className="hidden sm:block">
        <OpenAgentSheet />
      </div>
    </div>
  );
}
