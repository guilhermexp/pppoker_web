// Types for PPPoker Excel Import and Validation

export type ParsedPlayer = {
  ppPokerId: string;
  nickname: string;
  memoName: string | null;
  country: string | null;
  agentNickname: string | null;
  agentPpPokerId: string | null;
  superAgentNickname: string | null;
  superAgentPpPokerId: string | null;
  chipBalance: number;
  agentCreditBalance: number;
  superAgentCreditBalance?: number;
  lastActiveAt: string | null;
  // Calculated fields for validation
  winningsTotal?: number;
  rakeTotal?: number;
  // Status for import preview
  importStatus?: "new" | "existing" | "conflict" | "error";
  importMessage?: string;
};

export type ParsedTransaction = {
  occurredAt: string;
  clubId: string | null;
  senderClubId?: string | null;
  playerId: string | null;
  senderNickname: string | null;
  senderMemoName: string | null;
  senderPlayerId: string | null;
  recipientNickname: string | null;
  recipientMemoName: string | null;
  recipientPlayerId?: string | null;
  creditSent: number;
  creditRedeemed: number;
  creditLeftClub: number;
  chipsSent: number;
  classificationPpsr: number;
  classificationRing: number;
  classificationCustomRing: number;
  classificationMtt: number;
  chipsRedeemed: number;
  chipsLeftClub: number;
  ticketSent: number;
  ticketRedeemed: number;
  ticketExpired: number;
  // Status for import preview
  importStatus?: "new" | "duplicate" | "error";
  importMessage?: string;
};

export type ParsedSession = {
  externalId: string;
  tableName: string | null;
  sessionType: string;
  gameVariant: string;
  startedAt: string;
  endedAt: string | null;
  blinds: string | null;
  buyInAmount: number | null;
  guaranteedPrize: number | null;
  // CASH/PPSR specific
  rakePercent?: number | null;  // e.g., 5 (for 5%)
  rakeCap?: string | null;      // e.g., "3BB"
  timeLimit?: string | null;    // e.g., "0.5h"
  createdByNickname: string | null;
  createdByPpPokerId: string | null;
  playerCount?: number;
  totalRake?: number;
  totalBuyIn?: number;
  totalWinnings?: number;
  handsPlayed?: number;
  players?: Array<{
    ppPokerId: string;
    nickname: string;
    memoName?: string | null;
    ranking?: number;
    buyIn?: number;
    buyInChips?: number;
    buyInTicket?: number;
    prize?: number; // SPIN: "Prêmio" (alternativa a buyInTicket)
    bounty?: number; // PKO: "De recompensa" (bounty tournaments)
    hands?: number;
    winnings?: number;
    // Ganhos do jogador (CASH/HU)
    winningsGeneral?: number;
    winningsOpponents?: number;
    winningsJackpot?: number;
    winningsEvSplit?: number;
    // Ganhos do clube (CASH/HU)
    clubWinningsGeneral?: number;
    clubWinningsFee?: number;
    clubWinningsJackpotFee?: number;
    clubWinningsJackpotPrize?: number;
    clubWinningsEvSplit?: number;
    rake?: number;
    // Club context (League imports - columns B, C)
    clubId?: string;
    clubName?: string;
  }>;
  // Status for import preview
  importStatus?: "new" | "existing" | "error";
  importMessage?: string;
};

