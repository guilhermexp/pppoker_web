"use client";

import { useI18n } from "@/locales/client";
import { SearchField } from "../search-field";
import { PokerSessionFilters } from "./poker-session-filters";

export function PokerSessionsHeader() {
  const t = useI18n();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 flex-1">
        <SearchField placeholder={t("poker.sessions.search_placeholder")} />
        <PokerSessionFilters />
      </div>
    </div>
  );
}
