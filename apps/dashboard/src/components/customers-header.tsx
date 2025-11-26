import { getI18n } from "@/locales/server";
import { OpenCustomerSheet } from "./open-customer-sheet";
import { SearchField } from "./search-field";

export async function CustomersHeader() {
  const t = await getI18n();

  return (
    <div className="flex items-center justify-between">
      <SearchField placeholder={t("customers.search_customers")} />

      <div className="hidden sm:block">
        <OpenCustomerSheet />
      </div>
    </div>
  );
}