export type ParsedSummary = {
  // Identificação do Jogador (A-I)
  ppPokerId: string; // B - ID do jogador
  country: string | null; // C - País/região
  nickname: string; // D - Apelido
  memoName: string | null; // E - Nome de memorando
  agentNickname: string | null; // F - Agente
  agentPpPokerId: string | null; // G - ID do agente
  superAgentNickname: string | null; // H - Superagente
  superAgentPpPokerId: string | null; // I - ID do superagente

  // Classificações (J-N)
  playerWinningsTotal: number; // J - Ganhos de jogador gerais + Eventos
  classificationPpsr: number; // K - Classificação PPSR
  classificationRing: number; // L - Classificação Ring Game
  classificationCustomRing: number; // M - Classificação de RG Personalizado
  classificationMtt: number; // N - Classificação MTT

  // Ganhos do Jogador (O-X)
  generalTotal: number; // O - Geral
  ringGamesTotal: number; // P - Ring Games
  mttSitNGoTotal: number; // Q - MTT, SitNGo
  spinUpTotal: number; // R - SPINUP
  caribbeanTotal: number; // S - Caribbean+ Poker
  colorGameTotal: number; // T - COLOR GAME
  crashTotal: number; // U - CRASH
  luckyDrawTotal: number; // V - LUCKY DRAW
  jackpotTotal: number; // W - Jackpot
  evSplitTotal: number; // X - Dividir EV

  // Tickets (Y-AA)
  ticketValueWon: number; // Y - Valor do ticket ganho
  ticketBuyIn: number; // Z - Buy-in de ticket
  customPrizeValue: number; // AA - Valor do prêmio personalizado

  // Taxas (AB-AG)
  feeGeneral: number; // AB - Geral
  fee: number; // AC - Taxa
  feePpst: number; // AD - Taxa (jogos PPST)
  feeNonPpst: number; // AE - Taxa (jogos não PPST)
  feePpsr: number; // AF - Taxa (jogos PPSR)
  feeNonPpsr: number; // AG - Taxa (jogos não PPSR)

  // SPINUP & Caribbean (AH-AK)
  spinUpBuyIn: number; // AH - Buy-in de SPINUP
  spinUpPrize: number; // AI - Premiação de SPINUP
  caribbeanBets: number; // AJ - Apostas de Caribbean+ Poker
  caribbeanPrize: number; // AK - Premiação de Caribbean+ Poker

  // Ganhos do Clube (AL-AQ)
  colorGameBets: number; // AL - Apostas do COLOR GAME
  colorGamePrize: number; // AM - Premiação do COLOR GAME
  crashBets: number; // AN - Apostas (CRASH)
  crashPrize: number; // AO - Prêmios (CRASH)
  luckyDrawBets: number; // AP - Apostas de LUCKY DRAW
  luckyDrawPrize: number; // AQ - Premiação de LUCKY DRAW

  // Jackpot e Finais (AR-AV)
  jackpotFee: number; // AR - Taxa do Jackpot
  jackpotPrize: number; // AS - Prêmios Jackpot
  evSplit: number; // AT - Dividir EV
  ticketDeliveredValue: number; // AU - Valor do ticket entregue
  ticketDeliveredBuyIn: number; // AV - Buy-in de ticket
};

