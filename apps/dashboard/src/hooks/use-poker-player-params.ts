import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

// Server-side schema (uses parseAsString for all params)
export const pokerPlayerFilterSchema = {
  playerId: parseAsString,
  createPlayer: parseAsString,
  q: parseAsString,
  type: parseAsString,
  status: parseAsString,
  agentId: parseAsString,
  superAgentId: parseAsString,
  dateFrom: parseAsString,
  dateTo: parseAsString,
  viewAgentId: parseAsString, // For agent detail sheet
  viewSuperAgentId: parseAsString, // For super agent detail sheet
  // Simple boolean filters
  hasCreditLimit: parseAsString, // "true" or null
  hasRake: parseAsString, // "true" or null
  hasBalance: parseAsString, // "true" or null
  hasAgent: parseAsString, // "true" or null
};

type SetParamsInput = {
  playerId?: string | null;
  createPlayer?: boolean | null;
  q?: string | null;
  type?: "player" | "agent" | null;
  status?: "active" | "inactive" | "suspended" | "blacklisted" | null;
  agentId?: string | null;
  superAgentId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  viewAgentId?: string | null;
  viewSuperAgentId?: string | null;
  // Simple boolean filters
  hasCreditLimit?: boolean | null;
  hasRake?: boolean | null;
  hasBalance?: boolean | null;
  hasAgent?: boolean | null;
} | null;

export function usePokerPlayerParams() {
  const [params, setParamsInternal] = useQueryStates(pokerPlayerFilterSchema, {
    clearOnDefault: true,
  });

  const setParams = (newParams: SetParamsInput) => {
    if (newParams === null) {
      // Clear all params
      setParamsInternal({
        playerId: null,
        createPlayer: null,
        q: null,
        type: null,
        status: null,
        agentId: null,
        superAgentId: null,
        dateFrom: null,
        dateTo: null,
        viewAgentId: null,
        viewSuperAgentId: null,
        hasCreditLimit: null,
        hasRake: null,
        hasBalance: null,
        hasAgent: null,
      });
    } else {
      // Only update the keys that are explicitly provided
      const updates: Record<string, string | null> = {};

      if ("playerId" in newParams) {
        updates.playerId = newParams.playerId ?? null;
      }
      if ("createPlayer" in newParams) {
        updates.createPlayer = newParams.createPlayer ? "true" : null;
      }
      if ("q" in newParams) {
        updates.q = newParams.q ?? null;
      }
      if ("type" in newParams) {
        updates.type = newParams.type ?? null;
      }
      if ("status" in newParams) {
        updates.status = newParams.status ?? null;
      }
      if ("agentId" in newParams) {
        updates.agentId = newParams.agentId ?? null;
      }
      if ("superAgentId" in newParams) {
        updates.superAgentId = newParams.superAgentId ?? null;
      }
      if ("dateFrom" in newParams) {
        updates.dateFrom = newParams.dateFrom ?? null;
      }
      if ("dateTo" in newParams) {
        updates.dateTo = newParams.dateTo ?? null;
      }
      if ("viewAgentId" in newParams) {
        updates.viewAgentId = newParams.viewAgentId ?? null;
      }
      if ("viewSuperAgentId" in newParams) {
        updates.viewSuperAgentId = newParams.viewSuperAgentId ?? null;
      }
      if ("hasCreditLimit" in newParams) {
        updates.hasCreditLimit = newParams.hasCreditLimit ? "true" : null;
      }
      if ("hasRake" in newParams) {
        updates.hasRake = newParams.hasRake ? "true" : null;
      }
      if ("hasBalance" in newParams) {
        updates.hasBalance = newParams.hasBalance ? "true" : null;
      }
      if ("hasAgent" in newParams) {
        updates.hasAgent = newParams.hasAgent ? "true" : null;
      }

      setParamsInternal(updates);
    }
  };

  return {
    ...params,
    // Cast to expected types
    createPlayer: params.createPlayer === "true",
    type: params.type as "player" | "agent" | null,
    status: params.status as "active" | "inactive" | "suspended" | "blacklisted" | null,
    hasCreditLimit: params.hasCreditLimit === "true",
    hasRake: params.hasRake === "true",
    hasBalance: params.hasBalance === "true",
    hasAgent: params.hasAgent === "true",
    setParams,
    hasFilters:
      params.q !== null ||
      params.type !== null ||
      params.status !== null ||
      params.agentId !== null ||
      params.hasCreditLimit !== null ||
      params.hasRake !== null ||
      params.hasBalance !== null ||
      params.hasAgent !== null,
    hasDateFilter: params.dateFrom !== null || params.dateTo !== null,
  };
}

export const loadPokerPlayerFilterParams = createLoader(pokerPlayerFilterSchema);
