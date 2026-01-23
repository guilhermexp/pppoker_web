import type {
  ExtractedFastchipsMember,
  FastchipsImportStats,
  FastchipsValidationCheck,
  FastchipsValidationCheckId,
  FastchipsValidationResult,
  ParsedFastchipsImportData,
  ParsedFastchipsOperation,
} from "./types";

// ============================================================================
// FASTCHIPS VALIDATION RULES
// Based on Chippix spreadsheet structure with 12 columns (A-L)
// ============================================================================

type CheckCategory = "structure" | "integrity" | "consistency" | "math";
type CheckSeverity = "critical" | "warning" | "info";

interface ValidationRuleResult {
  passed: boolean;
  details: string;
  count?: number;
  debug: {
    logic: string;
    expected: string;
    actual?: string;
    failedItems?: string[];
  };
}

interface ValidationRule {
  id: FastchipsValidationCheckId;
  category: CheckCategory;
  severity: CheckSeverity;
  label: string;
  description: string;
  validate: (data: ParsedFastchipsImportData) => ValidationRuleResult;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates date string in DD-MM-YYYY HH:MM format
 */
function isValidFastchipsDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return false;

  const [, day, month, year, hour, minute] = match;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const h = Number(hour);
  const min = Number(minute);

  return d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2020 && y <= 2030
    && h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

/**
 * Validates operation ID (24 hex chars)
 */
function isValidOperationId(id: string): boolean {
  if (!id) return false;
  return /^[a-f0-9]{24}$/i.test(id);
}

/**
 * Valid operation types
 */
const VALID_OPERATION_TYPES = ["Entrada", "Saída"];

/**
 * Valid purposes
 */
const VALID_PURPOSES = ["Recebimento", "Pagamento", "Saque", "Serviço"];

/**
 * Valid fee rates
 */
const VALID_FEE_RATES = [0, 0.5, 1.5];

// ============================================================================
// STRUCTURE RULES - Check if the spreadsheet has the expected structure
// ============================================================================

const STRUCTURE_RULES: ValidationRule[] = [
  {
    id: "sheet_present",
    category: "structure",
    severity: "critical",
    label: "Sheet 'Operações' presente",
    description: "A planilha deve conter a sheet 'Operações'",
    validate: (data) => {
      const hasData = data.operations && Array.isArray(data.operations);
      return {
        passed: hasData,
        details: hasData ? "Sheet encontrada" : "Sheet 'Operações' não encontrada",
        debug: {
          logic: "Verifica se data.operations é um array",
          expected: "operations é array",
          actual: hasData ? "operations é array" : "operations não definido",
        },
      };
    },
  },
  {
    id: "columns_complete",
    category: "structure",
    severity: "critical",
    label: "12 colunas presentes (A-L)",
    description: "A planilha deve ter todas as 12 colunas obrigatórias",
    validate: (data) => {
      const operations = data.operations || [];
      if (operations.length === 0) {
        return {
          passed: false,
          details: "Sem dados para validar",
          debug: {
            logic: "Verifica se os campos obrigatórios existem",
            expected: "12 campos obrigatórios",
            actual: "Nenhum registro para validar",
          },
        };
      }

      const sample = operations[0];
      const requiredFields = [
        "occurredAt",
        "operationType",
        "purpose",
        "grossEntry",
        "grossExit",
        "netEntry",
        "netExit",
        "memberName",
        "feeRate",
        "ppPokerId",
        "operationId",
        "paymentId",
      ];

      const presentFields = requiredFields.filter((f) => f in sample);
      const missingFields = requiredFields.filter((f) => !(f in sample));
      const allPresent = presentFields.length === requiredFields.length;

      return {
        passed: allPresent,
        details: allPresent
          ? `${presentFields.length}/${requiredFields.length} campos`
          : `Faltando: ${missingFields.join(", ")}`,
        count: presentFields.length,
        debug: {
          logic: "Verifica se todas as 12 colunas estão mapeadas",
          expected: `${requiredFields.length} campos`,
          actual: `${presentFields.length} campos`,
          failedItems: missingFields,
        },
      };
    },
  },
  {
    id: "has_operations",
    category: "structure",
    severity: "critical",
    label: "Possui operações",
    description: "A planilha deve ter pelo menos uma operação",
    validate: (data) => {
      const count = data.operations?.length ?? 0;
      return {
        passed: count > 0,
        details: count > 0 ? `${count} operações` : "Nenhuma operação encontrada",
        count,
        debug: {
          logic: "Verifica se operations.length > 0",
          expected: "> 0 operações",
          actual: `${count} operações`,
        },
      };
    },
  },
];

// ============================================================================
// INTEGRITY RULES - Check if individual fields have valid values
// ============================================================================

const INTEGRITY_RULES: ValidationRule[] = [
  {
    id: "dates_valid",
    category: "integrity",
    severity: "critical",
    label: "Datas válidas (DD-MM-YYYY HH:MM)",
    description: "Todas as datas devem estar no formato DD-MM-YYYY HH:MM",
    validate: (data) => {
      const operations = data.operations || [];
      const invalidDates = operations.filter((op) => !isValidFastchipsDate(op.occurredAt));

      return {
        passed: invalidDates.length === 0,
        details: invalidDates.length === 0
          ? `${operations.length} datas válidas`
          : `${invalidDates.length} datas inválidas`,
        count: invalidDates.length,
        debug: {
          logic: "Verifica formato DD-MM-YYYY HH:MM",
          expected: "Todas as datas no formato correto",
          actual: `${invalidDates.length} inválidas`,
          failedItems: invalidDates.slice(0, 5).map((op) => op.occurredAt || "vazio"),
        },
      };
    },
  },
  {
    id: "operation_ids_valid",
    category: "integrity",
    severity: "critical",
    label: "IDs de operação válidos (24 hex)",
    description: "Todos os IDs de operação devem ser 24 caracteres hexadecimais",
    validate: (data) => {
      const operations = data.operations || [];
      const invalidIds = operations.filter((op) => !isValidOperationId(op.operationId));

      return {
        passed: invalidIds.length === 0,
        details: invalidIds.length === 0
          ? `${operations.length} IDs válidos`
          : `${invalidIds.length} IDs inválidos`,
        count: invalidIds.length,
        debug: {
          logic: "Verifica se operationId é hex de 24 chars",
          expected: "Todos os IDs no formato hex 24 chars",
          actual: `${invalidIds.length} inválidos`,
          failedItems: invalidIds.slice(0, 5).map((op) => op.operationId || "vazio"),
        },
      };
    },
  },
  {
    id: "numeric_values_valid",
    category: "integrity",
    severity: "critical",
    label: "Valores numéricos válidos",
    description: "Todos os valores numéricos devem ser números válidos",
    validate: (data) => {
      const operations = data.operations || [];
      const invalidOps = operations.filter((op) => {
        const gross = op.grossEntry ?? op.grossExit;
        const net = op.netEntry ?? op.netExit;
        return (
          (gross !== null && typeof gross !== "number") ||
          (net !== null && typeof net !== "number") ||
          typeof op.feeRate !== "number"
        );
      });

      return {
        passed: invalidOps.length === 0,
        details: invalidOps.length === 0
          ? "Todos os valores são numéricos"
          : `${invalidOps.length} operações com valores inválidos`,
        count: invalidOps.length,
        debug: {
          logic: "Verifica se grossEntry, grossExit, netEntry, netExit, feeRate são números",
          expected: "Todos os campos numéricos são números",
          actual: `${invalidOps.length} com valores inválidos`,
        },
      };
    },
  },
  {
    id: "operation_types_valid",
    category: "integrity",
    severity: "critical",
    label: "Tipos de operação válidos",
    description: "Tipo deve ser 'Entrada' ou 'Saída'",
    validate: (data) => {
      const operations = data.operations || [];
      const invalidOps = operations.filter(
        (op) => !VALID_OPERATION_TYPES.includes(op.operationType)
      );

      return {
        passed: invalidOps.length === 0,
        details: invalidOps.length === 0
          ? "Todos os tipos são válidos"
          : `${invalidOps.length} tipos inválidos`,
        count: invalidOps.length,
        debug: {
          logic: `Verifica se operationType é ${VALID_OPERATION_TYPES.join(" ou ")}`,
          expected: "Entrada ou Saída",
          actual: `${invalidOps.length} inválidos`,
          failedItems: invalidOps.slice(0, 5).map((op) => op.operationType || "vazio"),
        },
      };
    },
  },
  {
    id: "purposes_valid",
    category: "integrity",
    severity: "critical",
    label: "Finalidades válidas",
    description: "Finalidade deve ser Recebimento, Pagamento, Saque ou Serviço",
    validate: (data) => {
      const operations = data.operations || [];
      const invalidOps = operations.filter(
        (op) => !VALID_PURPOSES.includes(op.purpose)
      );

      return {
        passed: invalidOps.length === 0,
        details: invalidOps.length === 0
          ? "Todas as finalidades são válidas"
          : `${invalidOps.length} finalidades inválidas`,
        count: invalidOps.length,
        debug: {
          logic: `Verifica se purpose é ${VALID_PURPOSES.join(", ")}`,
          expected: VALID_PURPOSES.join(", "),
          actual: `${invalidOps.length} inválidos`,
          failedItems: invalidOps.slice(0, 5).map((op) => op.purpose || "vazio"),
        },
      };
    },
  },
  {
    id: "fee_rates_valid",
    category: "integrity",
    severity: "warning",
    label: "Taxas válidas (0, 0.5, 1.5)",
    description: "Taxa da operação deve ser 0, 0.5 ou 1.5",
    validate: (data) => {
      const operations = data.operations || [];
      const invalidOps = operations.filter(
        (op) => !VALID_FEE_RATES.includes(op.feeRate)
      );

      return {
        passed: invalidOps.length === 0,
        details: invalidOps.length === 0
          ? "Todas as taxas são válidas"
          : `${invalidOps.length} taxas fora do padrão`,
        count: invalidOps.length,
        debug: {
          logic: `Verifica se feeRate é ${VALID_FEE_RATES.join(", ")}`,
          expected: VALID_FEE_RATES.join(", "),
          actual: `${invalidOps.length} fora do padrão`,
          failedItems: invalidOps.slice(0, 5).map((op) => String(op.feeRate)),
        },
      };
    },
  },
];

// ============================================================================
// CONSISTENCY RULES - Check cross-field consistency
// ============================================================================

const CONSISTENCY_RULES: ValidationRule[] = [
  {
    id: "entry_has_entry_values",
    category: "consistency",
    severity: "warning",
    label: "Entradas têm valores de entrada",
    description: "Operações de Entrada devem ter grossEntry e netEntry preenchidos",
    validate: (data) => {
      const operations = data.operations || [];
      const entries = operations.filter((op) => op.operationType === "Entrada");
      const invalid = entries.filter(
        (op) => op.grossEntry === null || op.netEntry === null
      );

      return {
        passed: invalid.length === 0,
        details: invalid.length === 0
          ? `${entries.length} entradas com valores corretos`
          : `${invalid.length} entradas sem valores de entrada`,
        count: invalid.length,
        debug: {
          logic: "Verifica se Entrada tem grossEntry e netEntry preenchidos",
          expected: "grossEntry e netEntry não nulos para Entrada",
          actual: `${invalid.length} inconsistentes`,
        },
      };
    },
  },
  {
    id: "exit_has_exit_values",
    category: "consistency",
    severity: "warning",
    label: "Saídas têm valores de saída",
    description: "Operações de Saída devem ter grossExit e netExit preenchidos",
    validate: (data) => {
      const operations = data.operations || [];
      const exits = operations.filter((op) => op.operationType === "Saída");
      const invalid = exits.filter(
        (op) => op.grossExit === null || op.netExit === null
      );

      return {
        passed: invalid.length === 0,
        details: invalid.length === 0
          ? `${exits.length} saídas com valores corretos`
          : `${invalid.length} saídas sem valores de saída`,
        count: invalid.length,
        debug: {
          logic: "Verifica se Saída tem grossExit e netExit preenchidos",
          expected: "grossExit e netExit não nulos para Saída",
          actual: `${invalid.length} inconsistentes`,
        },
      };
    },
  },
  {
    id: "no_duplicate_operations",
    category: "consistency",
    severity: "warning",
    label: "Sem operações duplicadas",
    description: "Não deve haver operações com o mesmo ID",
    validate: (data) => {
      const operations = data.operations || [];
      const idCounts = new Map<string, number>();

      for (const op of operations) {
        const count = idCounts.get(op.operationId) ?? 0;
        idCounts.set(op.operationId, count + 1);
      }

      const duplicates = Array.from(idCounts.entries()).filter(([, count]) => count > 1);

      return {
        passed: duplicates.length === 0,
        details: duplicates.length === 0
          ? "Sem duplicatas"
          : `${duplicates.length} IDs duplicados`,
        count: duplicates.length,
        debug: {
          logic: "Verifica se cada operationId aparece apenas uma vez",
          expected: "Todos os IDs únicos",
          actual: `${duplicates.length} duplicatas`,
          failedItems: duplicates.slice(0, 5).map(([id]) => id),
        },
      };
    },
  },
];

// ============================================================================
// MATH RULES - Check mathematical consistency
// ============================================================================

const MATH_RULES: ValidationRule[] = [
  {
    id: "net_equals_gross_minus_fee",
    category: "math",
    severity: "warning",
    label: "Net = Gross - Taxa",
    description: "Valor líquido deve ser igual ao bruto menos a taxa",
    validate: (data) => {
      const operations = data.operations || [];
      const tolerance = 0.01; // 1 centavo de tolerância para arredondamento

      const invalid = operations.filter((op) => {
        const gross = op.operationType === "Entrada" ? op.grossEntry : op.grossExit;
        const net = op.operationType === "Entrada" ? op.netEntry : op.netExit;

        if (gross === null || net === null) return false;

        const expectedNet = gross - (gross * op.feeRate / 100);
        return Math.abs(net - expectedNet) > tolerance;
      });

      return {
        passed: invalid.length === 0,
        details: invalid.length === 0
          ? "Todos os cálculos conferem"
          : `${invalid.length} operações com cálculo incorreto`,
        count: invalid.length,
        debug: {
          logic: "Verifica se net = gross - (gross * feeRate / 100)",
          expected: "net === gross * (1 - feeRate/100)",
          actual: `${invalid.length} com diferença`,
        },
      };
    },
  },
  {
    id: "totals_balance",
    category: "math",
    severity: "info",
    label: "Balanço de totais",
    description: "Informativo: diferença entre entradas e saídas",
    validate: (data) => {
      const operations = data.operations || [];

      const totalGrossEntry = operations
        .filter((op) => op.operationType === "Entrada")
        .reduce((sum, op) => sum + (op.grossEntry ?? 0), 0);

      const totalGrossExit = operations
        .filter((op) => op.operationType === "Saída")
        .reduce((sum, op) => sum + (op.grossExit ?? 0), 0);

      const balance = totalGrossEntry - totalGrossExit;

      return {
        passed: true, // Always passes - informational
        details: `Balanço: R$ ${balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        debug: {
          logic: "Calcula totalEntradas - totalSaídas",
          expected: "N/A (informativo)",
          actual: `Entradas: R$ ${totalGrossEntry.toFixed(2)}, Saídas: R$ ${totalGrossExit.toFixed(2)}`,
        },
      };
    },
  },
];

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

const ALL_RULES: ValidationRule[] = [
  ...STRUCTURE_RULES,
  ...INTEGRITY_RULES,
  ...CONSISTENCY_RULES,
  ...MATH_RULES,
];

/**
 * Runs all validation rules and returns the results
 */
export function validateFastchipsImportData(
  data: ParsedFastchipsImportData
): FastchipsValidationResult {
  const checks: FastchipsValidationCheck[] = [];

  for (const rule of ALL_RULES) {
    const result = rule.validate(data);
    checks.push({
      id: rule.id,
      label: rule.label,
      description: rule.description,
      status: result.passed ? "passed" : rule.severity === "info" ? "passed" : rule.severity === "warning" ? "warning" : "failed",
      details: result.details,
      category: rule.category,
      severity: rule.severity,
      count: result.count,
      debug: result.debug,
    });
  }

  // Calculate quality metrics
  const criticalChecks = checks.filter((c) => c.severity === "critical");
  const warningChecks = checks.filter((c) => c.severity === "warning");

  const criticalPassed = criticalChecks.filter((c) => c.status === "passed").length;
  const criticalFailed = criticalChecks.filter((c) => c.status === "failed").length;
  const warningsPassed = warningChecks.filter((c) => c.status === "passed" || c.status === "warning").length;
  const warningsFailed = warningChecks.filter((c) => c.status === "failed").length;

  // Calculate quality score
  const totalWeight = criticalChecks.length * 2 + warningChecks.length;
  const passedWeight = criticalPassed * 2 + warningsPassed;
  const qualityScore = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  // Extract warnings
  const warnings = checks
    .filter((c) => c.status === "warning" || c.status === "failed")
    .map((c) => `${c.label}: ${c.details}`);

  // Generate insights
  const insights: string[] = [];
  const operations = data.operations || [];
  if (operations.length > 0) {
    const uniqueMembers = new Set(operations.map((op) => op.memberName)).size;
    insights.push(`${operations.length} operações de ${uniqueMembers} integrantes`);

    const entries = operations.filter((op) => op.operationType === "Entrada");
    const exits = operations.filter((op) => op.operationType === "Saída");
    insights.push(`${entries.length} entradas, ${exits.length} saídas`);
  }

  return {
    qualityScore,
    hasBlockingErrors: criticalFailed > 0,
    checks,
    warnings,
    insights,
    quality: {
      criticalPassed,
      criticalFailed,
      warningsPassed,
      warningsFailed,
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS FOR IMPORT PREVIEW
// ============================================================================

/**
 * Extracts unique members from operations
 */
export function extractMembersFromOperations(
  operations: ParsedFastchipsOperation[],
  existingMemberNames: Set<string> = new Set()
): ExtractedFastchipsMember[] {
  const memberMap = new Map<string, ExtractedFastchipsMember>();

  for (const op of operations) {
    const existing = memberMap.get(op.memberName);
    if (existing) {
      existing.operationCount++;
      if (op.operationType === "Entrada") {
        existing.totalGrossEntry += op.grossEntry ?? 0;
      } else {
        existing.totalGrossExit += op.grossExit ?? 0;
      }
      // Update ppPokerId if not set
      if (!existing.ppPokerId && op.ppPokerId) {
        existing.ppPokerId = op.ppPokerId;
      }
    } else {
      memberMap.set(op.memberName, {
        name: op.memberName,
        ppPokerId: op.ppPokerId,
        operationCount: 1,
        totalGrossEntry: op.operationType === "Entrada" ? (op.grossEntry ?? 0) : 0,
        totalGrossExit: op.operationType === "Saída" ? (op.grossExit ?? 0) : 0,
        isNew: !existingMemberNames.has(op.memberName),
      });
    }
  }

  return Array.from(memberMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Calculates import statistics
 */
export function calculateImportStats(
  operations: ParsedFastchipsOperation[],
  existingMemberNames: Set<string> = new Set()
): FastchipsImportStats {
  const entries = operations.filter((op) => op.operationType === "Entrada");
  const exits = operations.filter((op) => op.operationType === "Saída");

  const uniqueMembers = new Set(operations.map((op) => op.memberName));
  const newMembers = Array.from(uniqueMembers).filter(
    (name) => !existingMemberNames.has(name)
  ).length;

  const grossEntryTotal = entries.reduce((sum, op) => sum + (op.grossEntry ?? 0), 0);
  const grossExitTotal = exits.reduce((sum, op) => sum + (op.grossExit ?? 0), 0);
  const netEntryTotal = entries.reduce((sum, op) => sum + (op.netEntry ?? 0), 0);
  const netExitTotal = exits.reduce((sum, op) => sum + (op.netExit ?? 0), 0);
  const totalFees = (grossEntryTotal - netEntryTotal) + (grossExitTotal - netExitTotal);

  const byPurpose = {
    recebimento: {
      count: operations.filter((op) => op.purpose === "Recebimento").length,
      total: operations
        .filter((op) => op.purpose === "Recebimento")
        .reduce((sum, op) => sum + (op.grossEntry ?? 0) + (op.grossExit ?? 0), 0),
    },
    pagamento: {
      count: operations.filter((op) => op.purpose === "Pagamento").length,
      total: operations
        .filter((op) => op.purpose === "Pagamento")
        .reduce((sum, op) => sum + (op.grossEntry ?? 0) + (op.grossExit ?? 0), 0),
    },
    saque: {
      count: operations.filter((op) => op.purpose === "Saque").length,
      total: operations
        .filter((op) => op.purpose === "Saque")
        .reduce((sum, op) => sum + (op.grossEntry ?? 0) + (op.grossExit ?? 0), 0),
    },
    servico: {
      count: operations.filter((op) => op.purpose === "Serviço").length,
      total: operations
        .filter((op) => op.purpose === "Serviço")
        .reduce((sum, op) => sum + (op.grossEntry ?? 0) + (op.grossExit ?? 0), 0),
    },
  };

  return {
    totalOperations: operations.length,
    totalEntries: entries.length,
    totalExits: exits.length,
    uniqueMembers: uniqueMembers.size,
    newMembers,
    grossEntryTotal,
    grossExitTotal,
    netEntryTotal,
    netExitTotal,
    totalFees,
    balance: grossEntryTotal - grossExitTotal,
    byPurpose,
  };
}

/**
 * Parses a date string to ISO format
 */
export function parseFastchipsDateToISO(dateStr: string): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, day, month, year, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );

  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
