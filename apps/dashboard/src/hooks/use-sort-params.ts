import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server";
import { createNestedParamsHook } from "./create-params-hook";

export const sortParamsSchema = {
  sort: parseAsArrayOf(parseAsString),
};

export const useSortParams = createNestedParamsHook(sortParamsSchema);

export const loadSortParams = createLoader(sortParamsSchema);
