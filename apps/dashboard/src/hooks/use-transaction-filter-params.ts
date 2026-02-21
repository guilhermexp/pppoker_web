import {
  createLoader,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { createFilterParamsHook } from "./create-params-hook";

export const transactionFilterParamsSchema = {
  q: parseAsString,
  attachments: parseAsStringLiteral(["exclude", "include"] as const),
  start: parseAsString,
  end: parseAsString,
  categories: parseAsArrayOf(parseAsString),
  tags: parseAsArrayOf(parseAsString),
  accounts: parseAsArrayOf(parseAsString),
  assignees: parseAsArrayOf(parseAsString),
  amount_range: parseAsArrayOf(parseAsInteger),
  amount: parseAsArrayOf(parseAsString),
  recurring: parseAsArrayOf(
    parseAsStringLiteral(["all", "weekly", "monthly", "annually"] as const),
  ),
  statuses: parseAsArrayOf(
    parseAsStringLiteral([
      "completed",
      "uncompleted",
      "archived",
      "excluded",
    ] as const),
  ),
  manual: parseAsStringLiteral(["exclude", "include"] as const),
};

export const useTransactionFilterParams = createFilterParamsHook(
  transactionFilterParamsSchema,
  { clearOnDefault: true },
);

export const loadTransactionFilterParams = createLoader(
  transactionFilterParamsSchema,
);
