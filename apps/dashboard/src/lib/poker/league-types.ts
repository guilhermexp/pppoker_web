// Types for PPPoker League Excel Import and Validation
// Note: League imports have an additional "Geral da Liga" sheet before the club-level sheets

import type {
  AgentSummary,
  DetectedInsight,
  ParsedDemonstrativo,
  ParsedDetailed,
  ParsedPlayer,
  ParsedRakeback,
  ParsedSession,
  ParsedSummary,
  ParsedTransaction,
  ValidationCheck,
  ValidationWarning,
} from "./types";

// Club row from "Geral de Liga" sheet
// Maps columns A-AP from the Excel sheet (42 columns)
export type ParsedLeagueClubRow = {
  // Section 1: Club Info (A-B)
  clubName: string; // A: Nome do Clube
  clubId: string; // B: ID de clube

  // Section 2: Classifications (C-F)
  classificationPpsr: number; // C: Classificação PPSR
  classificationRingGame: number; // D: Classificação Ring Game
  classificationRgCustom: number; // E: Classificação de RG Personalizado
  classificationMtt: number; // F: Classificação MTT

  // Section 3: Player Earnings - Ganhos do jogador (G-P)
  playerEarningsGeneral: number; // G: Geral
  playerEarningsRingGames: number; // H: Ring Games
  playerEarningsMttSitNGo: number; // I: MTT, SItNGo
  playerEarningsSpinUp: number; // J: SPINUP
  playerEarningsCaribbeanPoker: number; // K: Caribbean+ Poker
  playerEarningsColorGame: number; // L: COLOR GAME
  playerEarningsCrash: number; // M: CRASH
  playerEarningsLuckyDraw: number; // N: LUCKY DRAW
  playerEarningsJackpot: number; // O: Jackpot
  playerEarningsSplitEv: number; // P: Dividir EV

  // Section 4: Ticket/Prize (Q-S)
  ticketValueWon: number; // Q: Valor do ticket ganho
  ticketBuyInPlayer: number; // R: Buy-in de ticket
  customPrizeValue: number; // S: Valor do prêmio personalizado

  // Section 5: Club Earnings - Ganhos do clube (T-AL)
  clubEarningsGeneral: number; // T: Geral
  clubEarningsFee: number; // U: Taxa
  clubEarningsFeePpst: number; // V: Taxa (jogos PPST)
  clubEarningsFeeNonPpst: number; // W: Taxa (jogos não PPST)
  clubEarningsFeePpsr: number; // X: Taxa (jogos PPSR)
  clubEarningsFeeNonPpsr: number; // Y: Taxa (jogos não PPSR)
  clubEarningsSpinUpBuyIn: number; // Z: Buy-in de SPINUP
  clubEarningsSpinUpPrize: number; // AA: Premiação de SPINUP
  clubEarningsCaribbeanBets: number; // AB: Apostas de Caribbean+ Poker
  clubEarningsCaribbeanPrize: number; // AC: Premiação de Caribbean+ Poker
  clubEarningsColorGameBets: number; // AD: Apostas do COLOR GAME
  clubEarningsColorGamePrize: number; // AE: Premiação do COLOR GAME
  clubEarningsCrashBets: number; // AF: Apostas (CRASH)
  clubEarningsCrashPrize: number; // AG: Prêmios (CRASH)
  clubEarningsLuckyDrawBets: number; // AH: Apostas de LUCKY DRAW
  clubEarningsLuckyDrawPrize: number; // AI: Premiação de LUCKY DRAW
  clubEarningsJackpotFee: number; // AJ: Taxa do Jackpot
  clubEarningsJackpotPrize: number; // AK: Prêmios Jackpot
  clubEarningsSplitEv: number; // AL: Dividir EV

  // Section 6: Final Ticket/Gap (AM-AP)
  ticketDeliveredValue: number; // AM: Valor do ticket entregue
  ticketDeliveredBuyIn: number; // AN: Buy-in de ticket
  guaranteedGap: number; // AO/AP: Gap garantido
};

