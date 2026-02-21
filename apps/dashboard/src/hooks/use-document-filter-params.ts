import { createLoader, parseAsArrayOf, parseAsString } from "nuqs/server";
import { createFilterParamsHook } from "./create-params-hook";

export const documentFilterParamsSchema = {
  q: parseAsString,
  tags: parseAsArrayOf(parseAsString),
  start: parseAsString,
  end: parseAsString,
};

export const useDocumentFilterParams = createFilterParamsHook(
  documentFilterParamsSchema,
);

export const loadDocumentFilterParams = createLoader(
  documentFilterParamsSchema,
);
