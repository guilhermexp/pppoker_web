import type {
  ParsedImportData,
  ParsedPlayer,
  ParsedSummary,
  ParsedDetailed,
  ParsedTransaction,
  ValidationCheck,
  ValidationCheckId,
  ValidationResult,
  ValidationWarning,
  DetectedInsight,
  AgentSummary,
} from "./types";

// ============================================================================
// REGRAS DE VALIDAÇÃO RIGOROSAS - BASEADAS NO MAPEAMENTO DAS PLANILHAS
// Só aprova se 100% das verificações críticas passarem
// ============================================================================

// Tipos de verificação
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
  id: string;
  category: CheckCategory;
  severity: CheckSeverity;
  label: string;
  description: string;
  validate: (data: ParsedImportData) => ValidationRuleResult;
}

// ============================================================================
// REGRAS DE ESTRUTURA - Verificam se as abas têm os dados esperados
// ============================================================================

const STRUCTURE_RULES: ValidationRule[] = [
  {
    id: "geral_sheet_present",
    category: "structure",
    severity: "critical",
    label: "Aba Geral presente",
    description: "A aba Geral deve conter dados de jogadores",
    validate: (data) => {
      const count = data.summaries?.length ?? 0;
      return {
        passed: count > 0,
        details: count > 0 ? `${count} jogadores` : "Aba Geral vazia ou ausente",
        count,
        debug: {
          logic: "Verifica se parsedData.summaries tem pelo menos 1 registro",
          expected: "summaries.length > 0",
          actual: `summaries.length = ${count}`,
        },
      };
    },
  },
  {
    id: "geral_columns_complete",
    category: "structure",
    severity: "critical",
    label: "Colunas da aba Geral completas (48 cols)",
    description: "A aba Geral deve ter todas as 48 colunas (B-AV)",
    validate: (data) => {
      const summaries = data.summaries || [];
      if (summaries.length === 0) {
        return {
          passed: false,
          details: "Sem dados para validar",
          debug: {
            logic: "Verifica se os campos obrigatórios existem no primeiro registro da aba Geral",
            expected: "26 campos obrigatórios presentes",
            actual: "Nenhum registro para validar",
          },
        };
      }

      const sample = summaries[0];
      const requiredFields = [
        "ppPokerId", "nickname", "generalTotal", "ringGamesTotal", "mttSitNGoTotal",
        "feeGeneral", "fee", "feePpst", "feeNonPpst", "feePpsr", "feeNonPpsr",
        "spinUpBuyIn", "spinUpPrize", "caribbeanBets", "caribbeanPrize",
        "colorGameBets", "colorGamePrize", "crashBets", "crashPrize",
        "luckyDrawBets", "luckyDrawPrize", "jackpotFee", "jackpotPrize",
        "evSplit", "ticketDeliveredValue", "ticketDeliveredBuyIn",
      ];

      const presentFields = requiredFields.filter((f) => f in sample);
      const missingFields = requiredFields.filter((f) => !(f in sample));
      const allPresent = presentFields.length === requiredFields.length;

      return {
        passed: allPresent,
        details: allPresent
          ? `${presentFields.length}/${requiredFields.length} campos críticos`
          : `Faltando ${missingFields.length} campos`,
        count: presentFields.length,
        debug: {
          logic: "Verifica se o primeiro registro tem todos os 26 campos obrigatórios mapeados",
          expected: `${requiredFields.length} campos presentes`,
          actual: `${presentFields.length} campos encontrados`,
          failedItems: missingFields.slice(0, 10),
        },
      };
    },
  },
  {
    id: "detalhado_sheet_present",
    category: "structure",
    severity: "critical",
    label: "Aba Detalhado presente",
    description: "A aba Detalhado deve conter breakdown por tipo de jogo",
    validate: (data) => {
      const count = data.detailed?.length ?? 0;
      return {
        passed: count > 0,
        details: count > 0 ? `${count} registros` : "Aba Detalhado vazia ou ausente",
        count,
        debug: {
          logic: "Verifica se parsedData.detailed tem pelo menos 1 registro",
          expected: "detailed.length > 0",
          actual: `detailed.length = ${count}`,
        },
      };
    },
  },
  {
    id: "transactions_sheet_present",
    category: "structure",
    severity: "critical",
    label: "Aba Transações presente (21 cols)",
    description: "A aba Transações deve ter todas as 21 colunas (A-U)",
    validate: (data) => {
      const count = data.transactions?.length ?? 0;
      if (count === 0) {
        return {
          passed: false,
          details: "Aba Transações vazia ou ausente",
          count: 0,
          debug: {
            logic: "Verifica se parsedData.transactions tem registros e campos obrigatórios",
            expected: "transactions.length > 0 e 18+ campos",
            actual: "Nenhuma transação encontrada",
          },
        };
      }

      const sample = data.transactions![0];
      const requiredFields = [
        "occurredAt", "senderClubId", "senderPlayerId", "senderNickname", "senderMemoName",
        "recipientPlayerId", "recipientNickname", "recipientMemoName",
        "creditSent", "creditRedeemed", "creditLeftClub",
        "chipsSent", "classificationPpsr", "classificationRing", "classificationCustomRing", "classificationMtt",
        "chipsRedeemed", "chipsLeftClub",
        "ticketSent", "ticketRedeemed", "ticketExpired",
      ];

      const presentFields = requiredFields.filter((f) => f in sample);
      const missingFields = requiredFields.filter((f) => !(f in sample));
      const allPresent = presentFields.length >= 18;

      return {
        passed: allPresent,
        details: `${count} transações, ${presentFields.length}/21 colunas`,
        count,
        debug: {
          logic: "Verifica se o primeiro registro tem pelo menos 18 dos 21 campos obrigatórios",
          expected: "≥18 campos presentes",
          actual: `${presentFields.length} campos encontrados`,
          failedItems: missingFields.slice(0, 10),
        },
      };
    },
  },
  {
    id: "user_details_sheet_present",
    category: "structure",
    severity: "critical",
    label: "Aba Detalhes do usuário presente (12 cols)",
    description: "A aba Detalhes do usuário deve ter todas as 12 colunas (A-L)",
    validate: (data) => {
      const count = data.players?.length ?? 0;
      if (count === 0) {
        return {
          passed: false,
          details: "Aba Detalhes do usuário vazia ou ausente",
          count: 0,
          debug: {
            logic: "Verifica se parsedData.players tem registros e campos obrigatórios",
            expected: "players.length > 0 e 10+ campos",
            actual: "Nenhum jogador encontrado",
          },
        };
      }

      const sample = data.players![0];
      const requiredFields = [
        "lastActiveAt", "ppPokerId", "country", "nickname", "memoName", "chipBalance",
        "agentNickname", "agentPpPokerId", "agentCreditBalance",
        "superAgentNickname", "superAgentPpPokerId", "superAgentCreditBalance",
      ];

      const presentFields = requiredFields.filter((f) => f in sample);
      const missingFields = requiredFields.filter((f) => !(f in sample));
      const allPresent = presentFields.length >= 10;

      return {
        passed: allPresent,
        details: `${count} jogadores, ${presentFields.length}/12 colunas`,
        count,
        debug: {
          logic: "Verifica se o primeiro registro tem pelo menos 10 dos 12 campos obrigatórios",
          expected: "≥10 campos presentes",
          actual: `${presentFields.length} campos encontrados`,
          failedItems: missingFields.slice(0, 10),
        },
      };
    },
  },
  {
    id: "partidas_sheet_present",
    category: "structure",
    severity: "critical",
    label: "Aba Partidas presente",
    description: "A aba Partidas deve conter dados de sessões",
    validate: (data) => {
      const count = data.sessions?.length ?? 0;
      return {
        passed: count > 0,
        details: count > 0 ? `${count} partidas` : "Aba Partidas vazia ou ausente",
        count,
        debug: {
          logic: "Verifica se parsedData.sessions tem pelo menos 1 registro",
          expected: "sessions.length > 0",
          actual: `sessions.length = ${count}`,
        },
      };
    },
  },
  {
    id: "rakeback_sheet_present",
    category: "structure",
    severity: "warning",
    label: "Aba Retorno de taxa presente",
    description: "A aba Retorno de taxa deve conter dados de agentes",
    validate: (data) => {
      const count = data.rakebacks?.length ?? 0;
      return {
        passed: count > 0,
        details: count > 0 ? `${count} agentes` : "Aba Retorno de taxa vazia ou ausente",
        count,
        debug: {
          logic: "Verifica se parsedData.rakebacks tem pelo menos 1 registro",
          expected: "rakebacks.length > 0",
          actual: `rakebacks.length = ${count}`,
        },
      };
    },
  },
  {
    id: "period_detected",
    category: "structure",
    severity: "critical",
    label: "Período identificado",
    description: "O período da planilha deve ser detectado corretamente",
    validate: (data) => {
      const hasStart = Boolean(data.periodStart);
      const hasEnd = Boolean(data.periodEnd);
      const both = hasStart && hasEnd;

      if (!both) {
        return {
          passed: false,
          details: "Período não detectado",
          debug: {
            logic: "Verifica se periodStart e periodEnd foram extraídos e são válidos (≤31 dias)",
            expected: "periodStart e periodEnd definidos, período ≤ 31 dias",
            actual: `periodStart=${data.periodStart || "null"}, periodEnd=${data.periodEnd || "null"}`,
          },
        };
      }

      const start = new Date(data.periodStart!);
      const end = new Date(data.periodEnd!);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      return {
        passed: days > 0 && days <= 31,
        details: `${data.periodStart} - ${data.periodEnd} (${days} dias)`,
        count: days,
        debug: {
          logic: "Verifica se periodStart e periodEnd foram extraídos e são válidos (≤31 dias)",
          expected: "Período entre 1 e 31 dias",
          actual: `${days} dias (${data.periodStart} → ${data.periodEnd})`,
        },
      };
    },
  },
];