export type ParsedDetailed = {
  // Club context (from merged cells in column A)
  clubId?: string | null;
  clubName?: string | null;

  // Identificação do Jogador (A-I)
  date: string | null; // A - Data
  ppPokerId: string; // B - ID do jogador
  country: string | null; // C - País/região
  nickname: string; // D - Apelido
  memoName: string | null; // E - Nome de memorando
  agentNickname: string | null; // F - Agente
  agentPpPokerId: string | null; // G - ID do agente
  superAgentNickname: string | null; // H - Superagente
  superAgentPpPokerId: string | null; // I - ID do superagente

  // Ganhos NLHoldem (J-R)
  nlhRegular: number; // J - Regular
  nlhThreeOne: number; // K - 3-1
  nlhThreeOneF: number; // L - 3-1F
  nlhSixPlus: number; // M - 6+
  nlhAof: number; // N - AOF
  nlhSitNGo: number; // O - SitNGo
  nlhSpinUp: number; // P - SPINUP
  nlhMtt: number; // Q - MTT NLH
  nlhMttSixPlus: number; // R - MTT 6+

  // Ganhos PLO (S-AB)
  plo4: number; // S - PLO4
  plo5: number; // T - PLO5
  plo6: number; // U - PLO6
  plo4Hilo: number; // V - PLO4 H/L
  plo5Hilo: number; // W - PLO5 H/L
  plo6Hilo: number; // X - PLO6 H/L
  ploSitNGo: number; // Y - SitNGo
  ploMttPlo4: number; // Z - MTT/PLO4
  ploMttPlo5: number; // AA - MTT/PLO5
  ploNlh: number; // AB - NLHoldem

  // Ganhos do Jogador - FLASH e outros (AC-AV)
  flashPlo4: number; // AC - PLO4 (FLASH)
  flashPlo5: number; // AD - PLO5 (FLASH)
  mixedGame: number; // AE - MIXED GAME
  ofc: number; // AF - OFC
  seka36: number; // AG - 36 (SEKA)
  seka32: number; // AH - 32 (SEKA)
  seka21: number; // AI - 21 (SEKA)
  teenPattiRegular: number; // AJ - REGULAR (Teen Patti)
  teenPattiAk47: number; // AK - AK47 (Teen Patti)
  teenPattiHukam: number; // AL - HUKAM (Teen Patti)
  teenPattiMuflis: number; // AM - MUFLIS (Teen Patti)
  tongits: number; // AN - TONGITS
  pusoy: number; // AO - PUSOY
  caribbean: number; // AP - Caribbean+ Poker
  colorGame: number; // AQ - COLOR GAME
  crash: number; // AR - CRASH
  luckyDraw: number; // AS - LUCKY DRAW
  jackpot: number; // AT - Jackpot
  evSplitWinnings: number; // AU - Dividir EV
  totalWinnings: number; // AV - Total

  // Classificação (AW-AZ)
  classificationPpsr: number; // AW - Classificação PPSR
  classificationRing: number; // AX - Classificação Ring Game
  classificationCustomRing: number; // AY - Classificação de RG Personalizado
  classificationMtt: number; // AZ - Classificação MTT

  // Valores Gerais (BA-BD)
  generalPlusEvents: number; // BA - Ganhos de jogador gerais + Eventos
  ticketValueWon: number; // BB - Valor do ticket ganho
  ticketBuyIn: number; // BC - Buy-in de ticket
  customPrizeValue: number; // BD - Valor do prêmio personalizado

  // Taxa NLHoldem (BE-BM)
  feeNlhRegular: number; // BE - Regular
  feeNlhThreeOne: number; // BF - 3-1
  feeNlhThreeOneF: number; // BG - 3-1F
  feeNlhSixPlus: number; // BH - 6+
  feeNlhAof: number; // BI - AOF
  feeNlhSitNGo: number; // BJ - SitNGo
  feeNlhSpinUp: number; // BK - SPINUP
  feeNlhMtt: number; // BL - MTT NLH
  feeNlhMttSixPlus: number; // BM - MTT 6+

  // Taxa PLO (BN-BU)
  feePlo4: number; // BN - PLO4
  feePlo5: number; // BO - PLO5
  feePlo4Hilo: number; // BP - PLO4 H/L
  feePlo5Hilo: number; // BQ - PLO5 H/L
  feePlo6Hilo: number; // BR - PLO6 H/L
  feePloSitNGo: number; // BS - SitNGo
  feePloMttPlo4: number; // BT - MTT/PLO4
  feePloMttPlo5: number; // BU - MTT/PLO5

  // Taxa FLASH e outros (BV-CJ)
  feeFlashNlh: number; // BV - NLHoldem (FLASH)
  feeFlashPlo4: number; // BW - PLO4 (FLASH)
  feeFlashPlo5: number; // BX - PLO5 (FLASH)
  feeMixedGame: number; // BY - MIXED GAME
  feeOfc: number; // BZ - OFC
  feeSeka36: number; // CA - 36 (SEKA)
  feeSeka32: number; // CB - 32 (SEKA)
  feeSeka21: number; // CC - 21 (SEKA)
  feeTeenPattiRegular: number; // CD - REGULAR (Teen Patti)
  feeTeenPattiAk47: number; // CE - AK47 (Teen Patti)
  feeTeenPattiHukam: number; // CF - HUKAM (Teen Patti)
  feeTeenPattiMuflis: number; // CG - MUFLIS (Teen Patti)
  feeTongits: number; // CH - TONGITS
  feePusoy: number; // CI - PUSOY
  feeTotal: number; // CJ - Total

  // SPINUP (CK-CL)
  spinUpBuyIn: number; // CK - Buy-in
  spinUpPrize: number; // CL - Premiação

  // Jackpot (CM-CN)
  jackpotFee: number; // CM - Taxa
  jackpotPrize: number; // CN - Premiação

  // Dividir EV (CO-CQ)
  evSplitNlh: number; // CO - NLHoldem
  evSplitPlo: number; // CP - PLO
  evSplitTotal: number; // CQ - Total

  // Valor ticket entregue (CR)
  ticketDeliveredValue: number; // CR - Valor do ticket entregue

  // Fichas (CS-CY)
  chipTicketBuyIn: number; // CS - Buy-in de ticket
  chipSent: number; // CT - Enviado
  chipClassPpsr: number; // CU - Classificação PPSR
  chipClassRing: number; // CV - Classificação Ring Game
  chipClassCustomRing: number; // CW - Classificação de RG Personalizado
  chipClassMtt: number; // CX - Classificação MTT
  chipRedeemed: number; // CY - Resgatado

  // Dar Crédito (CZ-DC)
  creditLeftClub: number; // CZ - Saiu do clube
  creditSent: number; // DA - Enviado
  creditRedeemed: number; // DB - Resgatado
  creditLeftClub2: number; // DC - Saiu do clube

  // Mãos NLH (DD-DH)
  handsNlhRegular: number; // DD - Regular
  handsNlhThreeOne: number; // DE - 3-1
  handsNlhThreeOneF: number; // DF - 3-1F
  handsNlhSixPlus: number; // DG - 6+
  handsNlhAof: number; // DH - AOF

  // Mãos PLO (DI-DN)
  handsPlo4: number; // DI - PLO4
  handsPlo5: number; // DJ - PLO5
  handsPlo6: number; // DK - PLO6
  handsPlo4Hilo: number; // DL - PLO4 H/L
  handsPlo5Hilo: number; // DM - PLO5 H/L
  handsPlo6Hilo: number; // DN - PLO6 H/L

  // Mãos FLASH (DO-DQ)
  handsFlashNlh: number; // DO - NLHoldem (FLASH)
  handsFlashPlo4: number; // DP - PLO4 (FLASH)
  handsFlashPlo5: number; // DQ - PLO5 (FLASH)

  // Mãos outros (DR-EG)
  handsMixedGame: number; // DR - MIXED GAME
  handsOfc: number; // DS - OFC
  handsSeka36: number; // DT - 36 (SEKA)
  handsSeka32: number; // DU - 32 (SEKA)
  handsSeka21: number; // DV - 21 (SEKA)
  handsTeenPattiRegular: number; // DW - REGULAR (Teen Patti)
  handsTeenPattiAk47: number; // DX - AK47 (Teen Patti)
  handsTeenPattiHukam: number; // DY - HUKAM (Teen Patti)
  handsTeenPattiMuflis: number; // DZ - MUFLIS (Teen Patti)
  handsTongits: number; // EA - TONGITS
  handsPusoy: number; // EB - PUSOY
  handsCaribbean: number; // EC - Caribbean+ Poker
  handsColorGame: number; // ED - COLOR GAME
  handsCrash: number; // EE - CRASH
  handsLuckyDraw: number; // EF - LUCKY DRAW
  handsTotal: number; // EG - Total
};

