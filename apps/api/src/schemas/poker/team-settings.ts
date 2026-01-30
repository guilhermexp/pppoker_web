import { z } from "@hono/zod-openapi";

// =============================================================================
// ENUMS
// =============================================================================

export const pokerPlatformSchema = z.enum([
  "pppoker",
  "suprema",
  "pokerbros",
  "fishpoker",
  "xpoker",
  "other",
]);

export const pokerEntityTypeSchema = z.enum([
  "clube_privado",
  "clube_liga",
  "liga",
  "ambos",
]);

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

export const updatePokerSettingsSchema = z.object({
  pokerPlatform: pokerPlatformSchema.nullable().optional().openapi({
    description: "Poker platform being used",
    example: "pppoker",
  }),
  pokerEntityType: pokerEntityTypeSchema.nullable().optional().openapi({
    description: "Type of poker entity",
    example: "clube_liga",
  }),
  pokerClubId: z.string().nullable().optional().openapi({
    description: "Club ID on the poker platform",
    example: "123456",
  }),
  pokerClubName: z.string().nullable().optional().openapi({
    description: "Club name",
    example: "Meu Clube",
  }),
  pokerLigaId: z.string().nullable().optional().openapi({
    description: "Liga ID on the poker platform (if this team is a Liga)",
    example: "789012",
  }),
  pokerLigaName: z.string().nullable().optional().openapi({
    description: "Liga name",
    example: "Liga ABC",
  }),
  pokerSuId: z.string().nullable().optional().openapi({
    description: "Super Union ID (PPST/PPSR global lobby)",
    example: "1765",
  }),
  pokerSuName: z.string().nullable().optional().openapi({
    description: "Super Union name",
    example: "Super Union Brasil",
  }),
  pokerParentLigaTeamId: z.string().uuid().nullable().optional().openapi({
    description:
      "If this is a club in a liga, reference to the Liga team in the system",
    example: "550e8400-e29b-41d4-a716-446655440000",
  }),
});

export const addLinkedClubSchema = z.object({
  clubId: z.string().min(1).openapi({
    description: "Club ID from the poker platform",
    example: "111111",
  }),
  clubName: z.string().optional().openapi({
    description: "Club name",
    example: "Clube Alpha",
  }),
  linkedTeamId: z.string().uuid().optional().openapi({
    description: "If the club has an account in the system, link to their team",
    example: "550e8400-e29b-41d4-a716-446655440000",
  }),
});

export const removeLinkedClubSchema = z.object({
  clubId: z.string().min(1).openapi({
    description: "Club ID to remove",
    example: "111111",
  }),
});

// =============================================================================
// OUTPUT SCHEMAS
// =============================================================================

export const pokerSettingsResponseSchema = z.object({
  pokerPlatform: pokerPlatformSchema.nullable(),
  pokerEntityType: pokerEntityTypeSchema.nullable(),
  pokerClubId: z.string().nullable(),
  pokerClubName: z.string().nullable(),
  pokerLigaId: z.string().nullable(),
  pokerLigaName: z.string().nullable(),
  pokerSuId: z.string().nullable(),
  pokerSuName: z.string().nullable(),
  pokerParentLigaTeamId: z.string().uuid().nullable(),
});

export const linkedClubSchema = z.object({
  id: z.string().uuid(),
  clubId: z.string(),
  clubName: z.string().nullable(),
  linkedTeamId: z.string().uuid().nullable(),
  linkedTeamName: z.string().nullable(),
  createdAt: z.string(),
});

export const linkedClubsResponseSchema = z.object({
  clubs: z.array(linkedClubSchema),
  total: z.number(),
});

// =============================================================================
// TYPES
// =============================================================================

export type PokerPlatform = z.infer<typeof pokerPlatformSchema>;
export type PokerEntityType = z.infer<typeof pokerEntityTypeSchema>;
export type UpdatePokerSettingsInput = z.infer<
  typeof updatePokerSettingsSchema
>;
export type AddLinkedClubInput = z.infer<typeof addLinkedClubSchema>;
export type RemoveLinkedClubInput = z.infer<typeof removeLinkedClubSchema>;
export type PokerSettingsResponse = z.infer<typeof pokerSettingsResponseSchema>;
export type LinkedClub = z.infer<typeof linkedClubSchema>;
export type LinkedClubsResponse = z.infer<typeof linkedClubsResponseSchema>;
