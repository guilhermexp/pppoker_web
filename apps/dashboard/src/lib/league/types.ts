// Types for PPPoker League Excel Import and Validation
// SEPARATE from club validator - DO NOT mix with poker/types.ts

// =============================================================================
// GERAL DO PPST - Resumo por Liga (Torneios)
// =============================================================================

export type ParsedLeagueGeralPPST = {
  // Identificação (A-D)
  periodo: string | null; // A - Período (YYYY/MM/DD - YYYY/MM/DD UTC -0500)
  superUnionId: number | null; // B - ID da SuperUnion ("/" = null)
  ligaNome: string; // C - Nome da Liga
  ligaId: number; // D - ID da Liga

  // Ganhos do Jogador (E-H)
  ganhosJogador: number; // E - Ganhos do jogador
  valorTicketGanho: number; // F - Valor do ticket ganho
  buyinTicket: number; // G - Buy-in de ticket
  valorPremioPersonalizado: number; // H - Valor do prêmio personalizado

  // Ganhos da Liga (I-N)
  ganhosLigaGeral: number; // I - Geral
  ganhosLigaTaxa: number; // J - Taxa
  buyinSpinup: number; // K - Buy-in de SPINUP
  premiacaoSpinup: number; // L - Premiação de SPINUP
  valorTicketEntregue: number; // M - Valor do ticket entregue
  buyinTicketLiga: number; // N - Buy-in de ticket (liga)

  // Gap (O)
  gapGarantido: number | null; // O - Gap garantido (pode ser null em linhas de dados)

  // Status para preview de importação
  importStatus?: "new" | "existing" | "error";
  importMessage?: string;
};

// Bloco de dados Geral PPST (agrupa ligas por período/contexto)
export type ParsedLeagueGeralPPSTBloco = {
  contexto: {
    entidadeTipo: "Liga" | "SuperUnion";
    entidadeId: number;
    taxaCambio: string; // e.g., "1:5", "1:40"
  };
  periodo: {
    dataInicio: string; // YYYY/MM/DD
    dataFim: string; // YYYY/MM/DD
    timezone: string; // e.g., "UTC -0500"
  };
  ligas: ParsedLeagueGeralPPST[];
  total: {
    ganhosJogador: number;
    valorTicketGanho: number;
    buyinTicket: number;
    valorPremioPersonalizado: number;
    ganhosLigaGeral: number;
    ganhosLigaTaxa: number;
    buyinSpinup: number;
    premiacaoSpinup: number;
    valorTicketEntregue: number;
    buyinTicketLiga: number;
    gapGarantido: number;
  };
};

// =============================================================================
// JOGOS PPST - Dados Individuais de Torneios
// =============================================================================

// Tipos de jogo suportados
// - PPST/NLH: Torneio No-Limit Hold'em regular
// - PPST/SPINUP: Spin & Go
// - PPST/NLH PKO: Torneio NLH com Progressive Knockout
// - PPST/NLH MKO: Torneio NLH com Mystery Knockout
// - PPST/PLO5 PKO: Torneio PLO5 com Progressive Knockout
// - E outras variantes com PKO/MKO
export type LeagueTipoJogoBase =
  | "PPST/NLH"
  | "PPST/SPINUP"
  | "PPST/PLO"
  | "PPST/PLO5";
export type LeagueTipoJogo =
  | "PPST/NLH"
  | "PPST/SPINUP"
  | "PPST/NLH PKO"
  | "PPST/NLH MKO"
  | "PPST/PLO PKO"
  | "PPST/PLO MKO"
  | "PPST/PLO5 PKO"
  | "PPST/PLO5 MKO"
  | string; // Allow other variants

// Metadados do jogo (header de 3 linhas)
export type ParsedLeagueJogoMetadata = {
  dataInicio: string; // YYYY/MM/DD
  horaInicio: string; // HH:MM
  dataFim: string;
  horaFim: string;
  idJogo: string; // e.g., "251208081611-304710"
  nomeMesa: string; // e.g., "REENTRY"
  tipoJogo: LeagueTipoJogo;
  subtipo?: "satellite" | "regular" | "knockout"; // satellite = satélite, knockout = PKO/MKO
  buyInBase: number; // e.g., 9 (from "9+1") ou 4.5 (from "4.5+4.5+1")
  buyInBounty?: number; // Só para PKO/MKO: e.g., 4.5 (from "4.5+4.5+1")
  buyInTaxa: number; // e.g., 1 (from "9+1" ou "4.5+4.5+1")
  premiacaoGarantida: number | null; // Só para torneios com garantido
  criadorId: string; // ppPokerId do criador
  criadorNome: string; // Nickname do criador
};