export type ParsedDemonstrativo = {
  occurredAt: string;
  ppPokerId: string;
  nickname: string;
  memoName: string | null;
  type: string | null;
  amount: number;
};

export type ParsedRakeback = {
  agentPpPokerId: string;
  agentNickname: string;
  country?: string | null;
  memoName?: string | null;
  superAgentPpPokerId: string | null;
  averageRakebackPercent: number;
  totalRt: number;
};

export type ParsedImportData = {
  players?: ParsedPlayer[]; // Detalhes do usuário
  transactions?: ParsedTransaction[];
  sessions?: ParsedSession[];
  summaries?: ParsedSummary[]; // Geral
  detailed?: ParsedDetailed[];
  demonstrativo?: ParsedDemonstrativo[];
  rakebacks?: ParsedRakeback[]; // Retorno de taxa
  // Metadata extracted from file
  periodStart?: string;
  periodEnd?: string;
  fileName?: string;
  fileSize?: number;
  // Partidas metadata - count of UTC markers in column A
  sessionsUtcCount?: number;
};

// Structure checks
export type StructureCheckId =
  | "geral_sheet_present"
  | "geral_columns_complete"
  | "detalhado_sheet_present"
  | "transactions_sheet_present"
  | "user_details_sheet_present"
  | "partidas_sheet_present"
  | "rakeback_sheet_present"
  | "period_detected";

