import { z } from "@hono/zod-openapi";

// =============================================================================
// ENUMS
// =============================================================================

export const pokerSessionTypeSchema = z.enum([
  "cash_game",
  "mtt",
  "sit_n_go",
  "spin",
]);

export const pokerGameVariantSchema = z.enum([
  "nlh",
  "nlh_6plus",
  "nlh_aof",
  "plo4",
  "plo5",
  "plo6",
  "plo4_hilo",
  "plo5_hilo",
  "plo6_hilo",
  "ofc",
  "mixed",
  "other",
]);

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

export const getPokerSessionsSchema = z.object({
  cursor: z
    .string()
    .nullable()
    .optional()
    .openapi({
      description: "Cursor for pagination (page number as string)",
      example: "1",
    }),
  pageSize: z.coerce
    .number()
    .min(1)
    .max(1000)
    .optional()
    .openapi({
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
      example: ["started_at", "desc"],
    }),
  q: z
    .string()
    .nullable()
    .optional()
    .openapi({
      description: "Search query for table name or external ID",
    }),
  sessionType: pokerSessionTypeSchema
    .nullable()
    .optional()
    .openapi({
      description: "Filter by session type",
    }),
  gameVariant: pokerGameVariantSchema
    .nullable()
    .optional()
    .openapi({
      description: "Filter by game variant",
    }),
  dateFrom: z
    .string()
    .nullable()
    .optional()
    .openapi({
      description: "Filter sessions from this date (ISO string)",
    }),
  dateTo: z
    .string()
    .nullable()
    .optional()
    .openapi({
      description: "Filter sessions until this date (ISO string)",
    }),
  includeDraft: z
    .boolean()
    .optional()
    .openapi({
      description:
        "Include draft (non-committed) data. Default is false (only committed data shown).",
    }),
});

export const getPokerSessionByIdSchema = z.object({
  id: z.string().uuid().openapi({
    description: "Session ID",
  }),
});

export const upsertPokerSessionSchema = z.object({
  id: z.string().uuid().optional().openapi({
    description: "Session ID (required for update, omit for create)",
  }),
  externalId: z.string().nullable().optional().openapi({
    description: "External game ID from PPPoker",
  }),
  tableName: z.string().nullable().optional().openapi({
    description: "Table name",
  }),
  sessionType: pokerSessionTypeSchema.optional().openapi({
    description: "Session type",
  }),
  gameVariant: pokerGameVariantSchema.optional().openapi({
    description: "Game variant",
  }),
  startedAt: z.string().openapi({
    description: "Session start time (ISO string)",
  }),
  endedAt: z.string().nullable().optional().openapi({
    description: "Session end time (ISO string)",
  }),
  blinds: z.string().nullable().optional().openapi({
    description: "Blinds level (e.g., '1/2', '2/5')",
  }),
  buyInAmount: z.number().nullable().optional().openapi({
    description: "Buy-in amount",
  }),
  guaranteedPrize: z.number().nullable().optional().openapi({
    description: "Guaranteed prize pool (for tournaments)",
  }),
  totalRake: z.number().nullable().optional().openapi({
    description: "Total rake collected",
  }),
  totalBuyIn: z.number().nullable().optional().openapi({
    description: "Total buy-ins",
  }),
  totalCashOut: z.number().nullable().optional().openapi({
    description: "Total cash-outs",
  }),
  playerCount: z.number().nullable().optional().openapi({
    description: "Number of players",
  }),
  handsPlayed: z.number().nullable().optional().openapi({
    description: "Number of hands played",
  }),
  createdById: z.string().uuid().nullable().optional().openapi({
    description: "Creator player ID",
  }),
  rawData: z.any().nullable().optional().openapi({
    description: "Raw JSON data from import",
  }),
});

export const deletePokerSessionSchema = z.object({
  id: z.string().uuid().openapi({
    description: "Session ID to delete",
  }),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type GetPokerSessionsInput = z.infer<typeof getPokerSessionsSchema>;
export type GetPokerSessionByIdInput = z.infer<typeof getPokerSessionByIdSchema>;
export type UpsertPokerSessionInput = z.infer<typeof upsertPokerSessionSchema>;
export type DeletePokerSessionInput = z.infer<typeof deletePokerSessionSchema>;
