import { useQueryStates } from "nuqs";
import { parseAsString } from "nuqs/server";

export function useFastchipsPlayerParams() {
  const [params, setParams] = useQueryStates({
    fastchipsPlayerId: parseAsString,
  });

  return {
    ...params,
    setParams,
  };
}
