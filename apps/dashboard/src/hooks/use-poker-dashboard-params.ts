import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

// Server-side schema for dashboard params
export const pokerDashboardFilterSchema = {
  from: parseAsString,
  to: parseAsString,
};

type SetParamsInput = {
  from?: string | null;
  to?: string | null;
} | null;

export function usePokerDashboardParams() {
  const [params, setParamsInternal] = useQueryStates(
    pokerDashboardFilterSchema,
    {
      clearOnDefault: true,
    }
  );

  const setParams = (newParams: SetParamsInput) => {
    if (newParams === null) {
      // Clear all params
      setParamsInternal({
        from: null,
        to: null,
      });
    } else {
      const updates: Record<string, string | null> = {};

      if ("from" in newParams) {
        updates.from = newParams.from ?? null;
      }
      if ("to" in newParams) {
        updates.to = newParams.to ?? null;
      }

      setParamsInternal(updates);
    }
  };

  return {
    ...params,
    setParams,
    hasDateFilter: params.from !== null || params.to !== null,
  };
}

export const loadPokerDashboardFilterParams = createLoader(
  pokerDashboardFilterSchema
);
