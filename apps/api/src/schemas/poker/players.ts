import { z } from "@hono/zod-openapi";

// =============================================================================
// ENUMS
// =============================================================================

export const pokerPlayerStatusSchema = z.enum([
  "active",
  "inactive",
  "suspended",
  "blacklisted",
]);

export const pokerPlayerTypeSchema = z.enum(["player", "agent"]);

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

export const getPokerPlayersSchema = z.object({
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
      example: ["nickname", "asc"],
    }),
  q: z
    .string()
    .nullable()
    .optional()
    .openapi({
      description: "Search query for nickname, memo_name, pppoker_id, email",
      example: "player123",
    }),
  type: pokerPlayerTypeSchema
    .nullable()
    .optional()
    .openapi({
      description: "Filter by player type",
      example: "player",
    }),
  status: pokerPlayerStatusSchema
    .nullable()
    .optional()
    .openapi({
      description: "Filter by status",
      example: "active",
    }),
  agentId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .openapi({
      description: "Filter by agent ID",
    }),
  isVip: z
    .boolean()
    .nullable()
    .optional()
    .openapi({
      description: "Filter by VIP status",
    }),
  isShark: z
    .boolean()
    .nullable()
    .optional()
    .openapi({
      description: "Filter by shark status",
    }),
});

export const getPokerPlayerByIdSchema = z.object({
  id: z.string().uuid().openapi({
    description: "Player ID",
  }),
});

export const upsertPokerPlayerSchema = z.object({
  id: z.string().uuid().optional().openapi({
    description: "Player ID (required for update, omit for create)",
  }),
  ppPokerId: z.string().min(1).openapi({
    description: "PPPoker player ID",
    example: "12345678",
  }),
  nickname: z.string().min(1).openapi({
    description: "Player nickname",
    example: "Player123",
  }),
  memoName: z.string().nullable().optional().openapi({
    description: "Memo/internal name",
  }),
  country: z.string().nullable().optional().openapi({
    description: "Country code",
    example: "BR",
  }),
  type: pokerPlayerTypeSchema.optional().openapi({
    description: "Player type (player or agent)",
  }),
  status: pokerPlayerStatusSchema.optional().openapi({
    description: "Player status",
  }),
  agentId: z.string().uuid().nullable().optional().openapi({
    description: "Agent ID (if player belongs to an agent)",
  }),
  superAgentId: z.string().uuid().nullable().optional().openapi({
    description: "Super agent ID",
  }),
  phone: z.string().nullable().optional().openapi({
    description: "Phone number",
  }),
  whatsappNumber: z.string().nullable().optional().openapi({
    description: "WhatsApp number",
  }),
  email: z.string().email().nullable().optional().openapi({
    description: "Email address",
  }),
  creditLimit: z.number().nullable().optional().openapi({
    description: "Credit limit",
  }),
  currentBalance: z.number().nullable().optional().openapi({
    description: "Current balance",
  }),
  chipBalance: z.number().nullable().optional().openapi({
    description: "Chip balance from PPPoker",
  }),
  riskScore: z.number().min(0).max(100).nullable().optional().openapi({
    description: "Risk score (0-100)",
  }),
  isVip: z.boolean().optional().openapi({
    description: "VIP status",
  }),
  isShark: z.boolean().optional().openapi({
    description: "Shark status (high ROI player)",
  }),
  rakebackPercent: z.number().min(0).max(100).nullable().optional().openapi({
    description: "Rakeback percentage (for agents)",
  }),
  customerId: z.string().uuid().nullable().optional().openapi({
    description: "Link to existing customer",
  }),
  note: z.string().nullable().optional().openapi({
    description: "Notes about the player",
  }),
});

export const deletePokerPlayerSchema = z.object({
  id: z.string().uuid().openapi({
    description: "Player ID to delete",
  }),
});

export const updatePokerPlayerStatusSchema = z.object({
  id: z.string().uuid().openapi({
    description: "Player ID",
  }),
  status: pokerPlayerStatusSchema.openapi({
    description: "New status",
  }),
});

