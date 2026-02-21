import { parseAsString, parseAsStringLiteral } from "nuqs/server";
import { createNestedParamsHook } from "./create-params-hook";

export const useDocumentParams = createNestedParamsHook({
  documentId: parseAsString,
  filePath: parseAsString,
  view: parseAsStringLiteral(["grid", "list"]).withDefault("grid"),
});
