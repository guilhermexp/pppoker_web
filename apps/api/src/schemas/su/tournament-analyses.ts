import { z } from "@hono/zod-openapi";

export const saveTournamentAnalysisInput = z.object({
  weekYear: z.number(),
  weekNumber: z.number(),
  weekStart: z.string().optional(),
  weekEnd: z.string().optional(),
  scheduleData: z.unknown().optional(),
  realizedData: z.unknown().optional(),
  saOverlayData: z.unknown().optional(),
  scheduleTournamentCount: z.number().int().default(0),
  scheduleTotalGtdUsd: z.number().default(0),
  overlayCount: z.number().int().default(0),
  overlayTotalBrl: z.number().default(0),
  saPpstUsd: z.number().default(0),
  saTotalUsd: z.number().default(0),
  crossMatchCount: z.number().int().default(0),
  note: z.string().optional(),
});

export const getByWeekInput = z.object({
  weekYear: z.number(),
  weekNumber: z.number(),
});

export const listTournamentAnalysesInput = z
  .object({
    limit: z.number().int().min(1).max(100).default(52),
  })
  .optional();

export const deleteTournamentAnalysisInput = z.object({
  id: z.string().uuid(),
});