// Jogador em um jogo PPST - NLH
// Colunas: A=SuperUnion, B=Liga, C=Clube, D=NomeClube, E=Jogador, F=Apelido, G=Memo, H=Ranking, I=BuyIn, J=Ticket, K=Ganhos, L=Taxa, M=Gap
export type ParsedLeagueJogadorNLH = {
  superUnionId: number | null; // A - ID da SuperUnion
  ligaId: number; // B - ID de Liga
  clubeId: number; // C - ID de Clube
  clubeNome: string; // D - Nome do Clube
  jogadorId: number; // E - ID do jogador
  apelido: string; // F - Apelido
  nomeMemorado: string; // G - Nome de memorando
  ranking: number; // H - Ranking
  buyinFichas: number; // I - Buy-in de fichas
  buyinTicket: number; // J - Buy-in de ticket
  ganhos: number; // K - Ganhos
  taxa: number; // L - Taxa
  gapGarantido: number | null; // M - Gap garantido
};

// Jogador em um jogo PPST - SPINUP
// Colunas: A=SuperUnion, B=Liga, C=Clube, D=NomeClube, E=Jogador, F=Apelido, G=Memo, H=Ranking, I=BuyIn, J=Premio, K=Ganhos
export type ParsedLeagueJogadorSPINUP = {
  superUnionId: number | null; // A - ID da SuperUnion
  ligaId: number; // B - ID de Liga
  clubeId: number; // C - ID de Clube
  clubeNome: string; // D - Nome do Clube
  jogadorId: number; // E - ID do jogador
  apelido: string; // F - Apelido
  nomeMemorado: string; // G - Nome de memorando
  ranking: number; // H - Ranking
  buyinFichas: number; // I - Buy-in de fichas
  premio: number; // J - Prêmio (sorteado)
  ganhos: number; // K - Ganhos
};

// Jogador unificado (NLH, SPINUP, PKO/MKO, Satellite)
export type ParsedLeagueJogadorPPST = {
  superUnionId: number | null;
  ligaId: number;
  clubeId: number;
  clubeNome: string;
  jogadorId: number;
  apelido: string;
  nomeMemorado: string;
  ranking: number;
  buyinFichas: number;
  // Campo comum
  ganhos: number;
  // Campos específicos NLH regular
  buyinTicket?: number;
  taxa?: number;
  gapGarantido?: number | null;
  // Campos específicos SPINUP
  premio?: number;
  // Campos específicos PKO/MKO (knockout)
  recompensa?: number; // "De recompensa" - bounty ganho
  // Campos específicos Satellite
  nomeTicket?: string; // "Nome do ticket"
  valorTicket?: number; // "Valor do ticket"
};

// Total por liga em um jogo
export type ParsedLeagueTotalLiga = {
  ligaId: number;
  buyinFichas: number;
  ganhos: number;
  // Campos específicos NLH regular
  buyinTicket?: number;
  taxa?: number;
  gapGarantido?: number;
  // Campos específicos SPINUP
  premio?: number;
  // Campos específicos PKO/MKO (knockout)
  recompensa?: number;
  // Campos específicos Satellite
  valorTicket?: number;
};

// Total geral de um jogo
export type ParsedLeagueTotalGeral = {
  buyinFichas: number;
  ganhos: number;
  // Campos específicos NLH regular
  buyinTicket?: number;
  taxa?: number;
  gapGarantido?: number;
  // Campos específicos SPINUP
  premio?: number;
  // Campos específicos PKO/MKO (knockout)
  recompensa?: number;
  // Campos específicos Satellite
  valorTicket?: number;
};

// Um jogo PPST completo
export type ParsedLeagueJogoPPST = {
  metadata: ParsedLeagueJogoMetadata;
  jogadores: ParsedLeagueJogadorPPST[];
  totaisPorLiga: ParsedLeagueTotalLiga[];
  totalGeral: ParsedLeagueTotalGeral;
  // Status para preview
  importStatus?: "new" | "existing" | "error";
  importMessage?: string;
};

