import { and, inArray } from "drizzle-orm";
import type { Database } from "../client";
import { exchangeRates } from "../schema";

export type GetExchangeRatesBatchParams = {
  pairs: Array<{ base: string; target: string }>;
};

export async function getExchangeRatesBatch(
  db: Database,
  params: GetExchangeRatesBatchParams,
) {
  const { pairs } = params;

  if (pairs.length === 0) {
    return new Map<string, number>();
  }

  // Extract unique base and target currencies
  const baseCurrencies = [...new Set(pairs.map((p) => p.base))];
  const targetCurrencies = [...new Set(pairs.map((p) => p.target))];

  // Fetch all exchange rates in one query
  // Filter to only the exact pairs we need
  const results = await db
    .select({
      base: exchangeRates.base,
      target: exchangeRates.target,
      rate: exchangeRates.rate,
    })
    .from(exchangeRates)
    .where(
      and(
        inArray(exchangeRates.base, baseCurrencies),
        inArray(exchangeRates.target, targetCurrencies),
      ),
    );

  // Filter results to only include exact pairs we requested
  const pairSet = new Set(pairs.map((p) => `${p.base}-${p.target}`));

  // Build a map for O(1) lookup, only including requested pairs
  const rateMap = new Map<string, number>();
  for (const result of results) {
    if (result.base && result.target && result.rate) {
      const key = `${result.base}-${result.target}`;
      if (pairSet.has(key)) {
        rateMap.set(key, Number(result.rate));
      }
    }
  }

  return rateMap;
}
