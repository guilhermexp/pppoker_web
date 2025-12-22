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

// Metadados do jogo (header de 3 linhas)
export type ParsedLeagueJogoMetadata = {
  dataInicio: string; // YYYY/MM/DD
  horaInicio: string; // HH:MM
  dataFim: string;
  horaFim: string;
  idJogo: string; // e.g., "251208081611-304710"
  nomeMesa: string; // e.g., "REENTRY"
  tipoJogo: "PPST/NLH" | "PPST/SPINUP";
  buyInBase: number; // e.g., 9 (from "9+1")
  buyInTaxa: number; // e.g., 1 (from "9+1")
  premiacaoGarantida: number | null; // Só para NLH
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

// Jogador unificado (NLH ou SPINUP)
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
  // Campos específicos NLH
  buyinTicket?: number;
  taxa?: number;
  gapGarantido?: number | null;
  // Campos específicos SPINUP
  premio?: number;
  // Campo comum
  ganhos: number;
};

// Total por liga em um jogo
export type ParsedLeagueTotalLiga = {
  ligaId: number;
  buyinFichas: number;
  buyinTicket?: number; // Só NLH
  ganhos: number;
  taxa?: number; // Só NLH
  gapGarantido?: number; // Só NLH
  premio?: number; // Só SPINUP
};

// Total geral de um jogo
export type ParsedLeagueTotalGeral = {
  buyinFichas: number;
  buyinTicket?: number;
  ganhos: number;
  taxa?: number;
  gapGarantido?: number;
  premio?: number;
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
// GERAL DO PPSR - Resumo por Liga (Cash Games) - STUB para implementar depois
// =============================================================================

export type ParsedLeagueGeralPPSR = {
  // TODO: Implementar quando receber mapeamento
  ligaId: number;
  ligaNome: string;
  // ... campos a definir
  importStatus?: "new" | "existing" | "error";
  importMessage?: string;
};

// =============================================================================
// JOGOS PPSR - Dados Individuais de Cash - STUB para implementar depois
// =============================================================================

export type ParsedLeagueJogoPPSR = {
  // TODO: Implementar quando receber mapeamento
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
  geralPPSR: ParsedLeagueGeralPPSR[];
  jogosPPSR: ParsedLeagueJogoPPSR[];

  // Metadados do arquivo
  periodStart?: string;
  periodEnd?: string;
  fileName?: string;
  fileSize?: number;

  // Contagens para validação
  geralPPSTLigaCount?: number;
  jogosPPSTCount?: number;
  jogosPPSTJogadorCount?: number;
  geralPPSRLigaCount?: number;
  jogosPPSRCount?: number;
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
  | "period_detected";

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
    totalJogadoresPPST: number;
    totalBuyinPPST: number;
    totalGanhosPPST: number;
    totalTaxaPPST: number;
    totalGapGarantidoPPST: number;
    // PPSR Stats (para implementar)
    totalLigasPPSR: number;
    totalJogosPPSR: number;
    totalJogadoresPPSR: number;
  };

  // Distribuição por tipo de jogo
  gameTypeDistribution: Array<{
    type: "NLH" | "SPINUP" | "CASH";
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