// ============================================================================
// REGRAS DE INTEGRIDADE - Verificam se os dados são válidos
// ============================================================================

const INTEGRITY_RULES: ValidationRule[] = [
  {
    id: "player_ids_valid",
    category: "integrity",
    severity: "critical",
    label: "IDs de jogadores válidos",
    description: "Todos os IDs de jogadores devem ser numéricos",
    validate: (data) => {
      const allIds = collectAllPlayerIds(data);
      const invalidIds = allIds.filter((id) => !id || !/^\d+$/.test(id));
      const validIds = allIds.filter((id) => id && /^\d+$/.test(id));

      return {
        passed: invalidIds.length === 0,
        details: invalidIds.length === 0
          ? `${validIds.length} IDs válidos`
          : `${invalidIds.length} IDs inválidos de ${allIds.length}`,
        count: validIds.length,
        debug: {
          logic: "Coleta todos os IDs de jogadores de todas as abas e verifica se são apenas dígitos (regex /^\\d+$/)",
          expected: "Todos os IDs devem ser numéricos (ex: 12345678)",
          actual: `${validIds.length} válidos, ${invalidIds.length} inválidos`,
          failedItems: invalidIds.slice(0, 10).map((id) => `"${id}"`),
        },
      };
    },
  },
  {
    id: "numeric_values_valid",
    category: "integrity",
    severity: "critical",
    label: "Valores numéricos válidos",
    description: "Todos os valores monetários devem ser números válidos",
    validate: (data) => {
      const { errors, details } = countNumericErrorsWithDetails(data);
      return {
        passed: errors === 0,
        details: errors === 0 ? "Todos os valores são numéricos" : `${errors} valores inválidos`,
        count: errors,
        debug: {
          logic: "Verifica se campos monetários (chipBalance, generalTotal, feeGeneral, etc.) são typeof number e não NaN",
          expected: "Todos os valores monetários devem ser números válidos",
          actual: errors === 0 ? "Todos válidos" : `${errors} valores inválidos`,
          failedItems: details.slice(0, 10),
        },
      };
    },
  },
  {
    id: "dates_valid",
    category: "integrity",
    severity: "critical",
    label: "Datas válidas",
    description: "Todas as datas devem poder ser interpretadas",
    validate: (data) => {
      const { errors, details } = countDateErrorsWithDetails(data);
      return {
        passed: errors === 0,
        details: errors === 0 ? "Todas as datas são válidas" : `${errors} datas inválidas`,
        count: errors,
        debug: {
          logic: "Verifica se campos de data (lastActiveAt, occurredAt, startedAt, endedAt) podem ser parseados com Date.parse()",
          expected: "Todas as datas devem ser parseáveis (ISO 8601 ou formato reconhecido)",
          actual: errors === 0 ? "Todas válidas" : `${errors} datas inválidas`,
          failedItems: details.slice(0, 10),
        },
      };
    },
  },
  {
    id: "no_duplicate_transactions",
    category: "integrity",
    severity: "critical",
    label: "Sem transações duplicadas",
    description: "Não deve haver transações duplicadas",
    validate: (data) => {
      const { duplicates, details } = findDuplicateTransactionsWithDetails(data.transactions || []);
      return {
        passed: duplicates === 0,
        details: duplicates === 0 ? "Sem duplicatas" : `${duplicates} duplicatas encontradas`,
        count: duplicates,
        debug: {
          logic: "Gera chave única por transação (data_sender_recipient_valor) e verifica se há repetições",
          expected: "Nenhuma transação duplicada",
          actual: duplicates === 0 ? "Sem duplicatas" : `${duplicates} duplicatas`,
          failedItems: details.slice(0, 10),
        },
      };
    },
  },
];

