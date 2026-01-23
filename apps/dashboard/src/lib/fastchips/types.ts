// Types for Fastchips (Chippix) Excel Import and Validation

// Operation type: Entrada or Saída
export type FastchipsOperationType = "Entrada" | "Saída";

// Purpose/Finalidade
export type FastchipsPurpose =
  | "Recebimento"
  | "Pagamento"
  | "Saque"
  | "Serviço";

// Fee rates allowed
export type FastchipsFeeRate = 0 | 0.5 | 1.5;

/**
 * Parsed operation from Fastchips spreadsheet
 * Maps to spreadsheet columns A-L
 */
export type ParsedFastchipsOperation = {
  // Column A: Data (DD-MM-YYYY HH:MM)
  occurredAt: string;
  // Column B: Tipo (Entrada/Saída)
  operationType: FastchipsOperationType;
  // Column C: Finalidade (Recebimento/Pagamento/Saque/Serviço)
  purpose: FastchipsPurpose;
  // Column D: Entrada bruta
  grossEntry: number | null;
  // Column E: Saída bruta
  grossExit: number | null;
  // Column F: Entrada líquida
  netEntry: number | null;
  // Column G: Saída líquida
  netExit: number | null;
  // Column H: Integrante
  memberName: string;
  // Column I: Taxa da operação (0, 0.5, 1.5)
  feeRate: number;
  // Column J: Id Jogador (PPPoker ID)
  ppPokerId: string | null;
  // Column K: Id da operação (24 hex chars)
  operationId: string;
  // Column L: Id do pagamento
  paymentId: string;
  // Validation status
  importStatus?: "new" | "duplicate" | "error";
  importMessage?: string;
};

/**
 * Full import data structure for Fastchips
 */
export type ParsedFastchipsImportData = {
  operations: ParsedFastchipsOperation[];
  periodStart: string | null;
  periodEnd: string | null;
};

/**
 * Member extracted from operations
 */
export type ExtractedFastchipsMember = {
  name: string;
  ppPokerId: string | null;
  operationCount: number;
  totalGrossEntry: number;
  totalGrossExit: number;
  isNew: boolean;
};

/**
 * Validation check result
 */
export type FastchipsValidationCheckId =
  // Structure rules
  | "sheet_present"
  | "columns_complete"
  | "has_operations"
  // Integrity rules
  | "dates_valid"
  | "operation_ids_valid"
  | "numeric_values_valid"
  | "operation_types_valid"
  | "purposes_valid"
  | "fee_rates_valid"
  // Consistency rules
  | "entry_has_entry_values"
  | "exit_has_exit_values"
  | "no_duplicate_operations"
  // Math rules
  | "net_equals_gross_minus_fee"
  | "totals_balance";

export type FastchipsValidationCheck = {
  id: FastchipsValidationCheckId;
  label: string;
  description: string;
  status: "passed" | "failed" | "warning";
  details: string;
  category: "structure" | "integrity" | "consistency" | "math";
  severity: "critical" | "warning" | "info";
  count?: number;
  debug: {
    logic: string;
    expected: string;
    actual?: string;
    failedItems?: string[];
  };
};

/**
 * Full validation result
 */
export type FastchipsValidationResult = {
  qualityScore: number; // 0-100
  hasBlockingErrors: boolean;
  checks: FastchipsValidationCheck[];
  warnings: string[];
  insights: string[];
  quality: {
    criticalPassed: number;
    criticalFailed: number;
    warningsPassed: number;
    warningsFailed: number;
  };
};

/**
 * Import statistics
 */
export type FastchipsImportStats = {
  totalOperations: number;
  totalEntries: number;
  totalExits: number;
  uniqueMembers: number;
  newMembers: number;
  grossEntryTotal: number;
  grossExitTotal: number;
  netEntryTotal: number;
  netExitTotal: number;
  totalFees: number;
  balance: number;
  byPurpose: {
    recebimento: { count: number; total: number };
    pagamento: { count: number; total: number };
    saque: { count: number; total: number };
    servico: { count: number; total: number };
  };
};
