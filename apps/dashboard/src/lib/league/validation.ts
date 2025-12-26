import type {
  LeagueValidationCheck,
  LeagueValidationCheckId,
  LeagueValidationResult,
  LeagueValidationWarning,
  ParsedLeagueImportData,
} from "./types";

// ============================================================================
// REGRAS DE VALIDAÇÃO PARA PLANILHAS DE LIGA
// Separado do validador de clubes - NÃO misturar com poker/validation.ts
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
  id: LeagueValidationCheckId;
  category: CheckCategory;
  severity: CheckSeverity;
  label: string;
  description: string;
  validate: (data: ParsedLeagueImportData) => ValidationRuleResult;
}

// ============================================================================
// REGRAS DE ESTRUTURA - Verificam se as abas têm os dados esperados
// ============================================================================

const STRUCTURE_RULES: ValidationRule[] = [
  {
    id: "geral_ppst_sheet_present",
    category: "structure",
    severity: "critical",
    label: "Aba Geral do PPST presente",
    description: "A aba Geral do PPST deve conter dados de ligas (torneios)",
    validate: (data) => {
      const blocos = data.geralPPST || [];
      const totalLigas = blocos.reduce(
        (sum, bloco) => sum + bloco.ligas.length,
        0,
      );
      return {
        passed: totalLigas > 0,
        details:
          totalLigas > 0
            ? `${totalLigas} ligas em ${blocos.length} blocos`
            : "Aba Geral PPST vazia ou ausente",
        count: totalLigas,
        debug: {
          logic: "Verifica se geralPPST tem pelo menos 1 liga em algum bloco",
          expected: "geralPPST.ligas.length > 0",
          actual: `${totalLigas} ligas encontradas`,
        },
      };
    },
  },
  {
    id: "jogos_ppst_sheet_present",
    category: "structure",
    severity: "critical",
    label: "Aba Jogos PPST presente",
    description: "A aba Jogos PPST deve conter dados de partidas de torneio",
    validate: (data) => {
      const jogos = data.jogosPPST || [];
      const totalJogadores = jogos.reduce(
        (sum, jogo) => sum + jogo.jogadores.length,
        0,
      );
      return {
        passed: jogos.length > 0,
        details:
          jogos.length > 0
            ? `${jogos.length} jogos, ${totalJogadores} jogadores`
            : "Aba Jogos PPST vazia ou ausente",
        count: jogos.length,
        debug: {
          logic: "Verifica se jogosPPST tem pelo menos 1 jogo",
          expected: "jogosPPST.length > 0",
          actual: `${jogos.length} jogos encontrados`,
        },
      };
    },
  },
  {
    id: "geral_ppsr_sheet_present",
    category: "structure",
    severity: "warning", // Warning porque ainda não está implementado
    label: "Aba Geral do PPSR presente",
    description: "A aba Geral do PPSR deve conter dados de ligas (cash)",
    validate: (data) => {
      const count = data.geralPPSR?.length ?? 0;
      return {
        passed: true, // Sempre passa por enquanto (ainda não implementado)
        details: count > 0 ? `${count} ligas` : "Ainda não implementado",
        count,
        debug: {
          logic: "Verifica se geralPPSR tem dados (implementação pendente)",
          expected: "geralPPSR.length > 0",
          actual: `${count} ligas encontradas`,
        },
      };
    },
  },
  {
    id: "jogos_ppsr_sheet_present",
    category: "structure",
    severity: "warning",
    label: "Aba Jogos PPSR presente",
    description: "A aba Jogos PPSR deve conter dados de partidas de cash",
    validate: (data) => {
      const jogos = data.jogosPPSR || [];
      const totalJogadores = jogos.reduce(
        (sum, jogo) => sum + jogo.jogadores.length,
        0,
      );
      return {
        passed: true, // Warning only - cash games are optional
        details:
          jogos.length > 0
            ? `${jogos.length} mesas, ${totalJogadores} jogadores`
            : "Aba Jogos PPSR vazia ou ausente",
        count: jogos.length,
        debug: {
          logic: "Verifica se jogosPPSR tem dados de cash games",
          expected: "jogosPPSR.length > 0 (opcional)",
          actual: `${jogos.length} mesas encontradas`,
        },
      };
    },
  },
  {
    id: "period_detected",
    category: "structure",
    severity: "critical",
    label: "Período identificado",
    description:
      "O período da planilha deve ser identificado e ter no máximo 31 dias",
    validate: (data) => {
      const hasStart = !!data.periodStart;
      const hasEnd = !!data.periodEnd;

      if (!hasStart || !hasEnd) {
        return {
          passed: false,
          details: "Período não identificado no arquivo",
          debug: {
            logic: "Verifica se periodStart e periodEnd foram extraídos",
            expected: "periodStart e periodEnd presentes",
            actual: `start=${hasStart}, end=${hasEnd}`,
          },
        };
      }

      const start = new Date(data.periodStart!);
      const end = new Date(data.periodEnd!);
      const days = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        passed: days <= 31 && days >= 0,
        details: `${days} dias (${data.periodStart} a ${data.periodEnd})`,
        count: days,
        debug: {
          logic: "Verifica se o período tem entre 0 e 31 dias",
          expected: "0 <= days <= 31",
          actual: `${days} dias`,
        },
      };
    },
  },
  {
    id: "unknown_game_formats",
    category: "structure",
    severity: "warning",
    label: "Formatos de torneio desconhecidos",
    description:
      "Torneios com formatos não mapeados foram encontrados e não serão importados",
    validate: (data) => {
      const unknownFormats = data.unknownGameFormats || [];
      const count = unknownFormats.length;

      if (count === 0) {
        return {
          passed: true,
          details: "Todos os formatos de torneio são reconhecidos",
          count: 0,
          debug: {
            logic: "Verifica se há formatos de torneio não reconhecidos pelo parser",
            expected: "0 formatos desconhecidos",
            actual: "0 formatos desconhecidos",
          },
        };
      }

      // Extract unique format types from raw text
      const formatTypes = new Set<string>();
      for (const uf of unknownFormats) {
        const match = uf.rawText.match(/^([A-Z0-9\/+]+)/i);
        if (match) {
          formatTypes.add(match[1].toUpperCase());
        }
      }

      return {
        passed: false,
        details: `${count} torneio(s) com formato desconhecido: ${[...formatTypes].join(", ")}`,
        count,
        debug: {
          logic: "Verifica se há formatos de torneio não reconhecidos pelo parser",
          expected: "0 formatos desconhecidos",
          actual: `${count} formatos não reconhecidos`,
          failedItems: unknownFormats.slice(0, 10).map(
            (uf) => `Game ${uf.gameId}: ${uf.rawText.substring(0, 60)}...`,
          ),
        },
      };
    },
  },
  {
    id: "unknown_cash_formats",
    category: "structure",
    severity: "warning",
    label: "Formatos de cash desconhecidos",
    description:
      "Mesas de cash com formatos não mapeados foram encontradas e não serão importadas",
    validate: (data) => {
      const unknownFormats = data.unknownCashFormats || [];
      const count = unknownFormats.length;

      if (count === 0) {
        return {
          passed: true,
          details: "Todos os formatos de cash são reconhecidos",
          count: 0,
          debug: {
            logic: "Verifica se há formatos de cash não reconhecidos pelo parser",
            expected: "0 formatos desconhecidos",
            actual: "0 formatos desconhecidos",
          },
        };
      }

      // Extract unique format types from raw text
      const formatTypes = new Set<string>();
      for (const uf of unknownFormats) {
        const match = uf.rawText.match(/(PPSR\/[A-Z0-9+]+)/i);
        if (match) {
          formatTypes.add(match[1].toUpperCase());
        }
      }

      return {
        passed: false,
        details: `${count} mesa(s) de cash com formato desconhecido: ${[...formatTypes].join(", ")}`,
        count,
        debug: {
          logic: "Verifica se há formatos de cash não reconhecidos pelo parser",
          expected: "0 formatos desconhecidos",
          actual: `${count} formatos não reconhecidos`,
          failedItems: unknownFormats.slice(0, 10).map(
            (uf) => `Game ${uf.gameId}: ${uf.rawText.substring(0, 60)}...`,
          ),
        },
      };
    },
  },
];

