import { useQueryStates } from "nuqs";
import { createLoader, parseAsString } from "nuqs/server";

export const pokerMembrosFilterSchema = {
  q: parseAsString,
  tab: parseAsString,
  memberId: parseAsString,
};

type SetParamsInput = {
  q?: string | null;
  tab?: string | null;
  memberId?: string | null;
} | null;

export function usePokerMembrosParams() {
  const [params, setParamsInternal] = useQueryStates(pokerMembrosFilterSchema, {
    clearOnDefault: true,
  });

  const setParams = (newParams: SetParamsInput) => {
    if (newParams === null) {
      setParamsInternal({
        q: null,
        tab: null,
        memberId: null,
      });
    } else {
      const updates: Record<string, string | null> = {};
      if ("q" in newParams) updates.q = newParams.q ?? null;
      if ("tab" in newParams) updates.tab = newParams.tab ?? null;
      if ("memberId" in newParams)
        updates.memberId = newParams.memberId ?? null;
      setParamsInternal(updates);
    }
  };

  return {
    q: params.q ?? "",
    tab: params.tab ?? "members",
    memberId: params.memberId,
    setParams,
    hasFilters: params.q !== null,
  };
}

export const loadPokerMembrosFilterParams = createLoader(
  pokerMembrosFilterSchema,
);
