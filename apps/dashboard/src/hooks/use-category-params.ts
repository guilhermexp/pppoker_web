import { parseAsBoolean, parseAsString } from "nuqs";
import { createParamsHook } from "./create-params-hook";

export const useCategoryParams = createParamsHook({
  categoryId: parseAsString,
  createCategory: parseAsBoolean,
  name: parseAsString,
  q: parseAsString,
});
