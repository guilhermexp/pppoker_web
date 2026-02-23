import { z } from "@hono/zod-openapi";

// =============================================================================
// ENUMS
// =============================================================================

export const pokerTransactionTypeSchema = z.enum([
  "buy_in",
  "cash_out",
  "credit_given",
  "credit_received",
  "credit_paid",
  "rake",
  "agent_commission",
  "rakeback",
  "jackpot",
  "adjustment",
  "transfer_in",
  "transfer_out",
]);

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

export const getPokerTransactionsSchema = z.object({
  cursor: z.string().nullable().optional().openapi({
    description: "Cursor for pagination (page number as string)",
    example: "1",
  }),
  pageSize: z.coerce.number().min(1).max(1000).optional().openapi({
    description: "Number of items per page",
    example: 50,
  }),
  sort: z
    .array(z.string().min(1))
    .max(2)
    .min(2)
    .nullable()
    .optional()
    .openapi({
      description: "Sort by [column, direction]",
      example: ["occurred_at", "desc"],
    }),
  q: z.string().nullable().optional().openapi({
    description: "Search query for player nickname or memo",
  }),
  type: pokerTransactionTypeSchema.nullable().optional().openapi({
    description: "Filter by transaction type",
  }),
  playerId: z.string().uuid().nullable().optional().openapi({
    description: "Filter by player ID (sender or recipient)",
  }),
  sessionId: z.string().uuid().nullable().optional().openapi({
    description: "Filter by session ID",
  }),
  clubId: z.string().nullable().optional().openapi({
    description: "Filter by club ID",
  }),
  dateFrom: z.string().nullable().optional().openapi({
    description: "Filter transactions from this date (ISO string)",
  }),
  dateTo: z.string().nullable().optional().openapi({
    description: "Filter transactions until this date (ISO string)",
  }),
  amountMin: z.number().nullable().optional().openapi({
    description: "Minimum transaction amount",
  }),
  amountMax: z.number().nullable().optional().openapi({
    description: "Maximum transaction amount",
  }),
  includeDraft: z.boolean().optional().openapi({
    description:
      "Include draft (non-committed) data. Default is false (only committed data shown).",
  }),
});

export const getPokerTransactionByIdSchema = z.object({
  id: z.string().uuid().openapi({
    description: "Transaction ID",
  }),
});

export const deletePokerTransactionSchema = z.object({
  id: z.string().uuid().openapi({
    description: "Transaction ID to delete",
  }),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PokerTransactionType = z.infer<typeof pokerTransactionTypeSchema>;
export type GetPokerTransactionsInput = z.infer<
  typeof getPokerTransactionsSchema
>;
export type GetPokerTransactionByIdInput = z.infer<
  typeof getPokerTransactionByIdSchema
>;
export type DeletePokerTransactionInput = z.infer<
  typeof deletePokerTransactionSchema
>;
