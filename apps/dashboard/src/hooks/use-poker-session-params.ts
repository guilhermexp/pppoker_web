import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

// Server-side schema (uses parseAsString for all params)
export const pokerSessionFilterSchema = {
  sessionId: parseAsString,
  q: parseAsString,
  sessionType: parseAsString,
  gameVariant: parseAsString,
  dateFrom: parseAsString,
  dateTo: parseAsString,
};

type SetParamsInput = {
  sessionId?: string | null;
  q?: string | null;
  sessionType?: "cash_game" | "mtt" | "sit_n_go" | "spin" | null;
  gameVariant?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
} | null;

export function usePokerSessionParams() {
  const [params, setParamsInternal] = useQueryStates(pokerSessionFilterSchema, {
    clearOnDefault: true,
  });

  const setParams = (newParams: SetParamsInput) => {
    if (newParams === null) {
      // Clear all params
      setParamsInternal({
        sessionId: null,
        q: null,
        sessionType: null,
        gameVariant: null,
        dateFrom: null,
        dateTo: null,
      });
    } else {
      // Only update the keys that are explicitly provided
      const updates: Record<string, string | null> = {};

      if ("sessionId" in newParams) {
        updates.sessionId = newParams.sessionId ?? null;
      }
      if ("q" in newParams) {
        updates.q = newParams.q ?? null;
      }
      if ("sessionType" in newParams) {
        updates.sessionType = newParams.sessionType ?? null;
      }
      if ("gameVariant" in newParams) {
        updates.gameVariant = newParams.gameVariant ?? null;
      }
      if ("dateFrom" in newParams) {
        updates.dateFrom = newParams.dateFrom ?? null;
      }
      if ("dateTo" in newParams) {
        updates.dateTo = newParams.dateTo ?? null;
      }

      setParamsInternal(updates);
    }
  };

  return {
    ...params,
    // Cast to expected types
    sessionType: params.sessionType as
      | "cash_game"
      | "mtt"
      | "sit_n_go"
      | "spin"
      | null,
    setParams,
    hasFilters:
      params.q !== null ||
      params.sessionType !== null ||
      params.gameVariant !== null ||
      params.dateFrom !== null ||
      params.dateTo !== null,
  };
}

export const loadPokerSessionFilterParams = createLoader(
  pokerSessionFilterSchema,
);
