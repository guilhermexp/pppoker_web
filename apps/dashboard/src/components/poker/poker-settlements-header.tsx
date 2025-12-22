import { getI18n } from "@/locales/server";
import { PokerSettlementFilters } from "./poker-settlement-filters";

export async function PokerSettlementsHeader() {
  const t = await getI18n();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4 flex-1">
        <PokerSettlementFilters />
      </div>
    </div>
  );
}
