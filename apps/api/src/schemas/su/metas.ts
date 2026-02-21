import { z } from "@hono/zod-openapi";

// =============================================================================
// Meta Groups
// =============================================================================

export const listMetaGroupsInput = z
  .object({
    activeOnly: z.boolean().optional(),
  })
  .optional();

export const getMetaGroupByIdInput = z.object({
  id: z.string().uuid(),
});

export const createMetaGroupInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  metaPercent: z.number().min(0).max(100),
  memberIds: z
    .array(
      z.object({
        superUnionId: z.number(),
        suLeagueId: z.string().uuid().optional(),
        displayName: z.string().optional(),
      }),
    )
    .optional(),
});

export const updateMetaGroupInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  metaPercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const deleteMetaGroupInput = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// Meta Group Members
// =============================================================================

export const addMetaGroupMemberInput = z.object({
  metaGroupId: z.string().uuid(),
  superUnionId: z.number(),
  suLeagueId: z.string().uuid().optional(),
  displayName: z.string().optional(),
});

export const removeMetaGroupMemberInput = z.object({
  id: z.string().uuid(),
});

export const bulkMetaGroupMembersInput = z.object({
  metaGroupId: z.string().uuid(),
  members: z.array(
    z.object({
      superUnionId: z.number(),
      suLeagueId: z.string().uuid().optional(),
      displayName: z.string().optional(),
    }),
  ),
});

// =============================================================================
// Meta Group Time Slots
// =============================================================================

export const listMetaGroupTimeSlotsInput = z.object({
  metaGroupId: z.string().uuid(),
});

export const createTimeSlotInput = z.object({
  metaGroupId: z.string().uuid(),
  name: z.string().min(1).max(100),
  hourStart: z.number().int().min(0).max(23),
  hourEnd: z.number().int().min(0).max(23),
  metaPercent: z.number().min(0).max(100),
  isActive: z.boolean().optional(),
});

export const updateTimeSlotInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  hourStart: z.number().int().min(0).max(23).optional(),
  hourEnd: z.number().int().min(0).max(23).optional(),
  metaPercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const deleteTimeSlotInput = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// Club Metas
// =============================================================================

export const getClubMetasByWeekInput = z.object({
  weekYear: z.number(),
  weekNumber: z.number(),
  superUnionId: z.number().optional(),
  clubId: z.number().optional(),
});

export const createClubMetaInput = z.object({
  superUnionId: z.number(),
  clubId: z.number(),
  weekYear: z.number(),
  weekNumber: z.number(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  hourStart: z.number().int().min(0).max(23).nullable().optional(),
  hourEnd: z.number().int().min(0).max(23).nullable().optional(),
  targetType: z.enum(["players", "buyins"]),
  targetValue: z.number().min(0),
  referenceBuyin: z.number().nullable().optional(),
  note: z.string().optional(),
});

export const updateClubMetaInput = z.object({
  id: z.string().uuid(),
  targetValue: z.number().min(0).optional(),
  referenceBuyin: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  hourStart: z.number().int().min(0).max(23).nullable().optional(),
  hourEnd: z.number().int().min(0).max(23).nullable().optional(),
});

export const deleteClubMetaInput = z.object({
  id: z.string().uuid(),
});

export const bulkCreateClubMetasInput = z.object({
  metas: z.array(createClubMetaInput),
});

export const inheritClubMetasInput = z.object({
  targetWeekYear: z.number(),
  targetWeekNumber: z.number(),
  sourceWeekYear: z.number(),
  sourceWeekNumber: z.number(),
});

// =============================================================================
// Overlay Distribution
// =============================================================================

export const overlayDistributionInput = z.object({
  weekYear: z.number(),
  weekNumber: z.number(),
  weekStart: z.string(),
  weekEnd: z.string(),
});

// =============================================================================
// Overlay Selections
// =============================================================================

export const getOverlaySelectionsInput = z.object({
  weekYear: z.number(),
  weekNumber: z.number(),
});

export const saveOverlaySelectionsInput = z.object({
  weekYear: z.number(),
  weekNumber: z.number(),
  selections: z.array(
    z.object({
      gameId: z.string(),
      isSelected: z.boolean(),
      metaPlayers: z.number().optional(),
    }),
  ),
});

// =============================================================================
// Club Deals
// =============================================================================

export const listClubDealsInput = z
  .object({
    superUnionId: z.number().optional(),
    clubId: z.number().optional(),
  })
  .optional();

export const getClubDealsByClubInput = z.object({
  superUnionId: z.number(),
  clubId: z.number(),
});

export const createClubDealInput = z.object({
  superUnionId: z.number(),
  clubId: z.number(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  hourStart: z.number().int().min(0).max(23).nullable().optional(),
  hourEnd: z.number().int().min(0).max(23).nullable().optional(),
  targetType: z.enum(["players", "buyins"]),
  targetValue: z.number().min(0),
  referenceBuyin: z.number().nullable().optional(),
  note: z.string().optional(),
});

export const updateClubDealInput = z.object({
  id: z.string().uuid(),
  targetValue: z.number().min(0).optional(),
  referenceBuyin: z.number().nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  hourStart: z.number().int().min(0).max(23).nullable().optional(),
  hourEnd: z.number().int().min(0).max(23).nullable().optional(),
  isActive: z.boolean().optional(),
  note: z.string().nullable().optional(),
});

export const deleteClubDealInput = z.object({
  id: z.string().uuid(),
});

export const saveClubDealFromOverrideInput = z.object({
  superUnionId: z.number(),
  clubId: z.number(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  hourStart: z.number().int().min(0).max(23).nullable().optional(),
  hourEnd: z.number().int().min(0).max(23).nullable().optional(),
  targetType: z.enum(["players", "buyins"]),
  targetValue: z.number().min(0),
  referenceBuyin: z.number().nullable().optional(),
  note: z.string().optional(),
});
