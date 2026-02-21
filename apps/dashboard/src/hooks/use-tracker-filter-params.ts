import {
  createLoader,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";
import { createFilterParamsHook } from "./create-params-hook";

export const useTrackerFilterParamsSchema = {
  q: parseAsString,
  customers: parseAsArrayOf(parseAsString),
  status: parseAsStringLiteral(["in_progress", "completed"]),
  tags: parseAsArrayOf(parseAsString),
  start: parseAsString,
  end: parseAsString,
};

export const useTrackerFilterParams = createFilterParamsHook(
  useTrackerFilterParamsSchema,
);

export const loadTrackerFilterParams = createLoader(
  useTrackerFilterParamsSchema,
);
