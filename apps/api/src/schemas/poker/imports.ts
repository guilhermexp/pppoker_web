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

export const pokerImportSourceTypeSchema = z.enum(["club", "league", "su"]);

// =============================================================================
// PARSED DATA SCHEMAS (for Excel sheets)
// These need to be defined first since they're used in input schemas
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
  superAgentCreditBalance: z.number().optional(),
  lastActiveAt: z.string().nullable().optional(),
});

export const parsedTransactionSchema = z.object({
  occurredAt: z.string(),
  senderClubId: z.string().nullable().optional(),
  senderPlayerId: z.string().nullable().optional(),
  senderNickname: z.string().nullable().optional(),
  senderMemoName: z.string().nullable().optional(),
  recipientPlayerId: z.string().nullable().optional(),
  recipientNickname: z.string().nullable().optional(),
  recipientMemoName: z.string().nullable().optional(),
  creditSent: z.number().optional(),
  creditRedeemed: z.number().optional(),
  creditLeftClub: z.number().optional(),
  chipsSent: z.number().optional(),
  chipsRedeemed: z.number().optional(),
  chipsLeftClub: z.number().optional(),
  // Classification by chip type
  classificationPpsr: z.number().optional(),
  classificationRing: z.number().optional(),
  classificationCustomRing: z.number().optional(),
  classificationMtt: z.number().optional(),
  // Tickets
  ticketSent: z.number().optional(),
  ticketRedeemed: z.number().optional(),
  ticketExpired: z.number().optional(),
});

export const parsedSessionPlayerSchema = z.object({
  ppPokerId: z.string(),
  nickname: z.string(),
  memoName: z.string().nullable().optional(),
  ranking: z.number().nullable().optional(),
  buyIn: z.number().optional(),
  buyInChips: z.number().optional(),
  buyInTicket: z.number().optional(),
  winnings: z.number().optional(),
  winningsGeneral: z.number().optional(),
  winningsOpponents: z.number().optional(),
  winningsJackpot: z.number().optional(),
  winningsEvSplit: z.number().optional(),
  rake: z.number().optional(),
  clubWinningsFee: z.number().optional(),
  clubWinningsGeneral: z.number().optional(),
  clubWinningsJackpotFee: z.number().optional(),
  clubWinningsJackpotPrize: z.number().optional(),
  clubWinningsEvSplit: z.number().optional(),
  hands: z.number().optional(),
  bounty: z.number().optional(),
  prize: z.number().optional(),
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
  totalRake: z.number().optional(),
  totalBuyIn: z.number().optional(),
  totalWinnings: z.number().optional(),
  playerCount: z.number().optional(),
  handsPlayed: z.number().optional(),
  createdByNickname: z.string().nullable().optional(),
  createdByPpPokerId: z.string().nullable().optional(),
  players: z.array(parsedSessionPlayerSchema).optional(),
});

export const parsedSummarySchema = z.object({
  ppPokerId: z.string(),
  nickname: z.string(),
  memoName: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  agentNickname: z.string().nullable().optional(),
  agentPpPokerId: z.string().nullable().optional(),
  superAgentNickname: z.string().nullable().optional(),
  superAgentPpPokerId: z.string().nullable().optional(),
  // Winnings by category
  generalTotal: z.number().optional(),
  ringGamesTotal: z.number().optional(),
  mttSitNGoTotal: z.number().optional(),
  spinUpTotal: z.number().optional(),
  caribbeanTotal: z.number().optional(),
  colorGameTotal: z.number().optional(),
  crashTotal: z.number().optional(),
  luckyDrawTotal: z.number().optional(),
  jackpotTotal: z.number().optional(),
  jackpotPrize: z.number().optional(),
  evSplitTotal: z.number().optional(),
  // Fee/Rake
  fee: z.number().optional(),
  feeGeneral: z.number().optional(),
  feePpst: z.number().optional(),
  feePpsr: z.number().optional(),
  feeNonPpst: z.number().optional(),
  feeNonPpsr: z.number().optional(),
  jackpotFee: z.number().optional(),
  // Classifications
  classificationPpsr: z.number().optional(),
  classificationRing: z.number().optional(),
  classificationCustomRing: z.number().optional(),
  classificationMtt: z.number().optional(),
  // Tickets
  ticketValueWon: z.number().optional(),
  ticketBuyIn: z.number().optional(),
  customPrizeValue: z.number().optional(),
  // SPINUP
  spinUpBuyIn: z.number().optional(),
  spinUpPrize: z.number().optional(),
  // Other
  evSplit: z.number().optional(),
  ticketDeliveredValue: z.number().optional(),
  ticketDeliveredBuyIn: z.number().optional(),
  // Legacy fields for backwards compatibility
  winningsTotal: z.number().optional(),
  rakeTotal: z.number().optional(),
  winningsRing: z.number().optional(),
  winningsMtt: z.number().optional(),
  winningsSpinup: z.number().optional(),
});

