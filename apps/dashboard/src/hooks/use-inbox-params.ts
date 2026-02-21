import {
  createLoader,
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { createNestedParamsHook } from "./create-params-hook";

export const inboxParamsSchema = {
  inboxId: parseAsString,
  type: parseAsStringLiteral(["list", "details"]),
  order: parseAsStringLiteral(["asc", "desc"]).withDefault("asc"),
  sort: parseAsStringLiteral(["date", "alphabetical"]).withDefault("date"),
  connected: parseAsBoolean,
};

export const useInboxParams = createNestedParamsHook(inboxParamsSchema);

export const loadInboxParams = createLoader(inboxParamsSchema);
