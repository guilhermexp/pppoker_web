import { parseAsString } from "nuqs/server";
import { createParamsHook } from "./create-params-hook";

export const useFastchipsLinkedAccountParams = createParamsHook({
  fastchipsLinkedAccountId: parseAsString,
});
