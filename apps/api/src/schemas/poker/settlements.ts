import { z } from "@hono/zod-openapi";

// =============================================================================
// ENUMS
// =============================================================================

export const pokerSettlementStatusSchema = z.enum([
  "pending",
  "partial",
  "completed",
  "disputed",
  "cancelled",
]);

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

export const getPokerSettlementsSchema = z.object({
  cursor: z.string().nullable().optional().openapi({
    description: "Cursor for pagination (page number as string)",
  }),
  pageSize: z.coerce.number().min(1).max(1000).optional().openapi({
    description: "Number of items per page",
  }),
  sort: z.array(z.string().min(1)).max(2).min(2).nullable().optional(),
  status: pokerSettlementStatusSchema.nullable().optional(),
  playerId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  periodStart: z.string().nullable().optional(),
  periodEnd: z.string().nullable().optional(),
});

export const getPokerSettlementByIdSchema = z.object({
  id: z.string().uuid(),
});

export const createPokerSettlementSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  playerId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  grossAmount: z.number(),
  rakebackAmount: z.number().optional(),
  commissionAmount: z.number().optional(),
  adjustmentAmount: z.number().optional(),
  netAmount: z.number(),
  note: z.string().nullable().optional(),
});

export const updatePokerSettlementStatusSchema = z.object({
  id: z.string().uuid(),
  status: pokerSettlementStatusSchema,
});

export const markSettlementPaidSchema = z.object({
  id: z.string().uuid(),
  paidAmount: z.number(),
  paidAt: z.string().optional(),
});

export const deletePokerSettlementSchema = z.object({
  id: z.string().uuid(),
});

export const closeWeekSettlementSchema = z
  .object({
    periodStart: z.string().optional(),
    periodEnd: z.string().optional(),
    note: z.string().optional(),
  })
  .optional();

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type GetPokerSettlementsInput = z.infer<
  typeof getPokerSettlementsSchema
>;
export type CreatePokerSettlementInput = z.infer<
  typeof createPokerSettlementSchema
>;
