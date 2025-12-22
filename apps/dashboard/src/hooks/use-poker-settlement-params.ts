import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

export const pokerSettlementFilterSchema = {
  settlementId: parseAsString,
  status: parseAsString,
  playerId: parseAsString,
  agentId: parseAsString,
  periodStart: parseAsString,
  periodEnd: parseAsString,
};

type SetParamsInput = {
  settlementId?: string | null;
  status?: "pending" | "partial" | "completed" | "disputed" | "cancelled" | null;
  playerId?: string | null;
  agentId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
} | null;

export function usePokerSettlementParams() {
  const [params, setParamsInternal] = useQueryStates(pokerSettlementFilterSchema, {
    clearOnDefault: true,
  });

  const setParams = (newParams: SetParamsInput) => {
    if (newParams === null) {
      setParamsInternal({
        settlementId: null,
        status: null,
        playerId: null,
        agentId: null,
        periodStart: null,
        periodEnd: null,
      });
    } else {
      const updates: Record<string, string | null> = {};

      if ("settlementId" in newParams) updates.settlementId = newParams.settlementId ?? null;
      if ("status" in newParams) updates.status = newParams.status ?? null;
      if ("playerId" in newParams) updates.playerId = newParams.playerId ?? null;
      if ("agentId" in newParams) updates.agentId = newParams.agentId ?? null;
      if ("periodStart" in newParams) updates.periodStart = newParams.periodStart ?? null;
      if ("periodEnd" in newParams) updates.periodEnd = newParams.periodEnd ?? null;

      setParamsInternal(updates);
    }
  };

  return {
    ...params,
    status: params.status as "pending" | "partial" | "completed" | "disputed" | "cancelled" | null,
    setParams,
    hasFilters:
      params.status !== null ||
      params.playerId !== null ||
      params.agentId !== null ||
      params.periodStart !== null ||
      params.periodEnd !== null,
  };
}

export const loadPokerSettlementFilterParams = createLoader(pokerSettlementFilterSchema);
