import { useQueryStates } from "nuqs";
import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server";

// View mode type
export type SUViewMode = "current_week" | "historical";

// Server-side schema for dashboard params
export const suDashboardFilterSchema = {
  from: parseAsString,
  to: parseAsString,
  viewMode: parseAsStringLiteral(["current_week", "historical"] as const),
  weekPeriodId: parseAsString,
};

type SetParamsInput = {
  from?: string | null;
  to?: string | null;
  viewMode?: SUViewMode | null;
  weekPeriodId?: string | null;
} | null;

export function useSUDashboardParams() {
  const [params, setParamsInternal] = useQueryStates(suDashboardFilterSchema, {
    clearOnDefault: true,
  });

  const setParams = (newParams: SetParamsInput) => {
    if (newParams === null) {
      // Clear all params
      setParamsInternal({
        from: null,
        to: null,
        viewMode: null,
        weekPeriodId: null,
      });
    } else {
      const updates: Record<string, string | null> = {};

      if ("from" in newParams) {
        updates.from = newParams.from ?? null;
      }
      if ("to" in newParams) {
        updates.to = newParams.to ?? null;
      }
      if ("viewMode" in newParams) {
        updates.viewMode = newParams.viewMode ?? null;
      }
      if ("weekPeriodId" in newParams) {
        updates.weekPeriodId = newParams.weekPeriodId ?? null;
      }

      setParamsInternal(updates);
    }
  };

  // Helper to switch view mode
  const setViewMode = (mode: SUViewMode) => {
    if (mode === "current_week") {
      // Clear date filters when switching to current week
      setParamsInternal({
        viewMode: "current_week",
        from: null,
        to: null,
        weekPeriodId: null,
      });
    } else {
      setParamsInternal({
        viewMode: "historical",
      });
    }
  };

  // Default to current_week if no viewMode is set
  const viewMode: SUViewMode =
    (params.viewMode as SUViewMode) ?? "current_week";

  return {
    ...params,
    viewMode,
    setParams,
    setViewMode,
    hasDateFilter: params.from !== null || params.to !== null,
    isCurrentWeekView: viewMode === "current_week",
  };
}

export const loadSUDashboardFilterParams = createLoader(
  suDashboardFilterSchema,
);
