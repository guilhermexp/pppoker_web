import { z } from "@hono/zod-openapi";

export const dashboardStatsInput = z
  .object({
    from: z.string().optional(),
    to: z.string().optional(),
    viewMode: z.enum(["current_week", "historical"]).optional(),
  })
  .optional();

export const getRealizedTournamentsInput = z
  .object({
    weekNumber: z.number().optional(),
    weekYear: z.number().optional(),
  })
  .optional();

export const getOverlayClubsInput = z
  .object({
    weekNumber: z.number().optional(),
    weekYear: z.number().optional(),
    weekStart: z.string().optional(),
    weekEnd: z.string().optional(),
  })
  .optional();
