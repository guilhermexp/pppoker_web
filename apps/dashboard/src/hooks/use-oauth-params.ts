import { createLoader, parseAsString } from "nuqs/server";
import { createParamsHook } from "./create-params-hook";

export const oauthParamsSchema = {
  response_type: parseAsString,
  client_id: parseAsString,
  redirect_uri: parseAsString,
  scope: parseAsString,
  state: parseAsString,
  code_challenge: parseAsString,
};

export const useOAuthParams = createParamsHook(oauthParamsSchema);

export const loadOAuthParams = createLoader(oauthParamsSchema);
