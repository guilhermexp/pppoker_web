import { parseAsBoolean, parseAsString } from "nuqs";
import { createParamsHook } from "./create-params-hook";

export const useOAuthApplicationParams = createParamsHook({
  applicationId: parseAsString,
  createApplication: parseAsBoolean,
  editApplication: parseAsBoolean,
});
