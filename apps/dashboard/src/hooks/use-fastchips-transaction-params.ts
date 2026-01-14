import { useQueryStates } from "nuqs";
import { parseAsString } from "nuqs/server";

export function useFastchipsTransactionParams() {
  const [params, setParams] = useQueryStates({
    fastchipsTransactionId: parseAsString,
  });

  return {
    ...params,
    setParams,
  };
}
