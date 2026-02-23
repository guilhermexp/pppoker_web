"use client";

import { useI18n } from "@/locales/client";
import { SearchField } from "../search-field";
import { OpenAgentSheet } from "./open-agent-sheet";
import { PokerAgentFilters } from "./poker-agent-filters";

export function PokerAgentsHeader() {
  const t = useI18n();

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