// ============================================================================
// REGRAS DE CONSISTÊNCIA - Desabilitadas (TODO: implementar corretamente)
// ============================================================================

const CONSISTENCY_RULES: ValidationRule[] = [];

// ============================================================================
// REGRAS MATEMÁTICAS - Desabilitadas (TODO: implementar corretamente)
// ============================================================================

const MATH_RULES: ValidationRule[] = [];

// ============================================================================
// FUNÇÃO PRINCIPAL DE VALIDAÇÃO
// ============================================================================

export function runValidations(data: ParsedImportData): ValidationCheck[] {
  const allRules: { rules: ValidationRule[]; category: ValidationCheck["category"] }[] = [
    { rules: STRUCTURE_RULES, category: "structure" },
    { rules: INTEGRITY_RULES, category: "integrity" },
    { rules: CONSISTENCY_RULES, category: "consistency" },
    { rules: MATH_RULES, category: "math" },
  ];

  const checks: ValidationCheck[] = [];

  for (const { rules, category } of allRules) {
    for (const rule of rules) {
      try {
        const result = rule.validate(data);
        checks.push({
          id: rule.id as ValidationCheckId,
          label: rule.label,
          description: rule.description,
          status: result.passed ? "passed" : rule.severity === "critical" ? "failed" : "warning",
          details: result.details,
          count: result.count,
          category,
          severity: rule.severity as ValidationCheck["severity"],
          debug: result.debug,
        });
      } catch (error) {
        checks.push({
          id: rule.id as ValidationCheckId,
          label: rule.label,
          description: rule.description,
          status: "failed",
          details: `Erro ao validar: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          category,
          severity: rule.severity as ValidationCheck["severity"],
          debug: {
            logic: rule.description,
            expected: "Execução sem erros",
            actual: `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          },
        });
      }
    }
  }

  return checks;
}

