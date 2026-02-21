import type { AnyColumn } from "drizzle-orm";
import { type SQL, sql } from "drizzle-orm";

/**
 * Build a COALESCE(json_agg(DISTINCT jsonb_build_object(...)) FILTER (WHERE ... IS NOT NULL), '[]'::json)
 * SQL expression. Reduces boilerplate in query files that need to aggregate related records as JSON arrays.
 *
 * @param fields - A record mapping JSON keys to Drizzle columns.
 *   Example: { id: tags.id, name: tags.name }
 * @param filterColumn - Column used in the FILTER (WHERE col IS NOT NULL) clause.
 *   When omitted, the first column in the fields record is used.
 * @returns A Drizzle SQL expression ready to use in select() calls.
 *
 * @example
 * ```ts
 * // Before:
 * sql`COALESCE(json_agg(DISTINCT jsonb_build_object('id', ${tags.id}, 'name', ${tags.name}))
 *   FILTER (WHERE ${tags.id} IS NOT NULL), '[]'::json)`
 *
 * // After:
 * buildJsonAggField({ id: tags.id, name: tags.name }, tags.id)
 * ```
 */
export function buildJsonAggField(
  fields: Record<string, AnyColumn>,
  filterColumn?: AnyColumn,
): SQL {
  const entries = Object.entries(fields);

  if (entries.length === 0) {
    throw new Error("buildJsonAggField requires at least one field");
  }

  // Build the jsonb_build_object arguments: 'key1', col1, 'key2', col2, ...
  const objectArgs = entries.reduce<SQL | undefined>((acc, [key, col], i) => {
    const pair = sql`${sql.raw(`'${key}'`)}, ${col}`;
    return i === 0 ? pair : sql`${acc}, ${pair}`;
  }, undefined)!;

  // Use the provided filterColumn or default to the first column
  const filterCol = filterColumn ?? entries[0]![1];

  return sql`COALESCE(json_agg(DISTINCT jsonb_build_object(${objectArgs})) FILTER (WHERE ${filterCol} IS NOT NULL), '[]'::json)`;
}
