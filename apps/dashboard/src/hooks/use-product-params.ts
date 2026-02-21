import { parseAsBoolean, parseAsString } from "nuqs";
import { createParamsHook } from "./create-params-hook";

export const useProductParams = createParamsHook({
  productId: parseAsString,
  createProduct: parseAsBoolean,
  name: parseAsString,
  q: parseAsString,
});
