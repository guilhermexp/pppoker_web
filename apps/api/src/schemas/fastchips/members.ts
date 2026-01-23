import { z } from "@hono/zod-openapi";

// =============================================================================
// ENUMS
// =============================================================================

export const fastchipsMemberStatusSchema = z.enum(["active", "inactive"]);

export const fastchipsRestrictionSchema = z.enum(["auto_withdraw", "blocked"]);

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

export const getFastchipsMembersSchema = z.object({
  cursor: z.string().nullable().optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  status: fastchipsMemberStatusSchema.nullable().optional(),
  search: z.string().nullable().optional(),
});

export const getFastchipsMemberByIdSchema = z.object({
  id: z.string().uuid(),
});

export const linkToPokerPlayerSchema = z.object({
  memberId: z.string().uuid(),
  pokerPlayerId: z.string().uuid(),
});

export const unlinkFromPokerPlayerSchema = z.object({
  memberId: z.string().uuid(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type FastchipsMemberStatus = z.infer<typeof fastchipsMemberStatusSchema>;
export type FastchipsRestriction = z.infer<typeof fastchipsRestrictionSchema>;
