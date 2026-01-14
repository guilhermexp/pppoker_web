import { useQueryStates } from "nuqs";
import { parseAsString } from "nuqs/server";

export function useFastchipsLinkedAccountParams() {
  const [params, setParams] = useQueryStates({
    fastchipsLinkedAccountId: parseAsString,
  });

  return {
    ...params,
    setParams,
  };
}
