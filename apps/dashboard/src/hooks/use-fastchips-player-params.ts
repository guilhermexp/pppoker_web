import { parseAsString } from "nuqs/server";
import { createParamsHook } from "./create-params-hook";

export const useFastchipsPlayerParams = createParamsHook({
  fastchipsPlayerId: parseAsString,
});
