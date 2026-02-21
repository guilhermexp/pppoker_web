/**
 * PPPoker Spreadsheet Types and File Name Parser
 *
 * Parser para extrair metadados do nome de arquivos exportados pelo PPPoker.
 * Documentação completa: docs/Spreadsheet_Validation/SPREADSHEET_FILE_NAMING.md
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Tipos de planilha do PPPoker
 */
export type SpreadsheetType =
  | "super-union" // Liga com PPST-PPSR (lobby global)
  | "super-union-ppst" // Liga com apenas PPST (torneios globais)
  | "super-union-ppsr" // Liga com apenas PPSR (cash global)
  | "league" // Liga sem PPST-PPSR (dados da liga + clubes)
  | "club"; // Clube individual (sem liga)

/**
 * Metadados extraídos do nome do arquivo
 */
export type SpreadsheetMetadata = {
  /** Tipo da planilha detectado */
  type: SpreadsheetType;

  /** Nome do tipo em português para exibição */
  typeLabel: string;

  /** Descrição do que a planilha contém */
  typeDescription: string;

  /** ID primário (liga ou clube) */
  primaryId: number | null;

  /** ID secundário (clube master ou outro identificador) */
  secondaryId: number | null;

  /** Data de início do período (YYYYMMDD) */
  dateStart: string | null;

  /** Data de fim do período (YYYYMMDD) */
  dateEnd: string | null;

  /** Data de início formatada (DD/MM/YYYY) */
  dateStartFormatted: string | null;

  /** Data de fim formatada (DD/MM/YYYY) */
  dateEndFormatted: string | null;

  /** Sufixo detectado (PPST-PPSR, PPST, PPSR, ou null) */
  suffix: "PPST-PPSR" | "PPST" | "PPSR" | null;

  /** Se o parse foi bem-sucedido */
  parsed: boolean;

  /** Nome original do arquivo */
  originalFileName: string;
};

// =============================================================================
// Type Labels and Descriptions
// =============================================================================

const TYPE_LABELS: Record<SpreadsheetType, string> = {
  "super-union": "Super Union (PPST + PPSR)",
  "super-union-ppst": "Super Union (Torneios)",
  "super-union-ppsr": "Super Union (Cash)",
  league: "Liga",
  club: "Clube",
};

const TYPE_DESCRIPTIONS: Record<SpreadsheetType, string> = {
  "super-union":
    "Dados de todas as ligas e clubes do lobby global (torneios + cash games)",
  "super-union-ppst":
    "Dados de torneios de todas as ligas do lobby global PPST",
  "super-union-ppsr":
    "Dados de cash games de todas as ligas do lobby global PPSR",
  league: "Dados da liga com todos os clubes associados",
  club: "Dados apenas do clube individual",
};

// =============================================================================
// Parser Functions
// =============================================================================

/**
 * Formata uma data de YYYYMMDD para DD/MM/YYYY
 */
function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;

  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);

  return `${day}/${month}/${year}`;
}

/**
 * Valida se uma string é uma data válida no formato YYYYMMDD
 */
function isValidDate(dateStr: string): boolean {
  if (!dateStr || dateStr.length !== 8) return false;

  const year = Number.parseInt(dateStr.slice(0, 4), 10);
  const month = Number.parseInt(dateStr.slice(4, 6), 10);
  const day = Number.parseInt(dateStr.slice(6, 8), 10);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day))
    return false;
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

/**
 * Extrai metadados do nome do arquivo da planilha PPPoker
 *
 * @param fileName Nome do arquivo (com ou sem extensão)
 * @returns Metadados extraídos do nome do arquivo
 *
 * @example
 * // Super Union
 * parseSpreadsheetFileName("1765-962181-20251215-20251221-PPST-PPSR.xlsx")
 * // => { type: "super-union", primaryId: 1765, secondaryId: 962181, ... }
 *
 * @example
 * // Liga
 * parseSpreadsheetFileName("1765-962181-20251215-20251221.xlsx")
 * // => { type: "league", primaryId: 1765, secondaryId: 962181, ... }
 *
 * @example
 * // Clube
 * parseSpreadsheetFileName("3357-4210947-20250901-20250907.xlsx")
 * // => { type: "club", primaryId: 3357, secondaryId: 4210947, ... }
 */
