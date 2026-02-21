import { parseAsBoolean, parseAsString } from "nuqs";
import { createParamsHook } from "./create-params-hook";

export const useCustomerParams = createParamsHook({
  customerId: parseAsString,
  createCustomer: parseAsBoolean,
  name: parseAsString,
  q: parseAsString,
});