export const parsedDetailedSchema = z
  .object({
    ppPokerId: z.string(),
    date: z.string().nullable().optional(),
    nickname: z.string().nullable().optional(),
    memoName: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    agentNickname: z.string().nullable().optional(),
    agentPpPokerId: z.string().nullable().optional(),
    superAgentNickname: z.string().nullable().optional(),
    superAgentPpPokerId: z.string().nullable().optional(),
    // All the detailed game variant fields
    nlhRegular: z.number().optional(),
    nlhThreeOne: z.number().optional(),
    nlhThreeOneF: z.number().optional(),
    nlhSixPlus: z.number().optional(),
    nlhAof: z.number().optional(),
    nlhSitNGo: z.number().optional(),
    nlhSpinUp: z.number().optional(),
    nlhMtt: z.number().optional(),
    nlhMttSixPlus: z.number().optional(),
    plo4: z.number().optional(),
    plo5: z.number().optional(),
    plo6: z.number().optional(),
    totalWinnings: z.number().optional(),
    feeTotal: z.number().optional(),
    // Many more fields - using passthrough for flexibility
  })
  .passthrough();

export const parsedRakebackSchema = z.object({
  agentPpPokerId: z.string(),
  agentNickname: z.string(),
  memoName: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  superAgentPpPokerId: z.string().nullable().optional(),
  averageRakebackPercent: z.number(),
  totalRt: z.number().optional(),
});

export const parsedDemonstrativoSchema = z.object({
  occurredAt: z.string().nullable().optional(),
  ppPokerId: z.string().nullable().optional(),
  nickname: z.string().nullable().optional(),
  memoName: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  amount: z.number().optional(),
});

// Full import data structure
export const importDataSchema = z
  .object({
    // Common identifiers
    clubId: z.number().nullable().optional(),
    leagueId: z.number().nullable().optional(),
    periodStart: z.string().nullable().optional(),
    periodEnd: z.string().nullable().optional(),
    // Data arrays - all optional since different spreadsheet types have different data
    players: z.array(parsedPlayerSchema).optional(),
    transactions: z.array(parsedTransactionSchema).optional(),
    sessions: z.array(parsedSessionSchema).optional(),
    summaries: z.array(parsedSummarySchema).optional(),
    detailed: z.array(parsedDetailedSchema).optional(),
    rakebacks: z.array(parsedRakebackSchema).optional(),
    demonstrativo: z.array(parsedDemonstrativoSchema).optional(),
  })
  .passthrough(); // Allow additional fields for flexibility

// =============================================================================
// INPUT SCHEMAS
// =============================================================================

export const getPokerImportsSchema = z.object({
  cursor: z.string().nullable().optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  status: pokerImportStatusSchema.nullable().optional(),
  sourceType: pokerImportSourceTypeSchema.nullable().optional(),
});

export const getPokerImportByIdSchema = z.object({
  id: z.string().uuid(),
});

export const createPokerImportSchema = z.object({
  fileName: z.string(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  sourceType: pokerImportSourceTypeSchema.optional().default("club"),
  // Use the typed import data schema with passthrough for flexibility
  rawData: importDataSchema,
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
// TYPE EXPORTS
// =============================================================================

export type PokerImportStatus = z.infer<typeof pokerImportStatusSchema>;
export type ParsedPlayer = z.infer<typeof parsedPlayerSchema>;
export type ParsedTransaction = z.infer<typeof parsedTransactionSchema>;
export type ParsedSession = z.infer<typeof parsedSessionSchema>;
export type ParsedSummary = z.infer<typeof parsedSummarySchema>;
export type ParsedDetailed = z.infer<typeof parsedDetailedSchema>;
export type ParsedRakeback = z.infer<typeof parsedRakebackSchema>;
export type ParsedDemonstrativo = z.infer<typeof parsedDemonstrativoSchema>;
export type ImportData = z.infer<typeof importDataSchema>;
