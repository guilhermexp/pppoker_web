import { z } from "@hono/zod-openapi";

// =============================================================================
// ENUMS
// =============================================================================

export const pokerImportStatusSchema = z.enum([
  "pending",
  "validating",
  "validated",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

export const getPokerImportsSchema = z.object({
  cursor: z.string().nullable().optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  status: pokerImportStatusSchema.nullable().optional(),
});

export const getPokerImportByIdSchema = z.object({
  id: z.string().uuid(),
});

export const createPokerImportSchema = z.object({
  fileName: z.string(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  rawData: z.any(), // The parsed Excel/CSV data
});

export const validatePokerImportSchema = z.object({
  id: z.string().uuid(),
});

export const processPokerImportSchema = z.object({
  id: z.string().uuid(),
});

export const cancelPokerImportSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// PARSED DATA SCHEMAS (for Excel sheets)
// =============================================================================

export const parsedPlayerSchema = z.object({
  ppPokerId: z.string(),
  nickname: z.string(),
  memoName: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  agentNickname: z.string().nullable().optional(),
  agentPpPokerId: z.string().nullable().optional(),
  superAgentNickname: z.string().nullable().optional(),
  superAgentPpPokerId: z.string().nullable().optional(),
  chipBalance: z.number().optional(),
  agentCreditBalance: z.number().optional(),
  lastActiveAt: z.string().nullable().optional(),
});

export const parsedTransactionSchema = z.object({
  occurredAt: z.string(),
  senderClubId: z.string().nullable().optional(),
  senderPlayerId: z.string().nullable().optional(),
  senderNickname: z.string().nullable().optional(),
  recipientPlayerId: z.string().nullable().optional(),
  recipientNickname: z.string().nullable().optional(),
  creditSent: z.number().optional(),
  creditRedeemed: z.number().optional(),
  chipsSent: z.number().optional(),
  chipsRedeemed: z.number().optional(),
});

export const parsedSessionSchema = z.object({
  externalId: z.string(),
  tableName: z.string().nullable().optional(),
  sessionType: z.string(),
  gameVariant: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
  blinds: z.string().nullable().optional(),
  buyInAmount: z.number().nullable().optional(),
  guaranteedPrize: z.number().nullable().optional(),
  createdByNickname: z.string().nullable().optional(),
  createdByPpPokerId: z.string().nullable().optional(),
  players: z.array(z.object({
    ppPokerId: z.string(),
    nickname: z.string(),
    ranking: z.number().nullable().optional(),
    buyInChips: z.number().optional(),
    buyInTicket: z.number().optional(),
    winnings: z.number().optional(),
    rake: z.number().optional(),
  })).optional(),
});

export const parsedSummarySchema = z.object({
  ppPokerId: z.string(),
  nickname: z.string(),
  memoName: z.string().nullable().optional(),
  agentNickname: z.string().nullable().optional(),
  agentPpPokerId: z.string().nullable().optional(),
  winningsTotal: z.number().optional(),
  rakeTotal: z.number().optional(),
  // Game-specific winnings
  winningsRing: z.number().optional(),
  winningsMtt: z.number().optional(),
  winningsSpinup: z.number().optional(),
});

export const parsedRakebackSchema = z.object({
  agentPpPokerId: z.string(),
  agentNickname: z.string(),
  superAgentPpPokerId: z.string().nullable().optional(),
  averageRakebackPercent: z.number(),
});

// Full import data structure
export const importDataSchema = z.object({
  players: z.array(parsedPlayerSchema).optional(),
  transactions: z.array(parsedTransactionSchema).optional(),
  sessions: z.array(parsedSessionSchema).optional(),
  summaries: z.array(parsedSummarySchema).optional(),
  rakebacks: z.array(parsedRakebackSchema).optional(),
  periodStart: z.string().nullable().optional(),
  periodEnd: z.string().nullable().optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PokerImportStatus = z.infer<typeof pokerImportStatusSchema>;
export type ParsedPlayer = z.infer<typeof parsedPlayerSchema>;
export type ParsedTransaction = z.infer<typeof parsedTransactionSchema>;
export type ParsedSession = z.infer<typeof parsedSessionSchema>;
export type ImportData = z.infer<typeof importDataSchema>;
