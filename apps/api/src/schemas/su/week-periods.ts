import { z } from "@hono/zod-openapi";

export const getCloseWeekDataInput = z.object({
  weekPeriodId: z.string().uuid().optional(),
});

export const closeWeekPeriodInput = z.object({
  weekPeriodId: z.string().uuid().optional(),
});

export const listWeekPeriodsInput = z
  .object({
    status: z.enum(["open", "closed"]).optional(),
    limit: z.number().min(1).max(100).optional(),
    offset: z.number().min(0).optional(),
  })
  .optional();
