import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server";
import { createFilterParamsHook } from "./create-params-hook";

export const customerFilterParamsSchema = {
  q: parseAsString,
  sort: parseAsArrayOf(parseAsString),
  start: parseAsString,
  end: parseAsString,
};

export const useCustomerFilterParams = createFilterParamsHook(
  customerFilterParamsSchema,
);

export const loadCustomerFilterParams = createLoader(
  customerFilterParamsSchema,
);
