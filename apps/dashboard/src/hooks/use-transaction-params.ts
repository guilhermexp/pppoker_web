import { parseAsBoolean, parseAsString } from "nuqs/server";
import { createParamsHook } from "./create-params-hook";

export const useTransactionParams = createParamsHook({
  transactionId: parseAsString,
  createTransaction: parseAsBoolean,
  editTransaction: parseAsString,
});