// =============================================================================
// GERAL DO PPSR - Resumo por Liga (Cash Games)
// =============================================================================

// Dados de uma liga no Geral PPSR (uma linha na tabela)
export type ParsedLeagueGeralPPSRLiga = {
  superUnionId: number | null; // A - ID da SuperUnion ("/" = null)
  ligaNome: string; // B - Nome da Liga
  ligaId: number; // C - ID da Liga
  classificacaoPPSR: string; // D - Classificação PPSR
  // Taxa de câmbio das fichas - Ganhos do Jogador (E-H)
  ganhosJogadorGeral: number; // E - Geral
  ganhosJogadorDeAdversarios: number; // F - De adversários
  ganhosJogadorDeJackpot: number; // G - De Jackpot
  ganhosJogadorDeDividirEV: number; // H - De Dividir EV
  // Ganhos da Liga (I-M)
  ganhosLigaGeral: number; // I - Geral
  ganhosLigaTaxa: number; // J - Taxa
  ganhosLigaTaxaJackpot: number; // K - Taxa do Jackpot
  ganhosLigaPremioJackpot: number; // L - Prêmio Jackpot
  ganhosLigaDividirEV: number; // M - Dividir EV
  // Status para preview
  importStatus?: "new" | "existing" | "error";
  importMessage?: string;
};

// Bloco completo do Geral PPSR (header + ligas + total)
export type ParsedLeagueGeralPPSRBloco = {
  contexto: {
    entidadeTipo: "Liga" | "SuperUnion";
    entidadeId: number;
    taxaCambio: string; // e.g., "1:0", "1:5"
  };
  periodo: {
    dataInicio: string; // YYYY/MM/DD
    dataFim: string; // YYYY/MM/DD
    timezone: string; // e.g., "UTC -0500"
  };
  ligas: ParsedLeagueGeralPPSRLiga[];
  total: {
    ganhosJogadorGeral: number;
    ganhosJogadorDeAdversarios: number;
    ganhosJogadorDeJackpot: number;
    ganhosJogadorDeDividirEV: number;
    ganhosLigaGeral: number;
    ganhosLigaTaxa: number;
    ganhosLigaTaxaJackpot: number;
    ganhosLigaPremioJackpot: number;
    ganhosLigaDividirEV: number;
  };
};

// Alias for backwards compatibility
export type ParsedLeagueGeralPPSR = ParsedLeagueGeralPPSRLiga;

// =============================================================================
// JOGOS PPSR - Dados Individuais de Cash Games
// =============================================================================

// Tipos de cash game suportados
// - PPSR/NLH: No-Limit Hold'em
// - PPSR/PLO: Pot-Limit Omaha
// - PPSR/PLO5: Pot-Limit Omaha 5 cartas
// - PPSR/6+: Short Deck
// - PPSR/6+ NLH: Short Deck NLH
// - PPSR/PLO6: PLO com 6 cartas
// - PPSR/OFC: Open Face Chinese
// - PPSR/NLHoldem: NL Hold'em
// - PPSR/FLASH/NLH: Flash NLH
// - PPSR/3-1: 3-1 Draw
// Modificadores: (Bomb Pot), (Straddle), (Double Board), etc.
export type LeagueTipoCash =
  | "PPSR/NLH"
  | "PPSR/NLHOLDEM"
  | "PPSR/PLO"
  | "PPSR/PLO5"
  | "PPSR/PLO6"
  | "PPSR/6+"
  | "PPSR/6+ NLH"
  | "PPSR/OFC"
  | "PPSR/FLASH/NLH"
  | "PPSR/3-1"
  | string; // Allow other variants

// Metadados do jogo cash (header de 3 linhas)
export type ParsedLeagueCashMetadata = {
  dataInicio: string; // YYYY/MM/DD
  horaInicio: string; // HH:MM
  dataFim: string;
  horaFim: string;
  idJogo: string; // e.g., "251208000222-292842"
  nomeMesa: string; // e.g., "?FIVE 100BB?"
  tipoCash: LeagueTipoCash; // e.g., "PPSR/PLO5"
  modificador?: string; // e.g., "Bomb Pot", "Straddle"
  blinds: string; // e.g., "2.5/5"
  smallBlind: number;
  bigBlind: number;
  rakePercent: number; // e.g., 5 (from "5%")
  rakeCap: number; // e.g., 5 (from "5BB")
  rakeCapType?: string; // "BB", "Blinds", or "Ante"
  duracao: string; // e.g., "4.5h"
  duracaoHoras: number; // e.g., 4.5
  criadorId: string; // ppPokerId do criador (from "By SupervisorMesas...")
  criadorNome: string; // Nickname do criador
};

