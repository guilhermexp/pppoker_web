import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server";
import { createParamsHook } from "./create-params-hook";

const invoiceParamsSchema = {
  selectedCustomerId: parseAsString,
  type: parseAsStringEnum(["edit", "create", "details", "success"]),
  invoiceId: parseAsString,
};

export const useInvoiceParams = createParamsHook(invoiceParamsSchema);

export const loadInvoiceParams = createLoader(invoiceParamsSchema);
