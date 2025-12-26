import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

// Server-side schema (uses parseAsString for all params)
export const pokerTransactionFilterSchema = {
  transactionId: parseAsString,
  q: parseAsString,
  type: parseAsString,
  playerId: parseAsString,
  sessionId: parseAsString,
  clubId: parseAsString,
  dateFrom: parseAsString,
  dateTo: parseAsString,
};

type TransactionType =
  | "buy_in"
  | "cash_out"
  | "credit_given"
  | "credit_received"
  | "credit_paid"
  | "rake"
  | "agent_commission"
  | "rakeback"
  | "jackpot"
  | "adjustment"
  | "transfer_in"
  | "transfer_out";

type SetParamsInput = {
  transactionId?: string | null;
  q?: string | null;
  type?: TransactionType | null;
  playerId?: string | null;
  sessionId?: string | null;
  clubId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
} | null;

export function usePokerTransactionParams() {
  const [params, setParamsInternal] = useQueryStates(pokerTransactionFilterSchema, {
    clearOnDefault: true,
  });

  const setParams = (newParams: SetParamsInput) => {
    if (newParams === null) {
      // Clear all params
      setParamsInternal({
        transactionId: null,
        q: null,
        type: null,
        playerId: null,
        sessionId: null,
        clubId: null,
        dateFrom: null,
        dateTo: null,
      });
    } else {
      // Only update the keys that are explicitly provided
      const updates: Record<string, string | null> = {};

      if ("transactionId" in newParams) {
        updates.transactionId = newParams.transactionId ?? null;
      }
      if ("q" in newParams) {
        updates.q = newParams.q ?? null;
      }
      if ("type" in newParams) {
        updates.type = newParams.type ?? null;
      }
      if ("playerId" in newParams) {
        updates.playerId = newParams.playerId ?? null;
      }
      if ("sessionId" in newParams) {
        updates.sessionId = newParams.sessionId ?? null;
      }
      if ("clubId" in newParams) {
        updates.clubId = newParams.clubId ?? null;
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
    type: params.type as TransactionType | null,
    setParams,
    hasFilters:
      params.q !== null ||
      params.type !== null ||
      params.playerId !== null ||
      params.sessionId !== null ||
      params.clubId !== null ||
      params.dateFrom !== null ||
      params.dateTo !== null,
  };
}

export const loadPokerTransactionFilterParams = createLoader(pokerTransactionFilterSchema);