// ============================================================================
// REGRAS DE INTEGRIDADE - Verificam qualidade dos dados
// ============================================================================

const INTEGRITY_RULES: ValidationRule[] = [
  {
    id: "liga_ids_valid",
    category: "integrity",
    severity: "critical",
    label: "IDs de Liga válidos",
    description: "Todos os IDs de liga devem ser números válidos",
    validate: (data) => {
      const invalidIds: string[] = [];

      // Verifica Geral PPST
      for (const bloco of data.geralPPST || []) {
        for (const liga of bloco.ligas) {
          if (!liga.ligaId || Number.isNaN(liga.ligaId) || liga.ligaId <= 0) {
            invalidIds.push(
              `Geral PPST: ${liga.ligaNome} (ID: ${liga.ligaId})`,
            );
          }
        }
      }

      // Verifica Jogos PPST
      for (const jogo of data.jogosPPST || []) {
        for (const jogador of jogo.jogadores) {
          if (
            !jogador.ligaId ||
            Number.isNaN(jogador.ligaId) ||
            jogador.ligaId <= 0
          ) {
            if (!invalidIds.includes(`Jogos PPST: Liga ${jogador.ligaId}`)) {
              invalidIds.push(`Jogos PPST: Liga ${jogador.ligaId}`);
            }
          }
        }
      }

      return {
        passed: invalidIds.length === 0,
        details:
          invalidIds.length === 0
            ? "Todos os IDs de liga são válidos"
            : `${invalidIds.length} IDs inválidos`,
        count: invalidIds.length,
        debug: {
          logic: "Verifica se todos os ligaId são números positivos",
          expected: "ligaId > 0 para todos os registros",
          actual: `${invalidIds.length} IDs inválidos encontrados`,
          failedItems: invalidIds.slice(0, 10),
        },
      };
    },
  },
  {
    id: "clube_ids_valid",
    category: "integrity",
    severity: "critical",
    label: "IDs de Clube válidos",
    description: "Todos os IDs de clube devem ser números válidos",
    validate: (data) => {
      const invalidIds: string[] = [];

      for (const jogo of data.jogosPPST || []) {
        for (const jogador of jogo.jogadores) {
          if (
            !jogador.clubeId ||
            Number.isNaN(jogador.clubeId) ||
            jogador.clubeId <= 0
          ) {
            invalidIds.push(`${jogador.clubeNome} (ID: ${jogador.clubeId})`);
          }
        }
      }

      // Remove duplicatas
      const uniqueInvalid = [...new Set(invalidIds)];

      return {
        passed: uniqueInvalid.length === 0,
        details:
          uniqueInvalid.length === 0
            ? "Todos os IDs de clube são válidos"
            : `${uniqueInvalid.length} clubes com IDs inválidos`,
        count: uniqueInvalid.length,
        debug: {
          logic: "Verifica se todos os clubeId são números positivos",
          expected: "clubeId > 0 para todos os jogadores",
          actual: `${uniqueInvalid.length} IDs inválidos encontrados`,
          failedItems: uniqueInvalid.slice(0, 10),
        },
      };
    },
  },
  {
    id: "jogador_ids_valid",
    category: "integrity",
    severity: "critical",
    label: "IDs de Jogador válidos",
    description: "Todos os IDs de jogador devem ser inteiros positivos",
    validate: (data) => {
      const invalidIds: string[] = [];

      for (const jogo of data.jogosPPST || []) {
        for (const jogador of jogo.jogadores) {
          const id = jogador.jogadorId;
          // IDs de jogador PPPoker são inteiros positivos
          if (!id || Number.isNaN(id) || id <= 0 || !Number.isInteger(id)) {
            invalidIds.push(`${jogador.apelido} (ID: ${id})`);
          }
        }
      }

      // Remove duplicatas
      const uniqueInvalid = [...new Set(invalidIds)];

      return {
        passed: uniqueInvalid.length === 0,
        details:
          uniqueInvalid.length === 0
            ? "Todos os IDs de jogador são válidos"
            : `${uniqueInvalid.length} jogadores com IDs inválidos`,
        count: uniqueInvalid.length,
        debug: {
          logic: "Verifica se todos os jogadorId são inteiros positivos",
          expected: "jogadorId > 0 && Number.isInteger(jogadorId)",
          actual: `${uniqueInvalid.length} IDs inválidos`,
          failedItems: uniqueInvalid.slice(0, 10),
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
      const errors: string[] = [];

      // Verifica Geral PPST
      for (const bloco of data.geralPPST || []) {
        for (const liga of bloco.ligas) {
          if (Number.isNaN(liga.ganhosJogador))
            errors.push(`Liga ${liga.ligaId}: ganhosJogador NaN`);
          if (Number.isNaN(liga.ganhosLigaGeral))
            errors.push(`Liga ${liga.ligaId}: ganhosLigaGeral NaN`);
          if (Number.isNaN(liga.ganhosLigaTaxa))
            errors.push(`Liga ${liga.ligaId}: ganhosLigaTaxa NaN`);
        }
      }

      // Verifica Jogos PPST
      for (const jogo of data.jogosPPST || []) {
        for (const jogador of jogo.jogadores) {
          if (Number.isNaN(jogador.ganhos))
            errors.push(`Jogador ${jogador.jogadorId}: ganhos NaN`);
          if (Number.isNaN(jogador.buyinFichas))
            errors.push(`Jogador ${jogador.jogadorId}: buyinFichas NaN`);
        }
      }

      return {
        passed: errors.length === 0,
        details:
          errors.length === 0
            ? "Todos os valores numéricos são válidos"
            : `${errors.length} erros numéricos`,
        count: errors.length,
        debug: {
          logic: "Verifica se os campos monetários não são NaN",
          expected: "Nenhum valor NaN",
          actual: `${errors.length} valores NaN encontrados`,
          failedItems: errors.slice(0, 10),
        },
      };
    },
  },
  {
    id: "rankings_valid",
    category: "integrity",
    severity: "warning",
    label: "Rankings válidos",
    description: "Rankings devem ser números não-negativos (0 = não colocou)",
    validate: (data) => {
      const issues: string[] = [];

      for (const jogo of data.jogosPPST || []) {
        // Verifica se há rankings negativos (0 é válido para jogadores que não colocaram)
        const invalidRankings = jogo.jogadores.filter((j) => j.ranking < 0);
        for (const j of invalidRankings) {
          issues.push(
            `${jogo.metadata.nomeMesa}: ${j.apelido} ranking=${j.ranking}`,
          );
        }
      }

      return {
        passed: issues.length === 0,
        details:
          issues.length === 0
            ? "Todos os rankings são válidos"
            : `${issues.length} rankings inválidos`,
        count: issues.length,
        debug: {
          logic: "Verifica se rankings são números não-negativos",
          expected: "ranking >= 0 para todos os jogadores",
          actual: `${issues.length} rankings inválidos`,
          failedItems: issues.slice(0, 10),
        },
      };
    },
  },
];

// ============================================================================
// REGRAS DE CONSISTÊNCIA - Verificam coerência entre dados
// ============================================================================

const CONSISTENCY_RULES: ValidationRule[] = [
  {
    id: "ligas_in_geral_match_jogos",
    category: "consistency",
    severity: "warning",
    label: "Ligas do Geral aparecem nos Jogos",
    description:
      "Todas as ligas do Geral PPST devem aparecer na aba Jogos PPST",
    validate: (data) => {
      const ligasGeral = new Set<number>();
      const ligasJogos = new Set<number>();

      for (const bloco of data.geralPPST || []) {
        for (const liga of bloco.ligas) {
          ligasGeral.add(liga.ligaId);
        }
      }

      for (const jogo of data.jogosPPST || []) {
        for (const jogador of jogo.jogadores) {
          ligasJogos.add(jogador.ligaId);
        }
      }

      const ligasApenasGeral = [...ligasGeral].filter(
        (id) => !ligasJogos.has(id),
      );

      return {
        passed: ligasApenasGeral.length === 0,
        details:
          ligasApenasGeral.length === 0
            ? `${ligasGeral.size} ligas consistentes`
            : `${ligasApenasGeral.length} ligas só no Geral`,
        count: ligasApenasGeral.length,
        debug: {
          logic: "Verifica se todas as ligas do Geral aparecem nos Jogos",
          expected: "Todas as ligas do Geral presentes nos Jogos",
          actual: `${ligasApenasGeral.length} ligas sem dados de jogos`,
          failedItems: ligasApenasGeral.map((id) => `Liga ${id}`).slice(0, 10),
        },
      };
    },
  },
  {
    id: "totais_liga_match_jogadores",
    category: "consistency",
    severity: "warning",
    label: "Totais por liga batem com jogadores",
    description:
      "A soma dos jogadores deve bater com o total da liga em cada jogo",
    validate: (data) => {
      const issues: string[] = [];

      for (const jogo of data.jogosPPST || []) {
        for (const totalLiga of jogo.totaisPorLiga) {
          const jogadoresDaLiga = jogo.jogadores.filter(
            (j) => j.ligaId === totalLiga.ligaId,
          );
          const somaGanhos = jogadoresDaLiga.reduce(
            (sum, j) => sum + j.ganhos,
            0,
          );

          // Tolerância de 0.01 para arredondamentos
          if (Math.abs(somaGanhos - totalLiga.ganhos) > 0.01) {
            issues.push(
              `${jogo.metadata.nomeMesa} Liga ${totalLiga.ligaId}: soma=${somaGanhos.toFixed(2)}, total=${totalLiga.ganhos.toFixed(2)}`,
            );
          }
        }
      }

      return {
        passed: issues.length === 0,
        details:
          issues.length === 0
            ? "Totais consistentes"
            : `${issues.length} inconsistências`,
        count: issues.length,
        debug: {
          logic: "Verifica se a soma dos ganhos dos jogadores = total da liga",
          expected: "Soma dos jogadores = Total da liga",
          actual: `${issues.length} inconsistências encontradas`,
          failedItems: issues.slice(0, 10),
        },
      };
    },
  },
];

// ============================================================================
// REGRAS MATEMÁTICAS - Verificam cálculos
// ============================================================================

const MATH_RULES: ValidationRule[] = [
  {
    id: "formula_columns_consistent",
    category: "math",
    severity: "info",
    label: "Colunas de fórmula consistentes",
    description: "Verifica se colunas que são somas de outras estão corretas (Geral = soma das sub-colunas)",
    validate: (data) => {
      const issues: string[] = [];

      // Check PPST: ganhosLigaGeral = Taxa + Buy-in SPIN + Prêmio SPIN + Ticket Entreg. + Buy-in Ticket
      for (const bloco of data.geralPPST || []) {
        for (const liga of bloco.ligas) {
          const expectedGeral = liga.ganhosLigaTaxa + liga.buyinSpinup + liga.premiacaoSpinup +
                               liga.valorTicketEntregue + liga.buyinTicketLiga;
          // Tolerance of 0.1 for rounding
          if (Math.abs(liga.ganhosLigaGeral - expectedGeral) > 0.1) {
            issues.push(
              `PPST Liga ${liga.ligaId}: Geral=${liga.ganhosLigaGeral.toFixed(2)}, esperado=${expectedGeral.toFixed(2)}`,
            );
          }
        }
      }

      // Check PPSR: ganhosJogadorGeral = De adversários + De Jackpot + De Dividir EV
      // Check PPSR: ganhosLigaGeral = Taxa + Taxa do Jackpot + Prêmio Jackpot + Dividir EV
      for (const bloco of data.geralPPSR || []) {
        for (const liga of bloco.ligas) {
          const expectedJogadorGeral = liga.ganhosJogadorDeAdversarios + liga.ganhosJogadorDeJackpot +
                                       liga.ganhosJogadorDeDividirEV;
          if (Math.abs(liga.ganhosJogadorGeral - expectedJogadorGeral) > 0.1) {
            issues.push(
              `PPSR Liga ${liga.ligaId}: GanhosJogGeral=${liga.ganhosJogadorGeral.toFixed(2)}, esperado=${expectedJogadorGeral.toFixed(2)}`,
            );
          }

          const expectedLigaGeral = liga.ganhosLigaTaxa + liga.ganhosLigaTaxaJackpot +
                                   liga.ganhosLigaPremioJackpot + liga.ganhosLigaDividirEV;
          if (Math.abs(liga.ganhosLigaGeral - expectedLigaGeral) > 0.1) {
            issues.push(
              `PPSR Liga ${liga.ligaId}: GanhosLigaGeral=${liga.ganhosLigaGeral.toFixed(2)}, esperado=${expectedLigaGeral.toFixed(2)}`,
            );
          }
        }
      }

      return {
        passed: issues.length === 0,
        details:
          issues.length === 0
            ? "Todas as colunas de fórmula estão consistentes"
            : `${issues.length} inconsistências detectadas (valores foram recalculados)`,
        count: issues.length,
        debug: {
          logic: "Verifica se Geral = soma das sub-colunas (Taxa, SPIN, Ticket, etc.)",
          expected: "Geral = soma das sub-colunas",
          actual: `${issues.length} inconsistências`,
          failedItems: issues.slice(0, 10),
        },
      };
    },
  },
  {
    id: "geral_totals_sum_correct",
    category: "math",
    severity: "warning",
    label: "Soma das ligas = Total no Geral",
    description: "A soma de todas as ligas deve ser igual ao total do bloco",
    validate: (data) => {
      const issues: string[] = [];

      for (const bloco of data.geralPPST || []) {
        const somaGanhosJogador = bloco.ligas.reduce(
          (sum, l) => sum + l.ganhosJogador,
          0,
        );
        const somaGanhosLiga = bloco.ligas.reduce(
          (sum, l) => sum + l.ganhosLigaGeral,
          0,
        );

        // Tolerância de 0.10 para arredondamentos
        if (Math.abs(somaGanhosJogador - bloco.total.ganhosJogador) > 0.1) {
          issues.push(
            `Bloco ${bloco.periodo.dataInicio}: ganhosJogador soma=${somaGanhosJogador.toFixed(2)}, total=${bloco.total.ganhosJogador.toFixed(2)}`,
          );
        }
        if (Math.abs(somaGanhosLiga - bloco.total.ganhosLigaGeral) > 0.1) {
          issues.push(
            `Bloco ${bloco.periodo.dataInicio}: ganhosLiga soma=${somaGanhosLiga.toFixed(2)}, total=${bloco.total.ganhosLigaGeral.toFixed(2)}`,
          );
        }
      }

      return {
        passed: issues.length === 0,
        details:
          issues.length === 0
            ? "Todos os totais estão corretos"
            : `${issues.length} erros de soma`,
        count: issues.length,
        debug: {
          logic: "Verifica se a soma das ligas = total do bloco",
          expected: "Soma = Total para cada bloco",
          actual: `${issues.length} erros de soma`,
          failedItems: issues.slice(0, 10),
        },
      };
    },
  },
  {
    id: "jogos_totals_sum_correct",
    category: "math",
    severity: "warning",
    label: "Soma dos jogadores = Total do jogo",
    description:
      "A soma de todos os jogadores deve ser igual ao total geral do jogo",
    validate: (data) => {
      const issues: string[] = [];

      for (const jogo of data.jogosPPST || []) {
        const somaGanhos = jogo.jogadores.reduce((sum, j) => sum + j.ganhos, 0);
        const somaBuyin = jogo.jogadores.reduce(
          (sum, j) => sum + j.buyinFichas,
          0,
        );

        // Tolerância de 0.10 para arredondamentos
        if (Math.abs(somaGanhos - jogo.totalGeral.ganhos) > 0.1) {
          issues.push(
            `${jogo.metadata.nomeMesa}: ganhos soma=${somaGanhos.toFixed(2)}, total=${jogo.totalGeral.ganhos.toFixed(2)}`,
          );
        }
        if (Math.abs(somaBuyin - jogo.totalGeral.buyinFichas) > 0.1) {
          issues.push(
            `${jogo.metadata.nomeMesa}: buyin soma=${somaBuyin.toFixed(2)}, total=${jogo.totalGeral.buyinFichas.toFixed(2)}`,
          );
        }
      }

      return {
        passed: issues.length === 0,
        details:
          issues.length === 0
            ? "Todos os totais de jogos estão corretos"
            : `${issues.length} erros de soma`,
        count: issues.length,
        debug: {
          logic: "Verifica se a soma dos jogadores = total geral do jogo",
          expected: "Soma = Total para cada jogo",
          actual: `${issues.length} erros de soma`,
          failedItems: issues.slice(0, 10),
        },
      };
    },
  },
];

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

function runValidations(data: ParsedLeagueImportData): LeagueValidationCheck[] {
  const allRules = [
    ...STRUCTURE_RULES,
    ...INTEGRITY_RULES,
    ...CONSISTENCY_RULES,
    ...MATH_RULES,
  ];
  const checks: LeagueValidationCheck[] = [];

  for (const rule of allRules) {
    try {
      const result = rule.validate(data);
      checks.push({
        id: rule.id,
        label: rule.label,
        description: rule.description,
        status: result.passed
          ? "passed"
          : rule.severity === "warning"
            ? "warning"
            : "failed",
        details: result.details,
        count: result.count,
        category: rule.category,
        severity: rule.severity,
        debug: result.debug,
      });
    } catch (error) {
      checks.push({
        id: rule.id,
        label: rule.label,
        description: rule.description,
        status: "failed",
        details: `Erro ao executar validação: ${error}`,
        category: rule.category,
        severity: rule.severity,
        debug: {
          logic: rule.description,
          expected: "Execução sem erros",
          actual: String(error),
        },
      });
    }
  }

  return checks;
}

function calculateDataQuality(checks: LeagueValidationCheck[]): {
  score: number;
  passed: number;
  total: number;
  criticalFailed: number;
} {
  const total = checks.length;
  const passed = checks.filter((c) => c.status === "passed").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const criticalFailed = checks.filter(
    (c) => c.status === "failed" && c.severity === "critical",
  ).length;

  // passed = 100%, warning = 50%, failed = 0%
  const score = Math.round((passed * 100 + warnings * 50) / total);

  return {
    score: Math.min(100, score),
    passed,
    total,
    criticalFailed,
  };
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE VALIDAÇÃO
// ============================================================================

export function validateLeagueImportData(
  data: ParsedLeagueImportData,
): LeagueValidationResult {
  // Executa todas as validações
  const checks = runValidations(data);
  const quality = calculateDataQuality(checks);

  // Warnings baseados nos dados
  const warnings: LeagueValidationWarning[] = [];

  // Verifica se PPSR não tem dados
  if ((data.jogosPPSR?.length ?? 0) === 0 && (data.jogosPPSRInicioCount ?? 0) > 0) {
    warnings.push({
      id: "ppsr_no_players",
      severity: "warning",
      title: "Cash games sem jogadores",
      description:
        "A aba Jogos PPSR contém mesas mas nenhum jogador foi parseado.",
      suggestedAction: "Verifique o formato das colunas na aba Jogos PPSR",
    });
  }

  // Calcula estatísticas
  const totalLigasPPST = new Set<number>();
  const totalJogosPPST = data.jogosPPST?.length ?? 0;
  let totalJogadoresPPST = 0;
  let totalBuyinPPST = 0;
  let totalGanhosPPST = 0;
  let totalTaxaPPST = 0;
  let totalGapGarantidoPPST = 0;

  for (const bloco of data.geralPPST || []) {
    for (const liga of bloco.ligas) {
      totalLigasPPST.add(liga.ligaId);
    }
  }

  for (const jogo of data.jogosPPST || []) {
    totalJogadoresPPST += jogo.jogadores.length;
    for (const jogador of jogo.jogadores) {
      totalBuyinPPST += jogador.buyinFichas;
      totalGanhosPPST += jogador.ganhos;
      totalTaxaPPST += jogador.taxa ?? 0;
      totalGapGarantidoPPST += jogador.gapGarantido ?? 0;
    }
  }

  // Distribuição por tipo de jogo
  let nlhCount = 0;
  let spinupCount = 0;
  let knockoutCount = 0;
  let satelliteCount = 0;
  for (const jogo of data.jogosPPST || []) {
    const subtipo = jogo.metadata.subtipo;
    const tipoJogo = jogo.metadata.tipoJogo;

    if (tipoJogo.includes("SPINUP")) {
      spinupCount++;
    } else if (subtipo === "knockout") {
      knockoutCount++;
    } else if (subtipo === "satellite") {
      satelliteCount++;
    } else {
      nlhCount++;
    }
  }

  const totalJogos = nlhCount + spinupCount + knockoutCount + satelliteCount || 1;

  // Top ligas por taxa
  const ligaTaxas = new Map<
    number,
    { nome: string; taxa: number; ganhos: number }
  >();
  for (const bloco of data.geralPPST || []) {
    for (const liga of bloco.ligas) {
      const existing = ligaTaxas.get(liga.ligaId);
      ligaTaxas.set(liga.ligaId, {
        nome: liga.ligaNome,
        taxa: (existing?.taxa ?? 0) + liga.ganhosLigaTaxa,
        ganhos: (existing?.ganhos ?? 0) + liga.ganhosLigaGeral,
      });
    }
  }

  const topLigas = [...ligaTaxas.entries()]
    .map(([id, data]) => ({
      ligaId: id,
      ligaNome: data.nome,
      totalGanhos: data.ganhos,
      totalTaxa: data.taxa,
    }))
    .sort((a, b) => b.totalTaxa - a.totalTaxa)
    .slice(0, 10);

  // Período
  let periodDays = 0;
  if (data.periodStart && data.periodEnd) {
    const start = new Date(data.periodStart);
    const end = new Date(data.periodEnd);
    periodDays = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    );
  }

  // hasBlockingErrors = true se QUALQUER check crítico falhou
  const hasBlockingErrors = quality.criticalFailed > 0;

  return {
    qualityScore: quality.score,
    passedChecks: quality.passed,
    totalChecks: quality.total,
    hasBlockingErrors,

    checks,
    warnings,

    period: {
      start: data.periodStart || "",
      end: data.periodEnd || "",
      days: periodDays,
    },

    stats: {
      totalLigasPPST: totalLigasPPST.size,
      totalJogosPPST,
      totalJogadoresPPST,
      totalBuyinPPST,
      totalGanhosPPST,
      totalTaxaPPST,
      totalGapGarantidoPPST,
      // PPSR Stats
      totalLigasPPSR: (() => {
        const ligas = new Set<number>();
        for (const jogo of data.jogosPPSR || []) {
          for (const jogador of jogo.jogadores) {
            ligas.add(jogador.ligaId);
          }
        }
        return ligas.size;
      })(),
      totalJogosPPSR: data.jogosPPSR?.length ?? 0,
      totalJogadoresPPSR: (data.jogosPPSR || []).reduce((sum, j) => sum + j.jogadores.length, 0),
      totalMaosPPSR: (data.jogosPPSR || []).reduce((sum, j) => sum + j.totalGeral.maos, 0),
      totalBuyinPPSR: (data.jogosPPSR || []).reduce((sum, j) => sum + j.totalGeral.buyinFichas, 0),
      totalGanhosPPSR: (data.jogosPPSR || []).reduce((sum, j) => sum + j.totalGeral.ganhosJogadorGeral, 0),
      totalTaxaPPSR: (data.jogosPPSR || []).reduce((sum, j) => sum + j.totalGeral.taxa, 0),
    },

    gameTypeDistribution: [
      {
        type: "NLH",
        label: "MTT (Torneios)",
        count: nlhCount,
        percentage: (nlhCount / totalJogos) * 100,
      },
      {
        type: "SPINUP",
        label: "SPIN",
        count: spinupCount,
        percentage: (spinupCount / totalJogos) * 100,
      },
      {
        type: "KNOCKOUT",
        label: "PKO/MKO",
        count: knockoutCount,
        percentage: (knockoutCount / totalJogos) * 100,
      },
      {
        type: "SATELLITE",
        label: "Satélite",
        count: satelliteCount,
        percentage: (satelliteCount / totalJogos) * 100,
      },
    ],

    topLigas,
  };
}
