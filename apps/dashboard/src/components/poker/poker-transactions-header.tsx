import { getI18n } from "@/locales/server";
import { SearchField } from "../search-field";
import { PokerTransactionFilters } from "./poker-transaction-filters";

export async function PokerTransactionsHeader() {
  const t = await getI18n();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 flex-1">
        <SearchField placeholder="Buscar transações..." />
        <PokerTransactionFilters />
      </div>
    </div>
  );
}
