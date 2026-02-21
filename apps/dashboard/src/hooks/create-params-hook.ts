import { type Options, type UseQueryStatesKeysMap, useQueryStates } from "nuqs";

/**
 * Factory to create a simple URL params hook that spreads params at the top level.
 *
 * Returns `{ ...params, setParams }` from `useQueryStates(config)`.
 *
 * @example
 * export const useProductParams = createParamsHook({
 *   productId: parseAsString,
 *   createProduct: parseAsBoolean,
 * });
 * // Usage: const { productId, createProduct, setParams } = useProductParams();
 */
export function createParamsHook<T extends UseQueryStatesKeysMap>(config: T) {
  return function useParams() {
    const [params, setParams] = useQueryStates(config);

    return {
      ...params,
      setParams,
    };
  };
}

/**
 * Factory to create a URL params hook that returns params nested under a key.
 *
 * Returns `{ params, setParams }`.
 *
 * @example
 * export const useDocumentParams = createNestedParamsHook({
 *   documentId: parseAsString,
 *   view: parseAsStringLiteral(["grid", "list"]).withDefault("grid"),
 * });
 * // Usage: const { params, setParams } = useDocumentParams();
 */
export function createNestedParamsHook<T extends UseQueryStatesKeysMap>(
  config: T,
  options?: Options,
) {
  return function useParams() {
    const [params, setParams] = useQueryStates(config, options);

    return {
      params,
      setParams,
    };
  };
}

/**
 * Factory to create a URL params hook for filter patterns.
 *
 * Returns `{ filter, setFilter, hasFilters }` where `hasFilters` is true
 * when any filter value is non-null.
 *
 * @example
 * export const useCustomerFilterParams = createFilterParamsHook({
 *   q: parseAsString,
 *   sort: parseAsArrayOf(parseAsString),
 * });
 * // Usage: const { filter, setFilter, hasFilters } = useCustomerFilterParams();
 */
export function createFilterParamsHook<T extends UseQueryStatesKeysMap>(
  config: T,
  options?: Options,
) {
  return function useFilterParams() {
    const [filter, setFilter] = useQueryStates(config, options);

    return {
      filter,
      setFilter,
      hasFilters: Object.values(filter).some((value) => value !== null),
    };
  };
}
