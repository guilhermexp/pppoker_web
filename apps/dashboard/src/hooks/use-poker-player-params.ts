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
};

type SetParamsInput = {
  playerId?: string | null;
  createPlayer?: boolean | null;
  q?: string | null;
  type?: "player" | "agent" | null;
  status?: "active" | "inactive" | "suspended" | "blacklisted" | null;
  agentId?: string | null;
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

      setParamsInternal(updates);
    }
  };

  return {
    ...params,
    // Cast to expected types
    createPlayer: params.createPlayer === "true",
    type: params.type as "player" | "agent" | null,
    status: params.status as "active" | "inactive" | "suspended" | "blacklisted" | null,
    setParams,
    hasFilters:
      params.q !== null ||
      params.type !== null ||
      params.status !== null ||
      params.agentId !== null,
  };
}

export const loadPokerPlayerFilterParams = createLoader(pokerPlayerFilterSchema);
