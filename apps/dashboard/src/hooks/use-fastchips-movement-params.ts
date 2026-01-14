import { useQueryStates } from "nuqs";
import { parseAsString } from "nuqs/server";

export function useFastchipsMovementParams() {
  const [params, setParams] = useQueryStates({
    fastchipsMovementId: parseAsString,
  });

  return {
    ...params,
    setParams,
  };
}
