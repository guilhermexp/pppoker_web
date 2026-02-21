import { z } from "@hono/zod-openapi";

export const listSettlementsInput = z
  .object({
    status: z
      .enum(["pending", "partial", "completed", "disputed", "cancelled"])
      .optional(),
    weekPeriodId: z.string().uuid().optional(),
    ligaId: z.number().optional(),
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
  })
  .optional();

export const getSettlementByIdInput = z.object({
  id: z.string().uuid(),
});

export const getSettlementsByPeriodInput = z.object({
  weekPeriodId: z.string().uuid(),
});

export const updateSettlementInput = z.object({
  id: z.string().uuid(),
  adjustmentAmount: z.number().optional(),
  paidAmount: z.number().optional(),
  status: z
    .enum(["pending", "partial", "completed", "disputed", "cancelled"])
    .optional(),
  note: z.string().optional(),
});

export const markSettlementCompletedInput = z.object({
  id: z.string().uuid(),
});

export const getSettlementStatsInput = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .optional();