// Jogador em um jogo PPSR (Cash)
// Colunas: B=SuperUnion, C=Liga, D=Clube, E=NomeClube, F=Jogador, G=Apelido, H=Memo,
//          I=BuyIn, J=Mãos, K=GanhosGeral, L=DeAdversarios, M=DeJackpot, N=DeDividirEV,
//          O=GanhosClubeGeral, P=Taxa, Q=TaxaJackpot, R=PremiosJackpot, S=DividirEV
export type ParsedLeagueJogadorPPSR = {
  superUnionId: number | null; // B - ID da SuperUnion
  ligaId: number; // C - ID de Liga
  clubeId: number; // D - ID de Clube
  clubeNome: string; // E - Nome do Clube
  jogadorId: number; // F - ID do jogador
  apelido: string; // G - Apelido
  nomeMemorado: string; // H - Nome de memorando
  buyinFichas: number; // I - Buy-in de fichas
  maos: number; // J - Mãos jogadas
  // Ganhos do jogador (K-N)
  ganhosJogadorGeral: number; // K - Geral
  ganhosDeAdversarios: number; // L - De adversários
  ganhosDeJackpot: number; // M - De Jackpot
  ganhosDeDividirEV: number; // N - De Dividir EV
  // Ganhos do clube (O-S)
  ganhosClubeGeral: number; // O - Geral
  taxa: number; // P - Taxa (rake)
  taxaJackpot: number; // Q - Taxa do Jackpot
  premiosJackpot: number; // R - Prêmios Jackpot
  dividirEV: number; // S - Dividir EV
};

// Total por liga em um jogo cash
export type ParsedLeagueTotalLigaPPSR = {
  ligaId: number;
  buyinFichas: number;
  maos: number;
  ganhosJogadorGeral: number;
  ganhosDeAdversarios: number;
  ganhosDeJackpot: number;
  ganhosDeDividirEV: number;
  ganhosClubeGeral: number;
  taxa: number;
  taxaJackpot: number;
  premiosJackpot: number;
  dividirEV: number;
};

// Total geral de um jogo cash
export type ParsedLeagueTotalGeralPPSR = {
  buyinFichas: number;
  maos: number;
  ganhosJogadorGeral: number;
  ganhosDeAdversarios: number;
  ganhosDeJackpot: number;
  ganhosDeDividirEV: number;
  ganhosClubeGeral: number;
  taxa: number;
  taxaJackpot: number;
  premiosJackpot: number;
  dividirEV: number;
};

// Um jogo PPSR (Cash) completo
export type ParsedLeagueJogoPPSR = {
  metadata: ParsedLeagueCashMetadata;
  jogadores: ParsedLeagueJogadorPPSR[];
  totaisPorLiga: ParsedLeagueTotalLigaPPSR[];
  totalGeral: ParsedLeagueTotalGeralPPSR;
  // Status para preview
  importStatus?: "new" | "existing" | "error";
  importMessage?: string;
};

// =============================================================================
// CONTAINER PRINCIPAL - ParsedLeagueImportData
// =============================================================================

export type ParsedLeagueImportData = {
  // Dados parseados
  geralPPST: ParsedLeagueGeralPPSTBloco[];
  jogosPPST: ParsedLeagueJogoPPST[];
  geralPPSR: ParsedLeagueGeralPPSRBloco[];
  jogosPPSR: ParsedLeagueJogoPPSR[];

  // Metadados do arquivo
  periodStart?: string;
  periodEnd?: string;
  fileName?: string;
  fileSize?: number;

  // Contagens para validação - PPST
  geralPPSTLigaCount?: number;
  jogosPPSTCount?: number;
  jogosPPSTJogadorCount?: number;
  jogosPPSTInicioCount?: number; // Contagem de "Início:" na planilha para validação cruzada
  // Contagens para validação - PPSR
  geralPPSRLigaCount?: number;
  jogosPPSRCount?: number;
  jogosPPSRJogadorCount?: number;
  jogosPPSRInicioCount?: number; // Contagem de "Início:" na planilha para validação cruzada

  // Formatos de torneio não reconhecidos pelo parser
  unknownGameFormats?: Array<{
    gameId: string;
    rawText: string;
    rowIndex: number;
  }>;

  // Formatos de cash não reconhecidos pelo parser
  unknownCashFormats?: Array<{
    gameId: string;
    rawText: string;
    rowIndex: number;
  }>;
};

