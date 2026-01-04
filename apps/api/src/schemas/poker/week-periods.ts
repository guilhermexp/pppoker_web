import { z } from "@hono/zod-openapi";

// =============================================================================
// ENUMS
// =============================================================================

export const pokerWeekPeriodStatusSchema = z.enum(["open", "closed"]);

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

export const getPokerWeekPeriodsSchema = z.object({
  cursor: z
    .string()
    .nullable()
    .optional()
    .openapi({
      description: "Cursor for pagination (page number as string)",
    }),
  pageSize: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .openapi({
      description: "Number of items per page",
    }),
  status: z.enum(["open", "closed", "all"]).optional().openapi({
    description: "Filter by status (open, closed, or all)",
  }),
});

export const getPokerWeekPeriodByIdSchema = z.object({
  id: z.string().uuid(),
});

export const previewCloseWeekSchema = z.object({
  weekPeriodId: z.string().uuid().optional().openapi({
    description:
      "Week period ID to preview. If not provided, uses current week.",
  }),
});

export const rakebackOverrideSchema = z.object({
  agentId: z.string().uuid().openapi({
    description: "Agent ID to override rakeback percentage",
  }),
  rakebackPercent: z.number().min(0).max(100).openapi({
    description: "Rakeback percentage to use for this agent (0-100)",
  }),
});

export const closeWeekSchema = z.object({
  weekPeriodId: z.string().uuid().optional().openapi({
    description: "Week period ID to close. If not provided, uses current week.",
  }),
  note: z.string().optional().openapi({
    description: "Optional note for the week closure",
  }),
  rakebackOverrides: z.array(rakebackOverrideSchema).optional().openapi({
    description: "Temporary rakeback overrides for specific agents (only for this week)",
  }),
});

// =============================================================================
// VIEW MODE SCHEMA (for analytics/dashboard)
// =============================================================================

export const viewModeSchema = z.enum(["current_week", "historical"]);

export const dashboardViewOptionsSchema = z.object({
  viewMode: viewModeSchema.optional(),
  weekPeriodId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

export const weekPeriodSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  weekStart: z.string(),
  weekEnd: z.string(),
  status: pokerWeekPeriodStatusSchema,
  closedAt: z.string().nullable(),
  closedBy: z
    .object({
      id: z.string(),
      fullName: z.string().nullable(),
    })
    .nullable(),
  totalSessions: z.number(),
  totalPlayers: z.number(),
  totalRake: z.number(),
  totalSettlements: z.number(),
  settlementsGrossAmount: z.number(),
  settlementsNetAmount: z.number(),
  note: z.string().nullable(),
});

export const settlementPreviewItemSchema = z.object({
  playerId: z.string().uuid(),
  playerNickname: z.string(),
  playerMemoName: z.string().nullable(),
  playerType: z.enum(["player", "agent", "super_agent"]),
  agentId: z.string().uuid().nullable(),
  agentNickname: z.string().nullable(),
  chipBalance: z.number(),
  rakebackPercent: z.number(),
  grossAmount: z.number(),
  rakebackAmount: z.number(),
  netAmount: z.number(),
});

export const closeWeekPreviewSchema = z.object({
  weekPeriod: weekPeriodSchema,
  settlements: z.array(settlementPreviewItemSchema),
  summary: z.object({
    totalSettlements: z.number(),
    totalGross: z.number(),
    totalRakeback: z.number(),
    totalNet: z.number(),
    playersWithPositiveBalance: z.number(),
    playersWithNegativeBalance: z.number(),
  }),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PokerWeekPeriodStatus = z.infer<typeof pokerWeekPeriodStatusSchema>;
export type GetPokerWeekPeriodsInput = z.infer<typeof getPokerWeekPeriodsSchema>;
export type PreviewCloseWeekInput = z.infer<typeof previewCloseWeekSchema>;
export type RakebackOverride = z.infer<typeof rakebackOverrideSchema>;
export type CloseWeekInput = z.infer<typeof closeWeekSchema>;
export type ViewMode = z.infer<typeof viewModeSchema>;
export type DashboardViewOptions = z.infer<typeof dashboardViewOptionsSchema>;
export type WeekPeriod = z.infer<typeof weekPeriodSchema>;
export type SettlementPreviewItem = z.infer<typeof settlementPreviewItemSchema>;
export type CloseWeekPreview = z.infer<typeof closeWeekPreviewSchema>;