// League-level summary (calculated from ParsedLeagueClubRow[])
export type ParsedLeagueSummary = {
  // Period info (from merged cell header)
  periodDate: string;
  periodUtcOffset: string;

  // Clubs data
  clubs: ParsedLeagueClubRow[];

  // Calculated totals
  totalClubs: number;

  // Classifications totals
  totalClassificationPpsr: number;
  totalClassificationRingGame: number;
  totalClassificationRgCustom: number;
  totalClassificationMtt: number;

  // Player earnings totals (Ganhos do jogador)
  totalPlayerEarningsGeneral: number;
  totalPlayerEarningsRingGames: number;
  totalPlayerEarningsMttSitNGo: number;
  totalPlayerEarningsSpinUp: number;
  totalPlayerEarningsCaribbeanPoker: number;
  totalPlayerEarningsColorGame: number;
  totalPlayerEarningsCrash: number;
  totalPlayerEarningsLuckyDraw: number;
  totalPlayerEarningsJackpot: number;
  totalPlayerEarningsSplitEv: number;

  // Ticket/Prize totals
  totalTicketValueWon: number;
  totalTicketBuyInPlayer: number;
  totalCustomPrizeValue: number;

  // Club earnings totals (Ganhos do clube)
  totalClubEarningsGeneral: number;
  totalClubEarningsFee: number;
  totalClubEarningsFeePpst: number;
  totalClubEarningsFeeNonPpst: number;
  totalClubEarningsFeePpsr: number;
  totalClubEarningsFeeNonPpsr: number;
  totalClubEarningsSpinUpBuyIn: number;
  totalClubEarningsSpinUpPrize: number;
  totalClubEarningsCaribbeanBets: number;
  totalClubEarningsCaribbeanPrize: number;
  totalClubEarningsColorGameBets: number;
  totalClubEarningsColorGamePrize: number;
  totalClubEarningsCrashBets: number;
  totalClubEarningsCrashPrize: number;
  totalClubEarningsLuckyDrawBets: number;
  totalClubEarningsLuckyDrawPrize: number;
  totalClubEarningsJackpotFee: number;
  totalClubEarningsJackpotPrize: number;
  totalClubEarningsSplitEv: number;

  // Final totals
  totalTicketDeliveredValue: number;
  totalTicketDeliveredBuyIn: number;
  totalGuaranteedGap: number;
};

// Club summary within a league (similar to ParsedSummary but with club context)
export type ParsedClubSummary = ParsedSummary & {
  clubId?: string;
  clubName?: string;
  leagueId?: string;
  periodStart?: string;
  periodEnd?: string;
};

// Extended import data for leagues
export type ParsedLeagueImportData = {
  // League-level summary (Geral da Liga) - NEW structure
  leagueSummary?: ParsedLeagueSummary;

  // Club-level data (same as regular import, but with club context)
  clubSummaries?: ParsedClubSummary[]; // Geral de Clube
  clubDetailed?: ParsedDetailed[]; // Detalhes de Clube

  // Standard club data
  players?: ParsedPlayer[]; // Detalhes do usuário
  transactions?: ParsedTransaction[];
  sessions?: ParsedSession[];
  demonstrativo?: ParsedDemonstrativo[];
  rakebacks?: ParsedRakeback[]; // Retorno de taxa

  // Metadata
  periodStart?: string;
  periodEnd?: string;
  fileName?: string;
  fileSize?: number;
  sessionsUtcCount?: number;

  // League-specific metadata
  leagueId?: string;
  leagueName?: string;
  clubCount?: number;
};

// League validation result
export type LeagueValidationResult = {
  // Overall quality
  qualityScore: number; // 0-100
  passedChecks: number;
  totalChecks: number;
  hasBlockingErrors: boolean;

  // Detailed checks
  checks: ValidationCheck[];
  warnings: ValidationWarning[];
  insights: DetectedInsight[];

  // Period
  period: {
    start: string;
    end: string;
    days: number;
  };

  // League-specific stats
  stats: {
    // League level
    totalLeagues: number;
    totalClubs: number;

    // Player level
    totalPlayers: number;
    newPlayers: number;
    existingPlayers: number;
    winners: number;
    losers: number;

    // Financial
    totalWinnings: number;
    totalRake: number;
    avgWinningsPerPlayer: number;

    // Transactions
    totalTransactions: number;
    transactionVolume: number;
    avgTransactionValue: number;

    // Sessions
    totalSessions: number;
    cashGameSessions: number;
    mttSessions: number;
    sitNGoSessions: number;
  };

  agents: AgentSummary[];

  // Distribution data
  gameTypeDistribution: Array<{
    type: string;
    label: string;
    value: number;
    percentage: number;
  }>;

  // Club distribution (league-specific)
  clubDistribution: Array<{
    clubId: string;
    clubName: string;
    playerCount: number;
    totalRake: number;
    percentage: number;
  }>;

  topPerformers: {
    majorWinner: { name: string; value: number } | null;
    majorLoser: { name: string; value: number } | null;
  };
};

export type LeagueImportValidationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedData: ParsedLeagueImportData;
  validationResult: LeagueValidationResult;
  onApprove: () => void;
  onReject: () => void;
  isProcessing?: boolean;
};