// =============================================================================
// VALIDATION TYPES
// =============================================================================

// Structure checks para Liga
export type LeagueStructureCheckId =
  | "geral_ppst_sheet_present"
  | "jogos_ppst_sheet_present"
  | "geral_ppsr_sheet_present"
  | "jogos_ppsr_sheet_present"
  | "period_detected"
  | "unknown_game_formats"
  | "unknown_cash_formats";

// Integrity checks para Liga
export type LeagueIntegrityCheckId =
  | "liga_ids_valid"
  | "clube_ids_valid"
  | "jogador_ids_valid"
  | "numeric_values_valid"
  | "rankings_valid";

// Consistency checks para Liga
export type LeagueConsistencyCheckId =
  | "ligas_in_geral_match_jogos"
  | "totais_liga_match_jogadores";

// Math checks para Liga
export type LeagueMathCheckId =
  | "formula_columns_consistent"
  | "geral_totals_sum_correct"
  | "jogos_totals_sum_correct";

export type LeagueValidationCheckId =
  | LeagueStructureCheckId
  | LeagueIntegrityCheckId
  | LeagueConsistencyCheckId
  | LeagueMathCheckId;

export type LeagueValidationCheckCategory =
  | "structure"
  | "integrity"
  | "consistency"
  | "math";
export type LeagueValidationCheckSeverity = "critical" | "warning" | "info";
export type LeagueValidationCheckStatus = "passed" | "warning" | "failed";

export type LeagueValidationCheck = {
  id: LeagueValidationCheckId;
  label: string;
  description: string;
  status: LeagueValidationCheckStatus;
  details?: string;
  count?: number;
  category?: LeagueValidationCheckCategory;
  severity?: LeagueValidationCheckSeverity;
  debug?: {
    logic: string;
    expected: string;
    actual?: string;
    failedItems?: string[];
  };
};

export type LeagueValidationWarning = {
  id: string;
  severity: "info" | "warning" | "error";
  title: string;
  description: string;
  suggestedAction?: string;
};

export type LeagueValidationResult = {
  // Overall quality
  qualityScore: number; // 0-100
  passedChecks: number;
  totalChecks: number;
  hasBlockingErrors: boolean;

  // Detailed checks
  checks: LeagueValidationCheck[];
  warnings: LeagueValidationWarning[];

  // Aggregated data for display
  period: {
    start: string;
    end: string;
    days: number;
  };

  stats: {
    // PPST Stats
    totalLigasPPST: number;
    totalJogosPPST: number;
    totalJogadoresPPST: number; // Jogadores únicos
    totalParticipacoesPPST?: number; // Total de participações (entradas)
    totalBuyinPPST: number;
    totalGanhosPPST: number;
    totalTaxaPPST: number;
    totalGapGarantidoPPST: number;
    // PPSR Stats
    totalLigasPPSR: number;
    totalJogosPPSR: number;
    totalJogadoresPPSR: number; // Jogadores únicos
    totalParticipacoesPPSR?: number; // Total de participações (entradas)
    totalMaosPPSR: number;
    totalBuyinPPSR: number;
    totalGanhosPPSR: number;
    totalTaxaPPSR: number;
  };

  // Distribuição por tipo de jogo
  gameTypeDistribution: Array<{
    type: "NLH" | "SPINUP" | "KNOCKOUT" | "SATELLITE" | "CASH" | string;
    label: string;
    count: number;
    percentage: number;
  }>;

  // Top ligas
  topLigas: Array<{
    ligaId: number;
    ligaNome: string;
    totalGanhos: number;
    totalTaxa: number;
  }>;
};

// =============================================================================
// MODAL PROPS
// =============================================================================

export type LeagueImportValidationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedData: ParsedLeagueImportData;
  validationResult: LeagueValidationResult;
  onApprove: () => void;
  onReject: () => void;
  isProcessing?: boolean;
};