export const getPokerAgentsSchema = z.object({
  cursor: z.string().nullable().optional(),
  pageSize: z.coerce.number().min(1).max(1000).optional(),
  q: z.string().nullable().optional(),
});

export const getPlayersByAgentSchema = z.object({
  agentId: z.string().uuid().openapi({
    description: "Agent ID to get players for",
  }),
  cursor: z.string().nullable().optional(),
  pageSize: z.coerce.number().min(1).max(1000).optional(),
});

export const getAgentStatsSchema = z.object({
  dateFrom: z.string().nullable().optional().openapi({
    description: "Filter stats from this date (ISO string)",
  }),
  dateTo: z.string().nullable().optional().openapi({
    description: "Filter stats to this date (ISO string)",
  }),
  superAgentId: z.string().uuid().nullable().optional().openapi({
    description: "Filter by super agent ID",
  }),
});

export const checkExistingPlayersSchema = z.object({
  ppPokerIds: z.array(z.string()).openapi({
    description: "Array of PPPoker IDs to check",
  }),
});

export const bulkCreatePlayersSchema = z.object({
  players: z.array(z.object({
    ppPokerId: z.string().min(1),
    nickname: z.string().min(1),
    memoName: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    type: pokerPlayerTypeSchema.optional().default("player"),
    agentPpPokerId: z.string().nullable().optional(), // Will be resolved to agentId
    superAgentPpPokerId: z.string().nullable().optional(), // Will be resolved to superAgentId
  })).openapi({
    description: "Array of players to create",
  }),
});

// =============================================================================
// RESPONSE SCHEMAS
// =============================================================================

export const pokerPlayerResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  ppPokerId: z.string(),
  nickname: z.string(),
  memoName: z.string().nullable(),
  country: z.string().nullable(),
  type: pokerPlayerTypeSchema,
  status: pokerPlayerStatusSchema,
  agentId: z.string().uuid().nullable(),
  superAgentId: z.string().uuid().nullable(),
  phone: z.string().nullable(),
  whatsappNumber: z.string().nullable(),
  email: z.string().nullable(),
  creditLimit: z.number(),
  currentBalance: z.number(),
  chipBalance: z.number(),
  agentCreditBalance: z.number(),
  riskScore: z.number(),
  isVip: z.boolean(),
  isShark: z.boolean(),
  lastActiveAt: z.string().nullable(),
  rakebackPercent: z.number(),
  customerId: z.string().uuid().nullable(),
  note: z.string().nullable(),
  // Relations
  agent: z
    .object({
      id: z.string().uuid(),
      nickname: z.string(),
      memoName: z.string().nullable(),
    })
    .nullable()
    .optional(),
  superAgent: z
    .object({
      id: z.string().uuid(),
      nickname: z.string(),
      memoName: z.string().nullable(),
    })
    .nullable()
    .optional(),
  _count: z
    .object({
      players: z.number().optional(),
    })
    .optional(),
});

export const pokerPlayersResponseSchema = z.object({
  meta: z.object({
    cursor: z.string().nullable().optional(),
    hasPreviousPage: z.boolean(),
    hasNextPage: z.boolean(),
    totalCount: z.number().optional(),
  }),
  data: z.array(pokerPlayerResponseSchema),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type GetPokerPlayersInput = z.infer<typeof getPokerPlayersSchema>;
export type GetPokerPlayerByIdInput = z.infer<typeof getPokerPlayerByIdSchema>;
export type UpsertPokerPlayerInput = z.infer<typeof upsertPokerPlayerSchema>;
export type DeletePokerPlayerInput = z.infer<typeof deletePokerPlayerSchema>;
export type PokerPlayerResponse = z.infer<typeof pokerPlayerResponseSchema>;
export type PokerPlayersResponse = z.infer<typeof pokerPlayersResponseSchema>;
