"use client";

import { useI18n } from "@/locales/client";
import { SearchField } from "../search-field";
import { PokerTransactionFilters } from "./poker-transaction-filters";

export function PokerTransactionsHeader() {
  const t = useI18n();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 flex-1">
        <SearchField placeholder={t("poker.transactions.search_placeholder")} />
        <PokerTransactionFilters />
      </div>
    </div>
  );
}