// Integrity checks
export type IntegrityCheckId =
  | "player_ids_valid"
  | "numeric_values_valid"
  | "dates_valid"
  | "no_duplicate_transactions"
  | "no_empty_nicknames";

// Consistency checks
export type ConsistencyCheckId =
  | "player_count_consistent"
  | "player_ids_match_between_sheets"
  | "win_loss_distribution_valid"
  | "user_details_players_in_geral"
  | "agents_have_rakeback";

// Math checks
export type MathCheckId =
  | "game_totals_sum_to_general"
  | "fee_totals_valid"
  | "partidas_values_valid"
  | "transaction_balances_coherent";

export type ValidationCheckId =
  | StructureCheckId
  | IntegrityCheckId
  | ConsistencyCheckId
  | MathCheckId;

export type ValidationCheckCategory = "structure" | "integrity" | "consistency" | "math";
export type ValidationCheckSeverity = "critical" | "warning" | "info";
export type ValidationCheckStatus = "passed" | "warning" | "failed";

export type ValidationCheck = {
  id: ValidationCheckId;
  label: string;
  description: string;
  status: ValidationCheckStatus;
  details?: string;
  count?: number;
  category?: ValidationCheckCategory;
  severity?: ValidationCheckSeverity;
  // Debug info for collapsible section
  debug?: {
    logic: string;       // Resumo da lógica
    expected: string;    // Valor/resultado esperado
    actual?: string;     // Valor/resultado atual
    failedItems?: string[]; // Lista de itens que falharam (max 10)
  };
};

export type ValidationWarning = {
  id: string;
  severity: "info" | "warning" | "error";
  title: string;
  description: string;
  suggestedAction?: string;
  relatedEntities?: string[];
};

export type DetectedInsight = {
  id: string;
  type: "shark" | "churn_risk" | "trend" | "debtor" | "high_volume" | "new_agent";
  icon: string;
  title: string;
  description: string;
  entities?: Array<{ id: string; name: string; value: number }>;
};

export type AgentSummary = {
  agentPpPokerId: string;
  agentNickname: string;
  playerCount: number;
  totalRake: number;
  rakebackPercent: number;
  estimatedCommission: number;
  status: "active" | "new";
};

export type ValidationResult = {
  // Overall quality
  qualityScore: number; // 0-100
  passedChecks: number;
  totalChecks: number;
  hasBlockingErrors: boolean;

  // Detailed checks
  checks: ValidationCheck[];
  warnings: ValidationWarning[];
  insights: DetectedInsight[];

  // Aggregated data for display
  period: {
    start: string;
    end: string;
    days: number;
  };

  stats: {
    totalPlayers: number;
    newPlayers: number;
    existingPlayers: number;
    winners: number;
    losers: number;
    totalWinnings: number;
    totalRake: number;
    avgWinningsPerPlayer: number;
    totalTransactions: number;
    transactionVolume: number;
    avgTransactionValue: number;
    totalSessions: number;
    cashGameSessions: number;
    mttSessions: number;
    sitNGoSessions: number;
  };

  agents: AgentSummary[];

  // Distribution data for charts
  gameTypeDistribution: Array<{
    type: string;
    label: string;
    value: number;
    percentage: number;
  }>;

  topPerformers: {
    majorWinner: { name: string; value: number } | null;
    majorLoser: { name: string; value: number } | null;
  };
};

export type ImportValidationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedData: ParsedImportData;
  validationResult: ValidationResult;
  onApprove: () => void;
  onReject: () => void;
  isProcessing?: boolean;
};