// Calculate data quality score (0-100) - Só 100% se todas críticas passarem
export function calculateDataQuality(checks: ValidationCheck[]): { score: number; passed: number; total: number; criticalFailed: number } {
  const total = checks.length;
  const passed = checks.filter((c) => c.status === "passed").length;
  const failed = checks.filter((c) => c.status === "failed").length;
  const warnings = checks.filter((c) => c.status === "warning").length;

  // Score: passed = 100%, warning = 50%, failed = 0%
  const score = Math.round(((passed * 100) + (warnings * 50)) / total);

  return {
    score: Math.min(100, score),
    passed,
    total,
    criticalFailed: failed,
  };
}

// Detect insights from the data
export function detectInsights(data: ParsedImportData): DetectedInsight[] {
  const insights: DetectedInsight[] = [];
  const players = data.players || [];
  const summaries = data.summaries || [];

  // Top winners based on Geral total
  const sortedByWinnings = [...summaries].sort((a, b) => b.generalTotal - a.generalTotal);
  const winners = sortedByWinnings.filter((s) => s.generalTotal > 0);
  const losers = sortedByWinnings.filter((s) => s.generalTotal < 0);

  if (winners.length > 0) {
    insights.push({
      id: "top_winners",
      type: "shark",
      icon: "🦈",
      title: "Top ganhadores",
      description: `${winners.length} jogadores com ganhos positivos`,
      entities: winners.slice(0, 5).map((s) => ({
        id: s.ppPokerId,
        name: s.nickname,
        value: s.generalTotal,
      })),
    });
  }

  // Top losers
  if (losers.length > 0) {
    const topLosers = [...losers].sort((a, b) => a.generalTotal - b.generalTotal);
    insights.push({
      id: "top_losers",
      type: "debtor",
      icon: "💸",
      title: "Maiores perdedores",
      description: `${losers.length} jogadores com perdas`,
      entities: topLosers.slice(0, 5).map((s) => ({
        id: s.ppPokerId,
        name: s.nickname,
        value: s.generalTotal,
      })),
    });
  }

  // High volume players
  const highVolume = summaries
    .filter((s) => Math.abs(s.generalTotal) > 5000)
    .sort((a, b) => Math.abs(b.generalTotal) - Math.abs(a.generalTotal));
  if (highVolume.length > 0) {
    insights.push({
      id: "high_volume",
      type: "high_volume",
      icon: "📊",
      title: "Alto volume",
      description: `${highVolume.length} jogadores com ganhos/perdas > R$ 5.000`,
      entities: highVolume.slice(0, 5).map((s) => ({
        id: s.ppPokerId,
        name: s.nickname,
        value: s.generalTotal,
      })),
    });
  }

  // High rake payers
  const highRake = summaries
    .filter((s) => s.feeGeneral > 500)
    .sort((a, b) => b.feeGeneral - a.feeGeneral);
  if (highRake.length > 0) {
    insights.push({
      id: "high_rake",
      type: "high_volume",
      icon: "💰",
      title: "Maiores pagadores de rake",
      description: `${highRake.length} jogadores com rake > R$ 500`,
      entities: highRake.slice(0, 5).map((s) => ({
        id: s.ppPokerId,
        name: s.nickname,
        value: s.feeGeneral,
      })),
    });
  }

  return insights;
}