export function parseSpreadsheetFileName(
  fileName: string,
): SpreadsheetMetadata {
  const baseName = fileName.replace(/\.(xlsx|xls|csv)$/i, "");

  // Default result for unparseable files
  const defaultResult: SpreadsheetMetadata = {
    type: "club",
    typeLabel: TYPE_LABELS.club,
    typeDescription: TYPE_DESCRIPTIONS.club,
    primaryId: null,
    secondaryId: null,
    dateStart: null,
    dateEnd: null,
    dateStartFormatted: null,
    dateEndFormatted: null,
    suffix: null,
    parsed: false,
    originalFileName: fileName,
  };

  // Try to match Super Union pattern with PPST-PPSR, PPST, or PPSR suffix
  const superUnionMatch = baseName.match(
    /^(\d+)-(\d+)-(\d{8})-(\d{8})-(PPST-PPSR|PPST|PPSR)$/,
  );

  if (superUnionMatch) {
    const [, primaryId, secondaryId, dateStart, dateEnd, suffix] =
      superUnionMatch;

    let type: SpreadsheetType;
    if (suffix === "PPST-PPSR") {
      type = "super-union";
    } else if (suffix === "PPST") {
      type = "super-union-ppst";
    } else {
      type = "super-union-ppsr";
    }

    return {
      type,
      typeLabel: TYPE_LABELS[type],
      typeDescription: TYPE_DESCRIPTIONS[type],
      primaryId: Number.parseInt(primaryId, 10),
      secondaryId: Number.parseInt(secondaryId, 10),
      dateStart,
      dateEnd,
      dateStartFormatted: formatDate(dateStart),
      dateEndFormatted: formatDate(dateEnd),
      suffix: suffix as "PPST-PPSR" | "PPST" | "PPSR",
      parsed: true,
      originalFileName: fileName,
    };
  }

  // Try to match Liga/Club pattern without suffix
  const standardMatch = baseName.match(/^(\d+)-(\d+)-(\d{8})-(\d{8})$/);

  if (standardMatch) {
    const [, primaryId, secondaryId, dateStart, dateEnd] = standardMatch;

    // Validate dates
    if (!isValidDate(dateStart) || !isValidDate(dateEnd)) {
      return defaultResult;
    }

    // Heuristic: If primary ID is a known league ID or has certain characteristics,
    // classify as "league", otherwise as "club"
    // For now, we'll use a simple heuristic based on ID size
    // Liga IDs tend to be smaller (under 10000), club IDs larger
    // But this is just a guess - the user or system should confirm
    const primaryIdNum = Number.parseInt(primaryId, 10);
    const type: SpreadsheetType = primaryIdNum < 10000 ? "league" : "club";

    return {
      type,
      typeLabel: TYPE_LABELS[type],
      typeDescription: TYPE_DESCRIPTIONS[type],
      primaryId: primaryIdNum,
      secondaryId: Number.parseInt(secondaryId, 10),
      dateStart,
      dateEnd,
      dateStartFormatted: formatDate(dateStart),
      dateEndFormatted: formatDate(dateEnd),
      suffix: null,
      parsed: true,
      originalFileName: fileName,
    };
  }

  return defaultResult;
}

/**
 * Gera uma descrição formatada do tipo de planilha para exibição na UI
 */
export function getSpreadsheetDescription(
  metadata: SpreadsheetMetadata,
): string {
  if (!metadata.parsed) {
    return "Tipo de planilha não identificado";
  }

  const parts: string[] = [];

  // Add type label
  parts.push(`📋 ${metadata.typeLabel}`);

  // Add IDs
  if (
    metadata.type === "super-union" ||
    metadata.type === "super-union-ppst" ||
    metadata.type === "super-union-ppsr"
  ) {
    parts.push(`Liga: ${metadata.primaryId}`);
    parts.push(`Clube Master: ${metadata.secondaryId}`);
  } else if (metadata.type === "league") {
    parts.push(`Liga: ${metadata.primaryId}`);
    parts.push(`Clube Master: ${metadata.secondaryId}`);
  } else {
    parts.push(`Clube: ${metadata.primaryId}`);
  }

  // Add period
  if (metadata.dateStartFormatted && metadata.dateEndFormatted) {
    parts.push(
      `Período: ${metadata.dateStartFormatted} - ${metadata.dateEndFormatted}`,
    );
  }

  return parts.join(" | ");
}

/**
 * IDs das ligas brasileiras conhecidas (para validação/classificação)
 * Estes IDs representam ligas que são responsáveis por ~60% do GTD
 */
export const KNOWN_LEAGUE_IDS = {
  BRAZILIAN_LEAGUES: ["1765", "1675", "2448", "2101"],
};

/**
 * Verifica se um ID é de uma liga brasileira conhecida
 */
export function isBrazilianLeague(ligaId: string | number): boolean {
  return KNOWN_LEAGUE_IDS.BRAZILIAN_LEAGUES.includes(String(ligaId));
}
