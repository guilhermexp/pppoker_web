import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server";
import { createFilterParamsHook } from "./create-params-hook";

const invoiceFilterParamsSchema = {
  q: parseAsString,
  statuses: parseAsArrayOf(parseAsString),
  customers: parseAsArrayOf(parseAsString),
  start: parseAsString,
  end: parseAsString,
};

export const useInvoiceFilterParams = createFilterParamsHook(
  invoiceFilterParamsSchema,
);

export const loadInvoiceFilterParams = createLoader(invoiceFilterParamsSchema);