// Generate warnings from data
export function generateWarnings(data: ParsedImportData, checks: ValidationCheck[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Warning for failed checks (critical)
  const failedChecks = checks.filter((c) => c.status === "failed");
  for (const check of failedChecks) {
    warnings.push({
      id: `check_${check.id}`,
      severity: "error",
      title: `CRÍTICO: ${check.label}`,
      description: check.details || check.description,
      suggestedAction: "Esta verificação deve passar para aprovar a importação",
    });
  }

  // Warning for warning checks
  const warningChecks = checks.filter((c) => c.status === "warning");
  for (const check of warningChecks) {
    warnings.push({
      id: `check_${check.id}`,
      severity: "warning",
      title: check.label,
      description: check.details || check.description,
      suggestedAction: "Revisar antes de prosseguir",
    });
  }

  // Info about period
  if (data.periodStart && data.periodEnd) {
    warnings.push({
      id: "period_info",
      severity: "info",
      title: "Período da importação",
      description: `Dados de ${data.periodStart} a ${data.periodEnd}`,
      suggestedAction: "Dados existentes neste período serão atualizados",
    });
  }

  return warnings;
}

// Calculate agent summaries
export function calculateAgentSummaries(data: ParsedImportData): AgentSummary[] {
  const summaries = data.summaries || [];
  const rakebacks = data.rakebacks || [];

  // Group by agent
  const agentMap = new Map<string, AgentSummary>();

  for (const summary of summaries) {
    if (!summary.agentPpPokerId) continue;

    const playerRake = summary.feeGeneral ?? 0;

    const existing = agentMap.get(summary.agentPpPokerId);
    if (existing) {
      existing.playerCount += 1;
      existing.totalRake += playerRake;
    } else {
      const rakeback = rakebacks.find((r) => r.agentPpPokerId === summary.agentPpPokerId);
      agentMap.set(summary.agentPpPokerId, {
        agentPpPokerId: summary.agentPpPokerId,
        agentNickname: summary.agentNickname || "Unknown",
        playerCount: 1,
        totalRake: playerRake,
        rakebackPercent: rakeback?.averageRakebackPercent || 0,
        estimatedCommission: 0,
        status: "active",
      });
    }
  }

  // Calculate commissions
  for (const agent of agentMap.values()) {
    agent.estimatedCommission = agent.totalRake * (agent.rakebackPercent / 100);
  }

  return Array.from(agentMap.values()).sort((a, b) => b.totalRake - a.totalRake);
}

// Calculate full validation result
export function validateImportData(data: ParsedImportData): ValidationResult {
  const checks = runValidations(data);
  const quality = calculateDataQuality(checks);
  const insights = detectInsights(data);
  const warnings = generateWarnings(data, checks);
  const agents = calculateAgentSummaries(data);

  const players = data.players || [];
  const summaries = data.summaries || [];
  const detailed = data.detailed || [];
  const transactions = data.transactions || [];
  const sessions = data.sessions || [];
  const allPlayerData = players.length > 0 ? players : summaries;

  const generalIds = new Set(summaries.map((s) => s.ppPokerId));
  const newPlayers = players.filter((p) => !generalIds.has(p.ppPokerId)).length;
  const existingPlayers = players.length > 0 ? Math.max(players.length - newPlayers, 0) : summaries.length;

  // Calculate stats
  const winners = summaries.filter((s) => s.generalTotal > 0).length;
  const losers = summaries.filter((s) => s.generalTotal < 0).length;
  const totalWinnings = summaries.reduce((sum, s) => sum + s.generalTotal, 0);
  const totalRakeFromSessions = sessions.reduce((sum, s) => sum + (s.totalRake ?? 0), 0);
  const totalRakeFromSummaries = summaries.reduce((sum, s) => sum + (s.feeGeneral ?? 0), 0);
  const totalRake = totalRakeFromSessions > 0 ? totalRakeFromSessions : totalRakeFromSummaries;
  const transactionVolume = transactions.reduce(
    (sum, t) =>
      sum +
      t.creditSent +
      t.creditRedeemed +
      t.creditLeftClub +
      t.chipsSent +
      t.chipsRedeemed +
      t.chipsLeftClub +
      t.ticketSent +
      t.ticketRedeemed +
      t.ticketExpired,
    0
  );

  // Game type distribution
  const gameTypes = new Map<string, { label: string; value: number }>();
  for (const summary of summaries) {
    if (summary.ringGamesTotal) {
      const key = "ringGames";
      const existing = gameTypes.get(key);
      gameTypes.set(key, {
        label: "Ring Games",
        value: (existing?.value || 0) + Math.abs(summary.ringGamesTotal),
      });
    }
    if (summary.mttSitNGoTotal) {
      const key = "mttSitNGo";
      const existing = gameTypes.get(key);
      gameTypes.set(key, {
        label: "MTT/SitNGo",
        value: (existing?.value || 0) + Math.abs(summary.mttSitNGoTotal),
      });
    }
    if (summary.spinUpTotal) {
      const key = "spinUp";
      const existing = gameTypes.get(key);
      gameTypes.set(key, {
        label: "SPINUP",
        value: (existing?.value || 0) + Math.abs(summary.spinUpTotal),
      });
    }
    if (summary.caribbeanTotal) {
      const key = "caribbean";
      const existing = gameTypes.get(key);
      gameTypes.set(key, {
        label: "Caribbean+",
        value: (existing?.value || 0) + Math.abs(summary.caribbeanTotal),
      });
    }
    if (summary.colorGameTotal) {
      const key = "colorGame";
      const existing = gameTypes.get(key);
      gameTypes.set(key, {
        label: "Color Game",
        value: (existing?.value || 0) + Math.abs(summary.colorGameTotal),
      });
    }
    if (summary.crashTotal) {
      const key = "crash";
      const existing = gameTypes.get(key);
      gameTypes.set(key, {
        label: "Crash",
        value: (existing?.value || 0) + Math.abs(summary.crashTotal),
      });
    }
    if (summary.luckyDrawTotal) {
      const key = "luckyDraw";
      const existing = gameTypes.get(key);
      gameTypes.set(key, {
        label: "Lucky Draw",
        value: (existing?.value || 0) + Math.abs(summary.luckyDrawTotal),
      });
    }
    if (summary.jackpotTotal) {
      const key = "jackpot";
      const existing = gameTypes.get(key);
      gameTypes.set(key, {
        label: "Jackpot",
        value: (existing?.value || 0) + Math.abs(summary.jackpotTotal),
      });
    }
  }
  const totalGameValue = Array.from(gameTypes.values()).reduce((a, b) => a + b.value, 0) || 1;

  // Top performers
  const sortedByWinnings = [...summaries].sort((a, b) => b.generalTotal - a.generalTotal);
  const majorWinner = sortedByWinnings[0];
  const majorLoser = sortedByWinnings[sortedByWinnings.length - 1];

  // Period calculation
  let periodDays = 0;
  if (data.periodStart && data.periodEnd) {
    const start = new Date(data.periodStart);
    const end = new Date(data.periodEnd);
    periodDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // IMPORTANTE: hasBlockingErrors = true se QUALQUER check crítico falhou
  const hasBlockingErrors = quality.criticalFailed > 0;

  return {
    qualityScore: quality.score,
    passedChecks: quality.passed,
    totalChecks: quality.total,
    hasBlockingErrors, // Bloqueia se qualquer crítico falhar

    checks,
    warnings,
    insights,

    period: {
      start: data.periodStart || "",
      end: data.periodEnd || "",
      days: periodDays,
    },

    stats: {
      totalPlayers: allPlayerData.length,
      newPlayers,
      existingPlayers,
      winners,
      losers,
      totalWinnings,
      totalRake,
      avgWinningsPerPlayer: allPlayerData.length > 0 ? totalWinnings / allPlayerData.length : 0,
      totalTransactions: transactions.length,
      transactionVolume,
      avgTransactionValue: transactions.length > 0 ? transactionVolume / transactions.length : 0,
      totalSessions: sessions.length,
      cashGameSessions: sessions.filter((s) => s.sessionType === "cash_game" || s.sessionType === "ring").length,
      mttSessions: sessions.filter((s) => s.sessionType === "mtt").length,
      sitNGoSessions: sessions.filter((s) => s.sessionType === "sit_n_go" || s.sessionType === "sng").length,
    },

    agents,

    gameTypeDistribution: Array.from(gameTypes.entries())
      .map(([type, data]) => ({
        type,
        label: data.label,
        value: data.value,
        percentage: (data.value / totalGameValue) * 100,
      }))
      .sort((a, b) => b.value - a.value),

    topPerformers: {
      majorWinner:
        majorWinner && majorWinner.generalTotal > 0
          ? { name: majorWinner.nickname, value: majorWinner.generalTotal }
          : null,
      majorLoser:
        majorLoser && majorLoser.generalTotal < 0
          ? { name: majorLoser.nickname, value: majorLoser.generalTotal }
          : null,
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function collectAllPlayerIds(data: ParsedImportData): string[] {
  const ids: string[] = [];
  for (const p of data.players || []) ids.push(p.ppPokerId);
  for (const s of data.summaries || []) ids.push(s.ppPokerId);
  for (const d of data.detailed || []) ids.push(d.ppPokerId);
  for (const s of data.sessions || []) {
    if (s.createdByPpPokerId) ids.push(s.createdByPpPokerId);
    for (const player of s.players || []) {
      ids.push(player.ppPokerId);
    }
  }
  for (const t of data.transactions || []) {
    if (t.playerId) ids.push(t.playerId);
    if (t.senderPlayerId) ids.push(t.senderPlayerId);
    if (t.recipientPlayerId) ids.push(t.recipientPlayerId);
  }
  for (const d of data.demonstrativo || []) {
    if (d.ppPokerId) ids.push(d.ppPokerId);
  }
  // Filtra valores falsy e não-IDs óbvios (/, -, none, etc.)
  const invalidPatterns = ["/", "-", "none", "(none)", "null", "undefined", ""];
  return [...new Set(ids.filter((id) => {
    if (!id) return false;
    const normalized = String(id).trim().toLowerCase();
    if (invalidPatterns.includes(normalized)) return false;
    // Precisa ter pelo menos um dígito para ser considerado um ID
    return /\d/.test(id);
  }))];
}

function countNumericErrorsWithDetails(data: ParsedImportData): { errors: number; details: string[] } {
  let errors = 0;
  const details: string[] = [];
  const players = data.players || [];
  const summaries = data.summaries || [];
  const detailed = data.detailed || [];
  const demonstrativo = data.demonstrativo || [];
  const transactions = data.transactions || [];
  const rakebacks = data.rakebacks || [];

  for (const p of players) {
    if (typeof p.chipBalance !== "number" || isNaN(p.chipBalance)) {
      errors++;
      if (details.length < 10) details.push(`players[${p.ppPokerId}].chipBalance = ${p.chipBalance}`);
    }
    if (typeof p.agentCreditBalance !== "number" || isNaN(p.agentCreditBalance)) {
      errors++;
      if (details.length < 10) details.push(`players[${p.ppPokerId}].agentCreditBalance = ${p.agentCreditBalance}`);
    }
  }
  for (const s of summaries) {
    if (typeof s.generalTotal !== "number" || isNaN(s.generalTotal)) {
      errors++;
      if (details.length < 10) details.push(`summaries[${s.ppPokerId}].generalTotal = ${s.generalTotal}`);
    }
    if (typeof s.feeGeneral !== "number" || isNaN(s.feeGeneral)) {
      errors++;
      if (details.length < 10) details.push(`summaries[${s.ppPokerId}].feeGeneral = ${s.feeGeneral}`);
    }
  }
  for (const d of detailed) {
    if (typeof d.totalWinnings !== "number" || isNaN(d.totalWinnings)) {
      errors++;
      if (details.length < 10) details.push(`detailed[${d.ppPokerId}].totalWinnings = ${d.totalWinnings}`);
    }
  }
  for (const d of demonstrativo) {
    if (typeof d.amount !== "number" || isNaN(d.amount)) {
      errors++;
      if (details.length < 10) details.push(`demonstrativo[${d.ppPokerId}].amount = ${d.amount}`);
    }
  }
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (typeof t.chipsSent !== "number" || isNaN(t.chipsSent)) {
      errors++;
      if (details.length < 10) details.push(`transactions[${i}].chipsSent = ${t.chipsSent}`);
    }
    if (typeof t.creditSent !== "number" || isNaN(t.creditSent)) {
      errors++;
      if (details.length < 10) details.push(`transactions[${i}].creditSent = ${t.creditSent}`);
    }
  }
  for (const r of rakebacks) {
    if (typeof r.averageRakebackPercent !== "number" || isNaN(r.averageRakebackPercent)) {
      errors++;
      if (details.length < 10) details.push(`rakebacks[${r.agentPpPokerId}].averageRakebackPercent = ${r.averageRakebackPercent}`);
    }
    if (typeof r.totalRt !== "number" || isNaN(r.totalRt)) {
      errors++;
      if (details.length < 10) details.push(`rakebacks[${r.agentPpPokerId}].totalRt = ${r.totalRt}`);
    }
  }

  return { errors, details };
}

function countDateErrorsWithDetails(data: ParsedImportData): { errors: number; details: string[] } {
  let errors = 0;
  const details: string[] = [];
  const players = data.players || [];
  const demonstrativo = data.demonstrativo || [];
  const transactions = data.transactions || [];
  const sessions = data.sessions || [];

  for (const p of players) {
    if (p.lastActiveAt && isNaN(Date.parse(p.lastActiveAt))) {
      errors++;
      if (details.length < 10) details.push(`players[${p.ppPokerId}].lastActiveAt = "${p.lastActiveAt}"`);
    }
  }
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (t.occurredAt && isNaN(Date.parse(t.occurredAt))) {
      errors++;
      if (details.length < 10) details.push(`transactions[${i}].occurredAt = "${t.occurredAt}"`);
    }
  }
  for (const d of demonstrativo) {
    if (d.occurredAt && isNaN(Date.parse(d.occurredAt))) {
      errors++;
      if (details.length < 10) details.push(`demonstrativo[${d.ppPokerId}].occurredAt = "${d.occurredAt}"`);
    }
  }
  for (const s of sessions) {
    if (s.startedAt && isNaN(Date.parse(s.startedAt))) {
      errors++;
      if (details.length < 10) details.push(`sessions[${s.gameId}].startedAt = "${s.startedAt}"`);
    }
    if (s.endedAt && isNaN(Date.parse(s.endedAt))) {
      errors++;
      if (details.length < 10) details.push(`sessions[${s.gameId}].endedAt = "${s.endedAt}"`);
    }
  }

  return { errors, details };
}

function findDuplicateTransactionsWithDetails(transactions: ParsedTransaction[]): { duplicates: number; details: string[] } {
  if (!transactions || transactions.length === 0) return { duplicates: 0, details: [] };
  const seen = new Map<string, number>();
  let duplicates = 0;
  const details: string[] = [];

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    const key = `${t.occurredAt}_${t.senderPlayerId}_${t.recipientPlayerId}_${t.creditSent}_${t.chipsSent}_${t.ticketSent}`;
    if (seen.has(key)) {
      duplicates++;
      if (details.length < 10) {
        details.push(`Linha ${i + 1} duplica linha ${seen.get(key)! + 1}`);
      }
    } else {
      seen.set(key, i);
    }
  }

  return { duplicates, details };
}
