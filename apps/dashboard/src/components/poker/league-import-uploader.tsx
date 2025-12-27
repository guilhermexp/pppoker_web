"use client";

import { useI18n } from "@/locales/client";
import type {
  ParsedLeagueImportData,
  LeagueValidationResult,
  ParsedLeagueSummary,
  ParsedLeagueClubRow,
} from "@/lib/poker/league-types";
import type {
  ParsedPlayer,
  ParsedTransaction,
  ParsedSession,
  ParsedSummary,
  ParsedDetailed,
  ParsedDemonstrativo,
  ParsedRakeback,
} from "@/lib/poker/types";
import { cn } from "@midday/ui/cn";
import { Skeleton } from "@midday/ui/skeleton";
import { useToast } from "@midday/ui/use-toast";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { LeagueImportValidationModal } from "./league-import-validation-modal";

// Helper to convert values to numbers
function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const cleaned = value.toString().replace(",", ".").trim();
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Convert column letter to index (A=0, B=1, ..., Z=25, AA=26, etc)
function columnLetterToIndex(letter: string): number {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
}

// Get cell value with formula calculation support
function getCellValue(
  sheet: XLSX.Sheet,
  address: string,
  visited: Set<string> = new Set()
): number {
  if (visited.has(address)) return 0;
  visited.add(address);

  const cell = sheet[address];
  if (!cell) return 0;

  if (cell.v !== undefined && cell.v !== null) {
    if (typeof cell.v === "number") return cell.v;
    const parsed = parseFloat(cell.v.replace(/,/g, "."));
    if (!isNaN(parsed)) return parsed;
  }

  if (cell.w !== undefined && cell.w !== null) {
    const parsed = parseFloat(String(cell.w).replace(/,/g, "."));
    if (!isNaN(parsed)) return parsed;
  }

  if (cell.f) {
    return calculateFormula(sheet, cell.f, visited);
  }

  return 0;
}

// Calculate Excel formulas recursively
function calculateFormula(
  sheet: XLSX.Sheet,
  formula: string,
  visited: Set<string> = new Set()
): number {
  const cleanFormula = formula.trim().replace(/^=/, "");

  // SUM(range) - e.g., SUM(I5:Q5)
  const sumMatch = cleanFormula.match(/^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/i);
  if (sumMatch) {
    const [, startCol, startRowStr, endCol, endRowStr] = sumMatch;
    const startColIdx = columnLetterToIndex(startCol);
    const endColIdx = columnLetterToIndex(endCol);
    const startRowIdx = parseInt(startRowStr, 10) - 1;
    const endRowIdx = parseInt(endRowStr, 10) - 1;

    let sum = 0;
    for (let row = startRowIdx; row <= endRowIdx; row++) {
      for (let col = startColIdx; col <= endColIdx; col++) {
        const addr = XLSX.utils.encode_cell({ r: row, c: col });
        sum += getCellValue(sheet, addr, new Set(visited));
      }
    }
    return sum;
  }

  // SUBTOTAL(9,range) - same as SUM
  const subtotalMatch = cleanFormula.match(/^SUBTOTAL\s*\(\s*\d+\s*,\s*([A-Z]+)(\d+):([A-Z]+)(\d+)\s*\)$/i);
  if (subtotalMatch) {
    const [, startCol, startRowStr, endCol, endRowStr] = subtotalMatch;
    const startColIdx = columnLetterToIndex(startCol);
    const endColIdx = columnLetterToIndex(endCol);
    const startRowIdx = parseInt(startRowStr, 10) - 1;
    const endRowIdx = parseInt(endRowStr, 10) - 1;

    let sum = 0;
    for (let row = startRowIdx; row <= endRowIdx; row++) {
      for (let col = startColIdx; col <= endColIdx; col++) {
        const addr = XLSX.utils.encode_cell({ r: row, c: col });
        sum += getCellValue(sheet, addr, new Set(visited));
      }
    }
    return sum;
  }

  // Simple SUM with single column range like SUM(G:G) or SUM(G5:G999)
  const colSumMatch = cleanFormula.match(/^SUM\(([A-Z]+)(?:(\d+))?:([A-Z]+)(?:(\d+))?\)$/i);
  if (colSumMatch) {
    const [, startCol, startRowStr, endCol, endRowStr] = colSumMatch;
    if (startCol === endCol) {
      const colIdx = columnLetterToIndex(startCol);
      const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
      const startRow = startRowStr ? parseInt(startRowStr, 10) - 1 : 0;
      const endRow = endRowStr ? parseInt(endRowStr, 10) - 1 : range.e.r;

      let sum = 0;
      for (let row = startRow; row <= endRow; row++) {
        const addr = XLSX.utils.encode_cell({ r: row, c: colIdx });
        sum += getCellValue(sheet, addr, new Set(visited));
      }
      return sum;
    }
  }

  // SUMIF/SUMIFS - just return 0 as we can't evaluate these properly
  if (cleanFormula.match(/^SUMIFS?\(/i)) {
    return 0;
  }

  // IF statement: IF(condition, true_val, false_val) - try to evaluate simple ones
  const ifMatch = cleanFormula.match(/^IF\(([^,]+),\s*([^,]+),\s*([^)]+)\)$/i);
  if (ifMatch) {
    // For now, just try to get the true value if it's a cell reference
    const trueVal = ifMatch[2].trim();
    const cellRef = trueVal.match(/^([A-Z]+)(\d+)$/i);
    if (cellRef) {
      const addr = XLSX.utils.encode_cell({ r: parseInt(cellRef[2], 10) - 1, c: columnLetterToIndex(cellRef[1]) });
      return getCellValue(sheet, addr, new Set(visited));
    }
    // Try as number
    const num = parseFloat(trueVal);
    if (!isNaN(num)) return num;
    return 0;
  }

  // Cell reference like =A1 or A1
  const cellRefMatch = cleanFormula.match(/^([A-Z]+)(\d+)$/i);
  if (cellRefMatch) {
    const [, col, rowStr] = cellRefMatch;
    const colIdx = columnLetterToIndex(col);
    const rowIdx = parseInt(rowStr, 10) - 1;
    const addr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
    return getCellValue(sheet, addr, visited);
  }

  // Multiple cell arithmetic: A1+B1+C1 or A1-B1-C1 or A1+B1-C1 etc
  const multiArithMatch = cleanFormula.match(/^([A-Z]+\d+(?:\s*[+\-]\s*[A-Z]+\d+)+)$/i);
  if (multiArithMatch) {
    const parts = cleanFormula.split(/([+\-])/);
    let result = 0;
    let currentOp = "+";

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed === "+" || trimmed === "-") {
        currentOp = trimmed;
      } else {
        const ref = trimmed.match(/^([A-Z]+)(\d+)$/i);
        if (ref) {
          const addr = XLSX.utils.encode_cell({ r: parseInt(ref[2], 10) - 1, c: columnLetterToIndex(ref[1]) });
          const val = getCellValue(sheet, addr, new Set(visited));
          result = currentOp === "+" ? result + val : result - val;
        }
      }
    }
    return result;
  }

  // Simple arithmetic: A1+B1 or A1-B1
  const arithmeticMatch = cleanFormula.match(/^([A-Z]+)(\d+)\s*([+\-])\s*([A-Z]+)(\d+)$/i);
  if (arithmeticMatch) {
    const [, col1, row1, op, col2, row2] = arithmeticMatch;
    const addr1 = XLSX.utils.encode_cell({ r: parseInt(row1, 10) - 1, c: columnLetterToIndex(col1) });
    const addr2 = XLSX.utils.encode_cell({ r: parseInt(row2, 10) - 1, c: columnLetterToIndex(col2) });
    const val1 = getCellValue(sheet, addr1, new Set(visited));
    const val2 = getCellValue(sheet, addr2, new Set(visited));
    return op === "+" ? val1 + val2 : val1 - val2;
  }

  // Multiplication/Division: A1*B1 or A1/B1
  const multDivMatch = cleanFormula.match(/^([A-Z]+)(\d+)\s*([*\/])\s*([A-Z]+)(\d+)$/i);
  if (multDivMatch) {
    const [, col1, row1, op, col2, row2] = multDivMatch;
    const addr1 = XLSX.utils.encode_cell({ r: parseInt(row1, 10) - 1, c: columnLetterToIndex(col1) });
    const addr2 = XLSX.utils.encode_cell({ r: parseInt(row2, 10) - 1, c: columnLetterToIndex(col2) });
    const val1 = getCellValue(sheet, addr1, new Set(visited));
    const val2 = getCellValue(sheet, addr2, new Set(visited));
    if (op === "*") return val1 * val2;
    if (op === "/" && val2 !== 0) return val1 / val2;
    return 0;
  }

  // Number with cell: A1*100 or 100*A1 or A1/100
  const numCellMatch = cleanFormula.match(/^(?:([A-Z]+)(\d+)\s*([*\/])\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*([*\/])\s*([A-Z]+)(\d+))$/i);
  if (numCellMatch) {
    if (numCellMatch[1]) {
      // Cell first: A1*100
      const addr = XLSX.utils.encode_cell({ r: parseInt(numCellMatch[2], 10) - 1, c: columnLetterToIndex(numCellMatch[1]) });
      const cellVal = getCellValue(sheet, addr, new Set(visited));
      const num = parseFloat(numCellMatch[4]);
      const op = numCellMatch[3];
      if (op === "*") return cellVal * num;
      if (op === "/" && num !== 0) return cellVal / num;
    } else {
      // Number first: 100*A1
      const addr = XLSX.utils.encode_cell({ r: parseInt(numCellMatch[8], 10) - 1, c: columnLetterToIndex(numCellMatch[7]) });
      const cellVal = getCellValue(sheet, addr, new Set(visited));
      const num = parseFloat(numCellMatch[5]);
      const op = numCellMatch[6];
      if (op === "*") return num * cellVal;
      if (op === "/" && cellVal !== 0) return num / cellVal;
    }
    return 0;
  }

  // Plain number
  const plainNum = parseFloat(cleanFormula);
  if (!isNaN(plainNum)) return plainNum;

  return 0;
}

// Parse sheet by position
function parseSheetByPosition(
  sheet: XLSX.Sheet,
  columnMap: Record<string, number>,
  headerRows: number = 4,
  rowFilter?: (rowData: Record<string, any>) => boolean
): any[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const result: any[] = [];

  for (let row = headerRows; row <= range.e.r; row++) {
    const rowData: Record<string, any> = {};
    let hasValidId = false;

    for (const [field, colIdx] of Object.entries(columnMap)) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIdx });
      const cell = sheet[cellAddress];

      let value = null;
      if (cell) {
        // Priority 1: Get the raw value if it exists
        if (cell.v !== undefined && cell.v !== null) {
          value = cell.v;
        }
        // Priority 2: If cell has formula but no cached value, try to calculate
        else if (cell.f) {
          value = calculateFormula(sheet, cell.f, new Set());
        }
        // Priority 3: Try formatted text value
        else if (cell.w !== undefined && cell.w !== null && cell.w !== "") {
          const trimmed = String(cell.w).trim().replace(/,/g, ".");
          const parsed = parseFloat(trimmed);
          value = !isNaN(parsed) ? parsed : cell.w;
        }

        // Additional check: if we have a formula and the value seems wrong (0 for a formula that should have a value)
        // This handles cases where Excel didn't cache the formula result
        if (cell.f && (value === 0 || value === null || value === undefined)) {
          const calculated = calculateFormula(sheet, cell.f, new Set());
          if (calculated !== 0) {
            value = calculated;
          }
        }
      }

      if (value === "None" || value === "none") value = null;
      if (typeof value === "string") value = value.trim();

      rowData[field] = value;

      if (field === "ppPokerId" && value && !isNaN(Number(value))) {
        hasValidId = true;
      }
    }

    if (rowFilter) {
      if (rowFilter(rowData)) {
        result.push(rowData);
      }
    } else if (hasValidId) {
      result.push(rowData);
    }
  }

  return result;
}

// Column mappings for "Geral de Clube" sheet (49 columns: A-AW)
// Based on debug output:
// Row 1 = Headers, Row 2 = empty, Row 3+ = Data (headerRows: 3)
// Note: Multiple clubs in the same sheet - Column A identifies which club each player belongs to
const GERAL_COLUMNS = {
  // Section 1: Player Info (A-I)
  clubIdentifier: 0,           // A: Club name with ID (e.g., "C.P.C. OnLine (962181)") - merged cells
  ppPokerId: 1,                // B: ID do jogador
  country: 2,                  // C: País/região
  nickname: 3,                 // D: Apelido
  memoName: 4,                 // E: Nome de memorando
  agentNickname: 5,            // F: Agente
  agentPpPokerId: 6,           // G: ID do agente
  superAgentNickname: 7,       // H: Superagente
  superAgentPpPokerId: 8,      // I: ID do superagente

  // Section 2: Player Winnings Summary (J)
  playerWinningsTotal: 9,      // J: Ganhos de jogador gerais (FORMULA: SUM(K:O) or similar)

  // Section 3: Classifications (K-N)
  classificationPpsr: 10,      // K: Classificação PPSR
  classificationRing: 11,      // L: Classificação Ring Game
  classificationCustomRing: 12, // M: Classificação de RG Personalizado
  classificationMtt: 13,       // N: Classificação MTT

  // Section 4: Player Earnings by Game Type (O-X) - "Ganhos do jogador" sub-columns
  generalTotal: 14,            // O: Geral (total)
  ringGamesTotal: 15,          // P: Ring Games
  mttSitNGoTotal: 16,          // Q: MTT, SitNGo
  spinUpTotal: 17,             // R: SPINUP
  caribbeanTotal: 18,          // S: Caribbean+ Poker
  colorGameTotal: 19,          // T: COLOR GAME
  crashTotal: 20,              // U: CRASH
  luckyDrawTotal: 21,          // V: LUCKY DRAW
  jackpotTotal: 22,            // W: Jackpot
  evSplitTotal: 23,            // X: Dividir EV

  // Section 5: Tickets (Y-AA)
  ticketValueWon: 24,          // Y: Valor do ticket ganho
  ticketBuyIn: 25,             // Z: Buy-in de ticket
  customPrizeValue: 26,        // AA: Valor do prêmio personalizado

  // Section 6: Club Earnings (AB-AT) - "Ganhos do clube" sub-columns
  feeGeneral: 27,              // AB: Geral (total)
  fee: 28,                     // AC: Taxa
  feePpst: 29,                 // AD: Taxa (jogos PPST)
  feeNonPpst: 30,              // AE: Taxa (jogos não PPST)
  feePpsr: 31,                 // AF: Taxa (jogos PPSR)
  feeNonPpsr: 32,              // AG: Taxa (jogos não PPSR)
  spinUpBuyIn: 33,             // AH: Buy-in de SPINUP
  spinUpPrize: 34,             // AI: Premiação de SPINUP
  caribbeanBets: 35,           // AJ: Apostas de Caribbean+ Poker
  caribbeanPrize: 36,          // AK: Premiação de Caribbean+ Poker
  colorGameBets: 37,           // AL: Apostas do COLOR GAME
  colorGamePrize: 38,          // AM: Premiação do COLOR GAME
  crashBets: 39,               // AN: Apostas (CRASH)
  crashPrize: 40,              // AO: Prêmios (CRASH)
  luckyDrawBets: 41,           // AP: Apostas de LUCKY DRAW
  luckyDrawPrize: 42,          // AQ: Premiação de LUCKY DRAW
  jackpotFee: 43,              // AR: Taxa do Jackpot
  jackpotPrize: 44,            // AS: Prêmios Jackpot
  evSplit: 45,                 // AT: Dividir EV

  // Section 7: Final Tickets (AU-AV)
  ticketDeliveredValue: 46,    // AU: Valor do ticket entregue
  ticketDeliveredBuyIn: 47,    // AV: Buy-in de ticket
  // AW(48) = empty/unused
};

// Column mappings for "Geral de Liga" sheet
// Based on debug output: Column A has merged period info, data starts at column B
// Lines 1-2: Description, Line 3: Section headers (merged), Line 4: Column headers, Line 5+: Data
const GERAL_DE_LIGA_COLUMNS = {
  // Section 1: Club Info (B-C) - Column A is period info
  clubName: 1,                    // B: Nome do Clube
  clubId: 2,                      // C: ID de clube

  // Section 2: Classifications (D-G)
  classificationPpsr: 3,          // D: Classificação PPSR
  classificationRingGame: 4,      // E: Classificação Ring Game
  classificationRgCustom: 5,      // F: Classificação de RG Personalizado
  classificationMtt: 6,           // G: Classificação MTT

  // Section 3: Player Earnings - Ganhos do jogador (H-Q)
  // H = SUM(I:Q), so H is the total (index 7)
  playerEarningsGeneral: 7,       // H: Geral (formula: SUM of I:Q)
  playerEarningsRingGames: 8,     // I: Ring Games
  playerEarningsMttSitNGo: 9,     // J: MTT, SitNGo
  playerEarningsSpinUp: 10,       // K: SPINUP
  playerEarningsCaribbeanPoker: 11, // L: Caribbean+ Poker
  playerEarningsColorGame: 12,    // M: COLOR GAME
  playerEarningsCrash: 13,        // N: CRASH
  playerEarningsLuckyDraw: 14,    // O: LUCKY DRAW
  playerEarningsJackpot: 15,      // P: Jackpot
  playerEarningsSplitEv: 16,      // Q: Dividir EV

  // Section 4: Ticket/Prize (R-T)
  ticketValueWon: 17,             // R: Valor do ticket ganho
  ticketBuyInPlayer: 18,          // S: Buy-in de ticket
  customPrizeValue: 19,           // T: Valor do prêmio personalizado

  // Section 5: Club Earnings - Ganhos do clube (U-AM)
  clubEarningsGeneral: 20,        // U: Geral
  clubEarningsFee: 21,            // V: Taxa
  clubEarningsFeePpst: 22,        // W: Taxa (jogos PPST)
  clubEarningsFeeNonPpst: 23,     // X: Taxa (jogos não PPST)
  clubEarningsFeePpsr: 24,        // Y: Taxa (jogos PPSR)
  clubEarningsFeeNonPpsr: 25,     // Z: Taxa (jogos não PPSR)
  clubEarningsSpinUpBuyIn: 26,    // AA: Buy-in de SPINUP
  clubEarningsSpinUpPrize: 27,    // AB: Premiação de SPINUP
  clubEarningsCaribbeanBets: 28,  // AC: Apostas de Caribbean+ Poker
  clubEarningsCaribbeanPrize: 29, // AD: Premiação de Caribbean+ Poker
  clubEarningsColorGameBets: 30,  // AE: Apostas do COLOR GAME
  clubEarningsColorGamePrize: 31, // AF: Premiação do COLOR GAME
  clubEarningsCrashBets: 32,      // AG: Apostas (CRASH)
  clubEarningsCrashPrize: 33,     // AH: Prêmios (CRASH)
  clubEarningsLuckyDrawBets: 34,  // AI: Apostas de LUCKY DRAW
  clubEarningsLuckyDrawPrize: 35, // AJ: Premiação de LUCKY DRAW
  clubEarningsJackpotFee: 36,     // AK: Taxa do Jackpot
  clubEarningsJackpotPrize: 37,   // AL: Prêmios Jackpot
  clubEarningsSplitEv: 38,        // AM: Dividir EV

  // Section 6: Final Ticket/Gap (AN-AQ)
  ticketDeliveredValue: 39,       // AN: Valor do ticket entregue
  ticketDeliveredBuyIn: 40,       // AO: Buy-in de ticket
  guaranteedGap: 41,              // AP/AQ: Gap garantido
};

const USER_DETAILS_COLUMNS = {
  lastActiveAt: 0, ppPokerId: 1, country: 2, nickname: 3, memoName: 4, chipBalance: 5,
  agentNickname: 6, agentPpPokerId: 7, agentCreditBalance: 8, superAgentNickname: 9,
  superAgentPpPokerId: 10, superAgentCreditBalance: 11,
};

const TRANSACOES_COLUMNS = {
  occurredAt: 0, senderClubId: 1, senderPlayerId: 2, senderNickname: 3, senderMemoName: 4,
  recipientPlayerId: 5, recipientNickname: 6, recipientMemoName: 7, creditSent: 8, creditRedeemed: 9,
  creditLeftClub: 10, chipsSent: 11, classificationPpsr: 12, classificationRing: 13,
  classificationCustomRing: 14, classificationMtt: 15, chipsRedeemed: 16, chipsLeftClub: 17,
  ticketSent: 18, ticketRedeemed: 19, ticketExpired: 20,
};

// Helper to parse club identifier from multiline format:
// "BADBEAT VIP\n(41144)\n2025/12/15\n-\n2025/12/21\nUTC -0500"
// Returns: { clubName, clubId, periodStart, periodEnd, utcOffset }
type ParsedClubInfo = {
  clubName: string | null;
  clubId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  utcOffset: string | null;
};

function parseClubIdentifier(identifier: string | null): ParsedClubInfo {
  if (!identifier) return { clubName: null, clubId: null, periodStart: null, periodEnd: null, utcOffset: null };

  const str = String(identifier).trim();
  const lines = str.split(/\n/).map(l => l.trim()).filter(l => l && l !== "-");

  let clubName: string | null = null;
  let clubId: string | null = null;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  let utcOffset: string | null = null;

  for (const line of lines) {
    // Check for ID in parentheses: (41144)
    const idMatch = line.match(/^\((\d+)\)$/);
    if (idMatch) {
      clubId = idMatch[1];
      continue;
    }

    // Check for UTC offset: UTC -0500
    const utcMatch = line.match(/^UTC\s*([+-]?\d+)$/i);
    if (utcMatch) {
      utcOffset = utcMatch[1];
      continue;
    }

    // Check for date: 2025/12/15 or 2025-12-15
    const dateMatch = line.match(/^(\d{4}[\/\-]\d{2}[\/\-]\d{2})$/);
    if (dateMatch) {
      if (!periodStart) {
        periodStart = dateMatch[1];
      } else if (!periodEnd) {
        periodEnd = dateMatch[1];
      }
      continue;
    }

    // Otherwise it's the club name (first non-matched line)
    if (!clubName && line.length > 0) {
      clubName = line;
    }
  }

  return { clubName, clubId, periodStart, periodEnd, utcOffset };
}

// Parse Geral de Clube (Summary) sheet
// Structure: Each club has its own block with merged cell in column A
// Column A contains club identifier (merged cells spanning multiple rows)
// Column I contains "Total" for club total rows (should be skipped)
function parseGeralSheet(sheet: XLSX.Sheet): ParsedSummary[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const result: ParsedSummary[] = [];

  // Build a map of merged cells in column A to find club identifiers
  // Merged cells have value only in the first cell of the merge
  const merges = sheet["!merges"] || [];
  const clubRanges: Array<{ startRow: number; endRow: number; identifier: string }> = [];

  // Find all merged cells in column A (column 0)
  for (const merge of merges) {
    if (merge.s.c === 0) {
      // This is a merged cell starting in column A
      const startRow = merge.s.r;
      const endRow = merge.e.r;
      const cell = sheet[XLSX.utils.encode_cell({ r: startRow, c: 0 })];
      if (cell?.v) {
        clubRanges.push({
          startRow,
          endRow,
          identifier: String(cell.v),
        });
      }
    }
  }

  // Sort by startRow
  clubRanges.sort((a, b) => a.startRow - b.startRow);

  console.log("=== DEBUG Geral de Clube - Merged cells in column A ===");
  console.log(`Found ${clubRanges.length} club ranges from merged cells`);
  clubRanges.slice(0, 10).forEach((c, i) => {
    console.log(`Club ${i + 1}: rows ${c.startRow}-${c.endRow}, name="${c.identifier.substring(0, 40)}"`);
  });
  if (clubRanges.length > 10) console.log(`... and ${clubRanges.length - 10} more`);
  console.log("=== END DEBUG ===");

  // Helper to find club identifier for a given row
  const getClubForRow = (row: number): string | null => {
    for (const clubRange of clubRanges) {
      if (row >= clubRange.startRow && row <= clubRange.endRow) {
        return clubRange.identifier;
      }
    }
    return null;
  };

  // Process all rows
  for (let row = 0; row <= range.e.r; row++) {
    const rowData: Record<string, any> = {};
    let hasValidId = false;

    // Read all columns for this row
    for (const [field, colIdx] of Object.entries(GERAL_COLUMNS)) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIdx });
      const cell = sheet[cellAddress];

      let value = null;
      if (cell) {
        if (cell.v !== undefined && cell.v !== null) {
          value = cell.v;
        } else if (cell.f) {
          value = calculateFormula(sheet, cell.f, new Set());
        } else if (cell.w !== undefined && cell.w !== null && cell.w !== "") {
          const trimmed = String(cell.w).trim().replace(/,/g, ".");
          const parsed = parseFloat(trimmed);
          value = !isNaN(parsed) ? parsed : cell.w;
        }

        // Recalculate formulas that returned 0
        if (cell.f && (value === 0 || value === null || value === undefined)) {
          const calculated = calculateFormula(sheet, cell.f, new Set());
          if (calculated !== 0) {
            value = calculated;
          }
        }
      }

      if (value === "None" || value === "none") value = null;
      if (typeof value === "string") value = value.trim();

      rowData[field] = value;

      if (field === "ppPokerId" && value && !isNaN(Number(value))) {
        hasValidId = true;
      }
    }

    // Skip "Total" rows - these are club summary rows, not player rows
    // Check if superAgentPpPokerId (column I) contains "Total"
    const superAgentValue = String(rowData.superAgentPpPokerId || "").toLowerCase();
    if (superAgentValue === "total" || superAgentValue === "totais") {
      continue;
    }

    // Also check nickname column for "Total" (some sheets put it there)
    const nicknameValue = String(rowData.nickname || "").toLowerCase();
    if (nicknameValue === "total" || nicknameValue === "totais") {
      continue;
    }

    // Skip rows without valid player ID
    if (!hasValidId) continue;

    // Get club identifier for this row from merged cells
    const clubIdentifier = getClubForRow(row);

    // Parse club info from identifier
    const clubInfo = parseClubIdentifier(clubIdentifier);

    // Build the parsed summary with club info
    result.push({
      // Club identification (from column A merged cells)
      clubId: clubInfo.clubId || undefined,
      clubName: clubInfo.clubName || undefined,
      periodStart: clubInfo.periodStart || undefined,
      periodEnd: clubInfo.periodEnd || undefined,
      // Player info
      ppPokerId: String(rowData.ppPokerId || ""),
      country: rowData.country || null,
      nickname: rowData.nickname || "",
      memoName: rowData.memoName || null,
      agentNickname: rowData.agentNickname || null,
      agentPpPokerId: rowData.agentPpPokerId ? String(rowData.agentPpPokerId) : null,
      superAgentNickname: rowData.superAgentNickname || null,
      superAgentPpPokerId: rowData.superAgentPpPokerId ? String(rowData.superAgentPpPokerId) : null,
      // Classifications and earnings
      playerWinningsTotal: toNumber(rowData.playerWinningsTotal),
      classificationPpsr: toNumber(rowData.classificationPpsr),
      classificationRing: toNumber(rowData.classificationRing),
      classificationCustomRing: toNumber(rowData.classificationCustomRing),
      classificationMtt: toNumber(rowData.classificationMtt),
      generalTotal: toNumber(rowData.generalTotal),
      ringGamesTotal: toNumber(rowData.ringGamesTotal),
      mttSitNGoTotal: toNumber(rowData.mttSitNGoTotal),
      spinUpTotal: toNumber(rowData.spinUpTotal),
      caribbeanTotal: toNumber(rowData.caribbeanTotal),
      colorGameTotal: toNumber(rowData.colorGameTotal),
      crashTotal: toNumber(rowData.crashTotal),
      luckyDrawTotal: toNumber(rowData.luckyDrawTotal),
      jackpotTotal: toNumber(rowData.jackpotTotal),
      evSplitTotal: toNumber(rowData.evSplitTotal),
      ticketValueWon: toNumber(rowData.ticketValueWon),
      ticketBuyIn: toNumber(rowData.ticketBuyIn),
      customPrizeValue: toNumber(rowData.customPrizeValue),
      feeGeneral: toNumber(rowData.feeGeneral),
      fee: toNumber(rowData.fee),
      feePpst: toNumber(rowData.feePpst),
      feeNonPpst: toNumber(rowData.feeNonPpst),
      feePpsr: toNumber(rowData.feePpsr),
      feeNonPpsr: toNumber(rowData.feeNonPpsr),
      spinUpBuyIn: toNumber(rowData.spinUpBuyIn),
      spinUpPrize: toNumber(rowData.spinUpPrize),
      caribbeanBets: toNumber(rowData.caribbeanBets),
      caribbeanPrize: toNumber(rowData.caribbeanPrize),
      colorGameBets: toNumber(rowData.colorGameBets),
      colorGamePrize: toNumber(rowData.colorGamePrize),
      crashBets: toNumber(rowData.crashBets),
      crashPrize: toNumber(rowData.crashPrize),
      luckyDrawBets: toNumber(rowData.luckyDrawBets),
      luckyDrawPrize: toNumber(rowData.luckyDrawPrize),
      jackpotFee: toNumber(rowData.jackpotFee),
      jackpotPrize: toNumber(rowData.jackpotPrize),
      evSplit: toNumber(rowData.evSplit),
      ticketDeliveredValue: toNumber(rowData.ticketDeliveredValue),
      ticketDeliveredBuyIn: toNumber(rowData.ticketDeliveredBuyIn),
    } as ParsedSummary);
  }

  return result;
}

// Parse User Details sheet
function parseUserDetailsSheet(sheet: XLSX.Sheet): ParsedPlayer[] {
  const rawData = parseSheetByPosition(sheet, USER_DETAILS_COLUMNS, 3);
  return rawData.map((row) => ({
    ppPokerId: String(row.ppPokerId || ""),
    nickname: row.nickname || "",
    memoName: row.memoName || null,
    country: row.country || null,
    agentNickname: row.agentNickname || null,
    agentPpPokerId: row.agentPpPokerId ? String(row.agentPpPokerId) : null,
    superAgentNickname: row.superAgentNickname || null,
    superAgentPpPokerId: row.superAgentPpPokerId ? String(row.superAgentPpPokerId) : null,
    chipBalance: parseFloat(row.chipBalance || 0),
    agentCreditBalance: parseFloat(row.agentCreditBalance || 0),
    superAgentCreditBalance: parseFloat(row.superAgentCreditBalance || 0),
    lastActiveAt: row.lastActiveAt || null,
  }));
}

// Parse Transactions sheet
function parseTransacoesSheet(sheet: XLSX.Sheet): ParsedTransaction[] {
  const rawData = parseSheetByPosition(
    sheet,
    TRANSACOES_COLUMNS,
    3,
    (row) => Boolean(row.occurredAt)
  );
  return rawData.map((row) => ({
    occurredAt: row.occurredAt ? String(row.occurredAt) : "",
    clubId: row.senderClubId ? String(row.senderClubId) : null,
    senderClubId: row.senderClubId ? String(row.senderClubId) : null,
    playerId: row.senderPlayerId ? String(row.senderPlayerId) : null,
    senderNickname: row.senderNickname || null,
    senderMemoName: row.senderMemoName || null,
    senderPlayerId: row.senderPlayerId ? String(row.senderPlayerId) : null,
    recipientNickname: row.recipientNickname || null,
    recipientMemoName: row.recipientMemoName || null,
    recipientPlayerId: row.recipientPlayerId ? String(row.recipientPlayerId) : null,
    creditSent: toNumber(row.creditSent),
    creditRedeemed: toNumber(row.creditRedeemed),
    creditLeftClub: toNumber(row.creditLeftClub),
    chipsSent: toNumber(row.chipsSent),
    classificationPpsr: toNumber(row.classificationPpsr),
    classificationRing: toNumber(row.classificationRing),
    classificationCustomRing: toNumber(row.classificationCustomRing),
    classificationMtt: toNumber(row.classificationMtt),
    chipsRedeemed: toNumber(row.chipsRedeemed),
    chipsLeftClub: toNumber(row.chipsLeftClub),
    ticketSent: toNumber(row.ticketSent),
    ticketRedeemed: toNumber(row.ticketRedeemed),
    ticketExpired: toNumber(row.ticketExpired),
  }));
}

// Parse "Geral de Liga" sheet
// Structure: Lines 1-2 (description), Line 3 (section headers), Line 4 (column headers), Line 5+ (data)
function parseGeralDeLigaSheet(sheet: XLSX.Sheet): ParsedLeagueSummary {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const clubs: ParsedLeagueClubRow[] = [];

  // Extract period info from merged cell (usually contains "2025/12/08 UTC -4500")
  let periodDate = "";
  let periodUtcOffset = "";

  // Try to find period in first few cells of column A
  for (let r = 0; r <= Math.min(range.e.r, 20); r++) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    if (cell && cell.v) {
      const match = String(cell.v).match(/(\d{4}\/\d{2}\/\d{2})\s*UTC\s*(-?\d+)/i);
      if (match) {
        periodDate = match[1];
        periodUtcOffset = match[2];
        break;
      }
    }
  }

  // Parse club rows starting from line 5 (index 4)
  // Header is on line 4 (index 3)
  const dataStartRow = 4;

  for (let row = dataStartRow; row <= range.e.r; row++) {
    const rowData: Record<string, any> = {};

    // Read all columns for this row
    for (const [field, colIdx] of Object.entries(GERAL_DE_LIGA_COLUMNS)) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIdx });
      const cell = sheet[cellAddress];

      let value = null;
      if (cell) {
        // Priority 1: Get the raw value if it exists
        if (cell.v !== undefined && cell.v !== null) {
          value = cell.v;
        }
        // Priority 2: If cell has formula but no cached value, try to calculate
        else if (cell.f) {
          value = calculateFormula(sheet, cell.f, new Set());
        }
        // Priority 3: Try formatted text value
        else if (cell.w !== undefined && cell.w !== null && cell.w !== "") {
          const trimmed = String(cell.w).trim().replace(/,/g, ".");
          const parsed = parseFloat(trimmed);
          value = !isNaN(parsed) ? parsed : cell.w;
        }

        // Additional check: if we have a formula and the value seems wrong (0 for a formula that should have a value)
        if (cell.f && (value === 0 || value === null || value === undefined)) {
          const calculated = calculateFormula(sheet, cell.f, new Set());
          if (calculated !== 0) {
            value = calculated;
          }
        }
      }

      rowData[field] = value;
    }

    // Skip rows without valid club ID
    if (!rowData.clubId || rowData.clubId === null) continue;

    // Skip "Total" summary row (check both name and if ID looks like "Total")
    const clubNameLower = String(rowData.clubName || "").toLowerCase().trim();
    const clubIdStr = String(rowData.clubId || "").toLowerCase().trim();
    if (clubNameLower === "total" || clubNameLower === "totais" || clubIdStr === "total") continue;

    // Build parsed club row with all 42 columns
    const clubRow: ParsedLeagueClubRow = {
      // Section 1: Club Info
      clubName: String(rowData.clubName || ""),
      clubId: String(rowData.clubId || ""),

      // Section 2: Classifications
      classificationPpsr: toNumber(rowData.classificationPpsr),
      classificationRingGame: toNumber(rowData.classificationRingGame),
      classificationRgCustom: toNumber(rowData.classificationRgCustom),
      classificationMtt: toNumber(rowData.classificationMtt),

      // Section 3: Player Earnings
      playerEarningsGeneral: toNumber(rowData.playerEarningsGeneral),
      playerEarningsRingGames: toNumber(rowData.playerEarningsRingGames),
      playerEarningsMttSitNGo: toNumber(rowData.playerEarningsMttSitNGo),
      playerEarningsSpinUp: toNumber(rowData.playerEarningsSpinUp),
      playerEarningsCaribbeanPoker: toNumber(rowData.playerEarningsCaribbeanPoker),
      playerEarningsColorGame: toNumber(rowData.playerEarningsColorGame),
      playerEarningsCrash: toNumber(rowData.playerEarningsCrash),
      playerEarningsLuckyDraw: toNumber(rowData.playerEarningsLuckyDraw),
      playerEarningsJackpot: toNumber(rowData.playerEarningsJackpot),
      playerEarningsSplitEv: toNumber(rowData.playerEarningsSplitEv),

      // Section 4: Ticket/Prize
      ticketValueWon: toNumber(rowData.ticketValueWon),
      ticketBuyInPlayer: toNumber(rowData.ticketBuyInPlayer),
      customPrizeValue: toNumber(rowData.customPrizeValue),

      // Section 5: Club Earnings
      clubEarningsGeneral: toNumber(rowData.clubEarningsGeneral),
      clubEarningsFee: toNumber(rowData.clubEarningsFee),
      clubEarningsFeePpst: toNumber(rowData.clubEarningsFeePpst),
      clubEarningsFeeNonPpst: toNumber(rowData.clubEarningsFeeNonPpst),
      clubEarningsFeePpsr: toNumber(rowData.clubEarningsFeePpsr),
      clubEarningsFeeNonPpsr: toNumber(rowData.clubEarningsFeeNonPpsr),
      clubEarningsSpinUpBuyIn: toNumber(rowData.clubEarningsSpinUpBuyIn),
      clubEarningsSpinUpPrize: toNumber(rowData.clubEarningsSpinUpPrize),
      clubEarningsCaribbeanBets: toNumber(rowData.clubEarningsCaribbeanBets),
      clubEarningsCaribbeanPrize: toNumber(rowData.clubEarningsCaribbeanPrize),
      clubEarningsColorGameBets: toNumber(rowData.clubEarningsColorGameBets),
      clubEarningsColorGamePrize: toNumber(rowData.clubEarningsColorGamePrize),
      clubEarningsCrashBets: toNumber(rowData.clubEarningsCrashBets),
      clubEarningsCrashPrize: toNumber(rowData.clubEarningsCrashPrize),
      clubEarningsLuckyDrawBets: toNumber(rowData.clubEarningsLuckyDrawBets),
      clubEarningsLuckyDrawPrize: toNumber(rowData.clubEarningsLuckyDrawPrize),
      clubEarningsJackpotFee: toNumber(rowData.clubEarningsJackpotFee),
      clubEarningsJackpotPrize: toNumber(rowData.clubEarningsJackpotPrize),
      clubEarningsSplitEv: toNumber(rowData.clubEarningsSplitEv),

      // Section 6: Final Ticket/Gap
      ticketDeliveredValue: toNumber(rowData.ticketDeliveredValue),
      ticketDeliveredBuyIn: toNumber(rowData.ticketDeliveredBuyIn),
      guaranteedGap: toNumber(rowData.guaranteedGap),
    };

    clubs.push(clubRow);
  }

  // Calculate totals
  const leagueSummary: ParsedLeagueSummary = {
    periodDate,
    periodUtcOffset,
    clubs,
    totalClubs: clubs.length,

    // Classifications totals
    totalClassificationPpsr: clubs.reduce((sum, c) => sum + c.classificationPpsr, 0),
    totalClassificationRingGame: clubs.reduce((sum, c) => sum + c.classificationRingGame, 0),
    totalClassificationRgCustom: clubs.reduce((sum, c) => sum + c.classificationRgCustom, 0),
    totalClassificationMtt: clubs.reduce((sum, c) => sum + c.classificationMtt, 0),

    // Player earnings totals
    totalPlayerEarningsGeneral: clubs.reduce((sum, c) => sum + c.playerEarningsGeneral, 0),
    totalPlayerEarningsRingGames: clubs.reduce((sum, c) => sum + c.playerEarningsRingGames, 0),
    totalPlayerEarningsMttSitNGo: clubs.reduce((sum, c) => sum + c.playerEarningsMttSitNGo, 0),
    totalPlayerEarningsSpinUp: clubs.reduce((sum, c) => sum + c.playerEarningsSpinUp, 0),
    totalPlayerEarningsCaribbeanPoker: clubs.reduce((sum, c) => sum + c.playerEarningsCaribbeanPoker, 0),
    totalPlayerEarningsColorGame: clubs.reduce((sum, c) => sum + c.playerEarningsColorGame, 0),
    totalPlayerEarningsCrash: clubs.reduce((sum, c) => sum + c.playerEarningsCrash, 0),
    totalPlayerEarningsLuckyDraw: clubs.reduce((sum, c) => sum + c.playerEarningsLuckyDraw, 0),
    totalPlayerEarningsJackpot: clubs.reduce((sum, c) => sum + c.playerEarningsJackpot, 0),
    totalPlayerEarningsSplitEv: clubs.reduce((sum, c) => sum + c.playerEarningsSplitEv, 0),

    // Ticket/Prize totals
    totalTicketValueWon: clubs.reduce((sum, c) => sum + c.ticketValueWon, 0),
    totalTicketBuyInPlayer: clubs.reduce((sum, c) => sum + c.ticketBuyInPlayer, 0),
    totalCustomPrizeValue: clubs.reduce((sum, c) => sum + c.customPrizeValue, 0),

    // Club earnings totals
    totalClubEarningsGeneral: clubs.reduce((sum, c) => sum + c.clubEarningsGeneral, 0),
    totalClubEarningsFee: clubs.reduce((sum, c) => sum + c.clubEarningsFee, 0),
    totalClubEarningsFeePpst: clubs.reduce((sum, c) => sum + c.clubEarningsFeePpst, 0),
    totalClubEarningsFeeNonPpst: clubs.reduce((sum, c) => sum + c.clubEarningsFeeNonPpst, 0),
    totalClubEarningsFeePpsr: clubs.reduce((sum, c) => sum + c.clubEarningsFeePpsr, 0),
    totalClubEarningsFeeNonPpsr: clubs.reduce((sum, c) => sum + c.clubEarningsFeeNonPpsr, 0),
    totalClubEarningsSpinUpBuyIn: clubs.reduce((sum, c) => sum + c.clubEarningsSpinUpBuyIn, 0),
    totalClubEarningsSpinUpPrize: clubs.reduce((sum, c) => sum + c.clubEarningsSpinUpPrize, 0),
    totalClubEarningsCaribbeanBets: clubs.reduce((sum, c) => sum + c.clubEarningsCaribbeanBets, 0),
    totalClubEarningsCaribbeanPrize: clubs.reduce((sum, c) => sum + c.clubEarningsCaribbeanPrize, 0),
    totalClubEarningsColorGameBets: clubs.reduce((sum, c) => sum + c.clubEarningsColorGameBets, 0),
    totalClubEarningsColorGamePrize: clubs.reduce((sum, c) => sum + c.clubEarningsColorGamePrize, 0),
    totalClubEarningsCrashBets: clubs.reduce((sum, c) => sum + c.clubEarningsCrashBets, 0),
    totalClubEarningsCrashPrize: clubs.reduce((sum, c) => sum + c.clubEarningsCrashPrize, 0),
    totalClubEarningsLuckyDrawBets: clubs.reduce((sum, c) => sum + c.clubEarningsLuckyDrawBets, 0),
    totalClubEarningsLuckyDrawPrize: clubs.reduce((sum, c) => sum + c.clubEarningsLuckyDrawPrize, 0),
    totalClubEarningsJackpotFee: clubs.reduce((sum, c) => sum + c.clubEarningsJackpotFee, 0),
    totalClubEarningsJackpotPrize: clubs.reduce((sum, c) => sum + c.clubEarningsJackpotPrize, 0),
    totalClubEarningsSplitEv: clubs.reduce((sum, c) => sum + c.clubEarningsSplitEv, 0),

    // Final totals
    totalTicketDeliveredValue: clubs.reduce((sum, c) => sum + c.ticketDeliveredValue, 0),
    totalTicketDeliveredBuyIn: clubs.reduce((sum, c) => sum + c.ticketDeliveredBuyIn, 0),
    totalGuaranteedGap: clubs.reduce((sum, c) => sum + c.guaranteedGap, 0),
  };

  return leagueSummary;
}

// DEBUG: Dump all columns from a sheet to understand structure
function debugSheetColumns(sheet: XLSX.Sheet, sheetName: string): void {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");

  console.log(`\n========== DEBUG: ${sheetName} ==========`);
  console.log(`Range: ${sheet["!ref"]}`);
  console.log(`Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`);

  // Column letter helper
  const colLetter = (idx: number): string => {
    let letter = '';
    while (idx >= 0) {
      letter = String.fromCharCode((idx % 26) + 65) + letter;
      idx = Math.floor(idx / 26) - 1;
    }
    return letter;
  };

  // Print first 5 rows to understand header structure
  console.log("\n--- HEADER ROWS (first 5) ---");
  for (let row = 0; row <= Math.min(4, range.e.r); row++) {
    const rowData: string[] = [];
    for (let col = 0; col <= Math.min(range.e.c, 50); col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      const val = cell?.v ?? cell?.w ?? "";
      rowData.push(`${colLetter(col)}=${String(val).substring(0, 25)}`);
    }
    console.log(`Row ${row}: [${rowData.join(" | ")}]`);
  }

  // Print first data row (row 5 or later)
  console.log("\n--- FIRST DATA ROW (row 5+) ---");
  for (let row = 4; row <= Math.min(range.e.r, 10); row++) {
    const rowData: string[] = [];
    let hasData = false;
    for (let col = 0; col <= Math.min(range.e.c, 50); col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      const val = cell?.v ?? cell?.w ?? "";
      if (val !== "" && val !== null) hasData = true;
      rowData.push(`${colLetter(col)}=${String(val).substring(0, 20)}`);
    }
    if (hasData) {
      console.log(`Row ${row}: [${rowData.join(" | ")}]`);
      break;
    }
  }

  // Print all column headers from row 3 (merged section headers) and row 4 (column names)
  console.log("\n--- COLUMN MAPPING (from rows 3-4) ---");
  for (let col = 0; col <= range.e.c; col++) {
    const cell3 = sheet[XLSX.utils.encode_cell({ r: 2, c: col })];
    const cell4 = sheet[XLSX.utils.encode_cell({ r: 3, c: col })];
    const header3 = cell3?.v ?? cell3?.w ?? "";
    const header4 = cell4?.v ?? cell4?.w ?? "";
    console.log(`Col ${colLetter(col)} (${col}): Section="${String(header3).substring(0, 30)}" | Header="${String(header4).substring(0, 30)}"`);
  }

  console.log(`\n========== END DEBUG: ${sheetName} ==========\n`);
}

// Parse "Detalhes de Clube" sheet
// Based on ParsedDetailed type - 137 columns from A to EG
// Uses merged cells in column A to identify clubs (same as Geral de Clube)
function parseDetalhesDeClubeSheet(sheet: XLSX.Sheet): ParsedDetailed[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const result: ParsedDetailed[] = [];

  // DEBUG: Show structure first
  debugSheetColumns(sheet, "Detalhes de Clube");

  // === DETECT CLUBS FROM MERGED CELLS IN COLUMN A ===
  type ClubRange = { startRow: number; endRow: number; clubName: string; clubId: string | null };
  const clubRanges: ClubRange[] = [];

  const merges = sheet["!merges"] || [];
  console.log("\n=== DEBUG Detalhes de Clube - Merged cells in column A ===");

  // Filter merges that are in column A (c: 0)
  const columnAMerges = merges.filter(m => m.s.c === 0 && m.e.c === 0);

  for (const merge of columnAMerges) {
    const startRow = merge.s.r;
    const endRow = merge.e.r;
    const cellAddress = XLSX.utils.encode_cell({ r: startRow, c: 0 });
    const cell = sheet[cellAddress];
    const rawValue = String(cell?.v ?? cell?.w ?? "").trim();

    // Extract club name and ID from format: "ClubName\n(ID)\nDate"
    // e.g., "C.P.C. OnLine\n(962181)\n2025/12/15"
    const lines = rawValue.split("\n").map(l => l.trim()).filter(l => l);
    let clubName = lines[0] || "";
    let clubId: string | null = null;

    // Look for ID in parentheses
    for (const line of lines) {
      const idMatch = line.match(/^\((\d+)\)$/);
      if (idMatch) {
        clubId = idMatch[1];
        break;
      }
    }

    // Skip the header row "Esta planilha é feita..."
    if (clubName.includes("planilha") || clubName.includes("PPPoker")) {
      continue;
    }

    if (clubName) {
      clubRanges.push({ startRow, endRow, clubName, clubId });
    }
  }

  console.log(`Found ${clubRanges.length} club ranges from merged cells`);
  clubRanges.slice(0, 10).forEach((club, i) => {
    console.log(`Club ${i + 1}: rows ${club.startRow}-${club.endRow}, name="${club.clubName.substring(0, 30)}", id="${club.clubId}"`);
  });
  if (clubRanges.length > 10) {
    console.log(`... and ${clubRanges.length - 10} more`);
  }
  console.log("=== END DEBUG ===\n");

  // Helper to find club for a given row
  const findClubForRow = (row: number): { clubId: string | null; clubName: string } | null => {
    for (const club of clubRanges) {
      if (row >= club.startRow && row <= club.endRow) {
        return { clubId: club.clubId, clubName: club.clubName };
      }
    }
    return null;
  };

  // Column mapping based on ParsedDetailed type (see types.ts)
  // The sheet has similar structure to Geral de Clube but with more detail by date
  const DETALHES_COLUMNS: Record<string, number> = {
    // Identificação do Jogador (A-I)
    date: 0,                    // A - Data
    ppPokerId: 1,               // B - ID do jogador
    country: 2,                 // C - País/região
    nickname: 3,                // D - Apelido
    memoName: 4,                // E - Nome de memorando
    agentNickname: 5,           // F - Agente
    agentPpPokerId: 6,          // G - ID do agente
    superAgentNickname: 7,      // H - Superagente
    superAgentPpPokerId: 8,     // I - ID do superagente

    // Ganhos NLHoldem (J-R)
    nlhRegular: 9,              // J - Regular
    nlhThreeOne: 10,            // K - 3-1
    nlhThreeOneF: 11,           // L - 3-1F
    nlhSixPlus: 12,             // M - 6+
    nlhAof: 13,                 // N - AOF
    nlhSitNGo: 14,              // O - SitNGo
    nlhSpinUp: 15,              // P - SPINUP
    nlhMtt: 16,                 // Q - MTT NLH
    nlhMttSixPlus: 17,          // R - MTT 6+

    // Ganhos PLO (S-AB)
    plo4: 18,                   // S - PLO4
    plo5: 19,                   // T - PLO5
    plo6: 20,                   // U - PLO6
    plo4Hilo: 21,               // V - PLO4 H/L
    plo5Hilo: 22,               // W - PLO5 H/L
    plo6Hilo: 23,               // X - PLO6 H/L
    ploSitNGo: 24,              // Y - SitNGo
    ploMttPlo4: 25,             // Z - MTT/PLO4
    ploMttPlo5: 26,             // AA - MTT/PLO5
    ploNlh: 27,                 // AB - NLHoldem

    // Ganhos do Jogador - FLASH e outros (AC-AV)
    flashPlo4: 28,              // AC - PLO4 (FLASH)
    flashPlo5: 29,              // AD - PLO5 (FLASH)
    mixedGame: 30,              // AE - MIXED GAME
    ofc: 31,                    // AF - OFC
    seka36: 32,                 // AG - 36 (SEKA)
    seka32: 33,                 // AH - 32 (SEKA)
    seka21: 34,                 // AI - 21 (SEKA)
    teenPattiRegular: 35,       // AJ - REGULAR (Teen Patti)
    teenPattiAk47: 36,          // AK - AK47 (Teen Patti)
    teenPattiHukam: 37,         // AL - HUKAM (Teen Patti)
    teenPattiMuflis: 38,        // AM - MUFLIS (Teen Patti)
    tongits: 39,                // AN - TONGITS
    pusoy: 40,                  // AO - PUSOY
    caribbean: 41,              // AP - Caribbean+ Poker
    colorGame: 42,              // AQ - COLOR GAME
    crash: 43,                  // AR - CRASH
    luckyDraw: 44,              // AS - LUCKY DRAW
    jackpot: 45,                // AT - Jackpot
    evSplitWinnings: 46,        // AU - Dividir EV
    totalWinnings: 47,          // AV - Total

    // Classificação (AW-AZ)
    classificationPpsr: 48,     // AW - Classificação PPSR
    classificationRing: 49,     // AX - Classificação Ring Game
    classificationCustomRing: 50, // AY - Classificação de RG Personalizado
    classificationMtt: 51,      // AZ - Classificação MTT

    // Valores Gerais (BA-BD)
    generalPlusEvents: 52,      // BA - Ganhos de jogador gerais + Eventos
    ticketValueWon: 53,         // BB - Valor do ticket ganho
    ticketBuyIn: 54,            // BC - Buy-in de ticket
    customPrizeValue: 55,       // BD - Valor do prêmio personalizado

    // Taxa NLHoldem (BE-BM)
    feeNlhRegular: 56,          // BE - Regular
    feeNlhThreeOne: 57,         // BF - 3-1
    feeNlhThreeOneF: 58,        // BG - 3-1F
    feeNlhSixPlus: 59,          // BH - 6+
    feeNlhAof: 60,              // BI - AOF
    feeNlhSitNGo: 61,           // BJ - SitNGo
    feeNlhSpinUp: 62,           // BK - SPINUP
    feeNlhMtt: 63,              // BL - MTT NLH
    feeNlhMttSixPlus: 64,       // BM - MTT 6+

    // Taxa PLO (BN-BU)
    feePlo4: 65,                // BN - PLO4
    feePlo5: 66,                // BO - PLO5
    feePlo4Hilo: 67,            // BP - PLO4 H/L
    feePlo5Hilo: 68,            // BQ - PLO5 H/L
    feePlo6Hilo: 69,            // BR - PLO6 H/L
    feePloSitNGo: 70,           // BS - SitNGo
    feePloMttPlo4: 71,          // BT - MTT/PLO4
    feePloMttPlo5: 72,          // BU - MTT/PLO5

    // Taxa FLASH e outros (BV-CJ)
    feeFlashNlh: 73,            // BV - NLHoldem (FLASH)
    feeFlashPlo4: 74,           // BW - PLO4 (FLASH)
    feeFlashPlo5: 75,           // BX - PLO5 (FLASH)
    feeMixedGame: 76,           // BY - MIXED GAME
    feeOfc: 77,                 // BZ - OFC
    feeSeka36: 78,              // CA - 36 (SEKA)
    feeSeka32: 79,              // CB - 32 (SEKA)
    feeSeka21: 80,              // CC - 21 (SEKA)
    feeTeenPattiRegular: 81,    // CD - REGULAR (Teen Patti)
    feeTeenPattiAk47: 82,       // CE - AK47 (Teen Patti)
    feeTeenPattiHukam: 83,      // CF - HUKAM (Teen Patti)
    feeTeenPattiMuflis: 84,     // CG - MUFLIS (Teen Patti)
    feeTongits: 85,             // CH - TONGITS
    feePusoy: 86,               // CI - PUSOY
    feeTotal: 87,               // CJ - Total

    // SPINUP (CK-CL)
    spinUpBuyIn: 88,            // CK - Buy-in
    spinUpPrize: 89,            // CL - Premiação

    // Jackpot (CM-CN)
    jackpotFee: 90,             // CM - Taxa
    jackpotPrize: 91,           // CN - Premiação

    // Dividir EV (CO-CQ)
    evSplitNlh: 92,             // CO - NLHoldem
    evSplitPlo: 93,             // CP - PLO
    evSplitTotal: 94,           // CQ - Total

    // Valor ticket entregue (CR)
    ticketDeliveredValue: 95,   // CR - Valor do ticket entregue

    // Fichas (CS-CY)
    chipTicketBuyIn: 96,        // CS - Buy-in de ticket
    chipSent: 97,               // CT - Enviado
    chipClassPpsr: 98,          // CU - Classificação PPSR
    chipClassRing: 99,          // CV - Classificação Ring Game
    chipClassCustomRing: 100,   // CW - Classificação de RG Personalizado
    chipClassMtt: 101,          // CX - Classificação MTT
    chipRedeemed: 102,          // CY - Resgatado

    // Dar Crédito (CZ-DC)
    creditLeftClub: 103,        // CZ - Saiu do clube
    creditSent: 104,            // DA - Enviado
    creditRedeemed: 105,        // DB - Resgatado
    creditLeftClub2: 106,       // DC - Saiu do clube

    // Mãos NLH (DD-DH)
    handsNlhRegular: 107,       // DD - Regular
    handsNlhThreeOne: 108,      // DE - 3-1
    handsNlhThreeOneF: 109,     // DF - 3-1F
    handsNlhSixPlus: 110,       // DG - 6+
    handsNlhAof: 111,           // DH - AOF

    // Mãos PLO (DI-DN)
    handsPlo4: 112,             // DI - PLO4
    handsPlo5: 113,             // DJ - PLO5
    handsPlo6: 114,             // DK - PLO6
    handsPlo4Hilo: 115,         // DL - PLO4 H/L
    handsPlo5Hilo: 116,         // DM - PLO5 H/L
    handsPlo6Hilo: 117,         // DN - PLO6 H/L

    // Mãos FLASH (DO-DQ)
    handsFlashNlh: 118,         // DO - NLHoldem (FLASH)
    handsFlashPlo4: 119,        // DP - PLO4 (FLASH)
    handsFlashPlo5: 120,        // DQ - PLO5 (FLASH)

    // Mãos outros (DR-EG)
    handsMixedGame: 121,        // DR - MIXED GAME
    handsOfc: 122,              // DS - OFC
    handsSeka36: 123,           // DT - 36 (SEKA)
    handsSeka32: 124,           // DU - 32 (SEKA)
    handsSeka21: 125,           // DV - 21 (SEKA)
    handsTeenPattiRegular: 126, // DW - REGULAR (Teen Patti)
    handsTeenPattiAk47: 127,    // DX - AK47 (Teen Patti)
    handsTeenPattiHukam: 128,   // DY - HUKAM (Teen Patti)
    handsTeenPattiMuflis: 129,  // DZ - MUFLIS (Teen Patti)
    handsTongits: 130,          // EA - TONGITS
    handsPusoy: 131,            // EB - PUSOY
    handsCaribbean: 132,        // EC - Caribbean+ Poker
    handsColorGame: 133,        // ED - COLOR GAME
    handsCrash: 134,            // EE - CRASH
    handsLuckyDraw: 135,        // EF - LUCKY DRAW
    handsTotal: 136,            // EG - Total
  };

  // Start from row 4 (after headers)
  const dataStartRow = 4;

  for (let row = dataStartRow; row <= range.e.r; row++) {
    const rowData: Record<string, any> = {};
    let hasValidId = false;

    for (const [field, colIdx] of Object.entries(DETALHES_COLUMNS)) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIdx });
      const cell = sheet[cellAddress];

      let value = null;
      if (cell) {
        // First try to get the actual value
        if (cell.v !== undefined && cell.v !== null) {
          value = cell.v;
        }

        // If cell has formula and value is missing or 0, try to calculate or use formatted value
        if (cell.f && (value === null || value === undefined || value === 0)) {
          // Try calculating the formula
          const calculated = calculateFormula(sheet, cell.f, new Set());
          if (calculated !== null && calculated !== undefined && calculated !== 0) {
            value = calculated;
          }
        }

        // Fallback to formatted value (cell.w) if we still don't have a value
        if ((value === null || value === undefined || value === 0) && cell.w !== undefined && cell.w !== null && cell.w !== "") {
          const trimmed = String(cell.w).trim().replace(/,/g, ".").replace(/[^\d.-]/g, "");
          const parsed = parseFloat(trimmed);
          if (!isNaN(parsed)) {
            value = parsed;
          } else if (value === null || value === undefined) {
            value = cell.w;
          }
        }
      }

      if (value === "None" || value === "none") value = null;
      if (typeof value === "string") value = value.trim();

      rowData[field] = value;

      if (field === "ppPokerId" && value && !isNaN(Number(value))) {
        hasValidId = true;
      }
    }

    // Skip rows without valid player ID or "Total" rows
    const nicknameValue = String(rowData.nickname || "").toLowerCase();
    if (!hasValidId || nicknameValue === "total" || nicknameValue === "totais") continue;

    // Find which club this row belongs to
    const clubContext = findClubForRow(row);

    // Calculate generalPlusEvents if it's 0 (formula not calculated)
    // Formula is SUM(J:AU) which is all game winnings
    if (toNumber(rowData.generalPlusEvents) === 0) {
      const gameWinningsSum =
        toNumber(rowData.nlhRegular) +
        toNumber(rowData.nlhThreeOne) +
        toNumber(rowData.nlhThreeOneF) +
        toNumber(rowData.nlhSixPlus) +
        toNumber(rowData.nlhAof) +
        toNumber(rowData.nlhSitNGo) +
        toNumber(rowData.nlhSpinUp) +
        toNumber(rowData.nlhMtt) +
        toNumber(rowData.nlhMttSixPlus) +
        toNumber(rowData.plo4) +
        toNumber(rowData.plo5) +
        toNumber(rowData.plo6) +
        toNumber(rowData.plo4Hilo) +
        toNumber(rowData.plo5Hilo) +
        toNumber(rowData.plo6Hilo) +
        toNumber(rowData.ploSitNGo) +
        toNumber(rowData.ploMttPlo4) +
        toNumber(rowData.ploMttPlo5) +
        toNumber(rowData.ploNlh) +
        toNumber(rowData.flashPlo4) +
        toNumber(rowData.flashPlo5) +
        toNumber(rowData.mixedGame) +
        toNumber(rowData.ofc) +
        toNumber(rowData.seka36) +
        toNumber(rowData.seka32) +
        toNumber(rowData.seka21) +
        toNumber(rowData.teenPattiRegular) +
        toNumber(rowData.teenPattiAk47) +
        toNumber(rowData.teenPattiHukam) +
        toNumber(rowData.teenPattiMuflis) +
        toNumber(rowData.tongits) +
        toNumber(rowData.pusoy) +
        toNumber(rowData.caribbean) +
        toNumber(rowData.colorGame) +
        toNumber(rowData.crash) +
        toNumber(rowData.luckyDraw) +
        toNumber(rowData.jackpot) +
        toNumber(rowData.evSplitWinnings);
      rowData.generalPlusEvents = gameWinningsSum;
    }

    // Build ParsedDetailed object
    const detailed: ParsedDetailed = {
      // Club context from merged cells
      clubId: clubContext?.clubId || null,
      clubName: clubContext?.clubName || null,

      date: rowData.date ? String(rowData.date) : null,
      ppPokerId: String(rowData.ppPokerId || ""),
      country: rowData.country || null,
      nickname: rowData.nickname || "",
      memoName: rowData.memoName || null,
      agentNickname: rowData.agentNickname || null,
      agentPpPokerId: rowData.agentPpPokerId ? String(rowData.agentPpPokerId) : null,
      superAgentNickname: rowData.superAgentNickname || null,
      superAgentPpPokerId: rowData.superAgentPpPokerId ? String(rowData.superAgentPpPokerId) : null,

      // NLH winnings
      nlhRegular: toNumber(rowData.nlhRegular),
      nlhThreeOne: toNumber(rowData.nlhThreeOne),
      nlhThreeOneF: toNumber(rowData.nlhThreeOneF),
      nlhSixPlus: toNumber(rowData.nlhSixPlus),
      nlhAof: toNumber(rowData.nlhAof),
      nlhSitNGo: toNumber(rowData.nlhSitNGo),
      nlhSpinUp: toNumber(rowData.nlhSpinUp),
      nlhMtt: toNumber(rowData.nlhMtt),
      nlhMttSixPlus: toNumber(rowData.nlhMttSixPlus),

      // PLO winnings
      plo4: toNumber(rowData.plo4),
      plo5: toNumber(rowData.plo5),
      plo6: toNumber(rowData.plo6),
      plo4Hilo: toNumber(rowData.plo4Hilo),
      plo5Hilo: toNumber(rowData.plo5Hilo),
      plo6Hilo: toNumber(rowData.plo6Hilo),
      ploSitNGo: toNumber(rowData.ploSitNGo),
      ploMttPlo4: toNumber(rowData.ploMttPlo4),
      ploMttPlo5: toNumber(rowData.ploMttPlo5),
      ploNlh: toNumber(rowData.ploNlh),

      // FLASH and others
      flashPlo4: toNumber(rowData.flashPlo4),
      flashPlo5: toNumber(rowData.flashPlo5),
      mixedGame: toNumber(rowData.mixedGame),
      ofc: toNumber(rowData.ofc),
      seka36: toNumber(rowData.seka36),
      seka32: toNumber(rowData.seka32),
      seka21: toNumber(rowData.seka21),
      teenPattiRegular: toNumber(rowData.teenPattiRegular),
      teenPattiAk47: toNumber(rowData.teenPattiAk47),
      teenPattiHukam: toNumber(rowData.teenPattiHukam),
      teenPattiMuflis: toNumber(rowData.teenPattiMuflis),
      tongits: toNumber(rowData.tongits),
      pusoy: toNumber(rowData.pusoy),
      caribbean: toNumber(rowData.caribbean),
      colorGame: toNumber(rowData.colorGame),
      crash: toNumber(rowData.crash),
      luckyDraw: toNumber(rowData.luckyDraw),
      jackpot: toNumber(rowData.jackpot),
      evSplitWinnings: toNumber(rowData.evSplitWinnings),
      totalWinnings: toNumber(rowData.totalWinnings),

      // Classifications
      classificationPpsr: toNumber(rowData.classificationPpsr),
      classificationRing: toNumber(rowData.classificationRing),
      classificationCustomRing: toNumber(rowData.classificationCustomRing),
      classificationMtt: toNumber(rowData.classificationMtt),

      // General values
      generalPlusEvents: toNumber(rowData.generalPlusEvents),
      ticketValueWon: toNumber(rowData.ticketValueWon),
      ticketBuyIn: toNumber(rowData.ticketBuyIn),
      customPrizeValue: toNumber(rowData.customPrizeValue),

      // NLH fees
      feeNlhRegular: toNumber(rowData.feeNlhRegular),
      feeNlhThreeOne: toNumber(rowData.feeNlhThreeOne),
      feeNlhThreeOneF: toNumber(rowData.feeNlhThreeOneF),
      feeNlhSixPlus: toNumber(rowData.feeNlhSixPlus),
      feeNlhAof: toNumber(rowData.feeNlhAof),
      feeNlhSitNGo: toNumber(rowData.feeNlhSitNGo),
      feeNlhSpinUp: toNumber(rowData.feeNlhSpinUp),
      feeNlhMtt: toNumber(rowData.feeNlhMtt),
      feeNlhMttSixPlus: toNumber(rowData.feeNlhMttSixPlus),

      // PLO fees
      feePlo4: toNumber(rowData.feePlo4),
      feePlo5: toNumber(rowData.feePlo5),
      feePlo4Hilo: toNumber(rowData.feePlo4Hilo),
      feePlo5Hilo: toNumber(rowData.feePlo5Hilo),
      feePlo6Hilo: toNumber(rowData.feePlo6Hilo),
      feePloSitNGo: toNumber(rowData.feePloSitNGo),
      feePloMttPlo4: toNumber(rowData.feePloMttPlo4),
      feePloMttPlo5: toNumber(rowData.feePloMttPlo5),

      // FLASH and other fees
      feeFlashNlh: toNumber(rowData.feeFlashNlh),
      feeFlashPlo4: toNumber(rowData.feeFlashPlo4),
      feeFlashPlo5: toNumber(rowData.feeFlashPlo5),
      feeMixedGame: toNumber(rowData.feeMixedGame),
      feeOfc: toNumber(rowData.feeOfc),
      feeSeka36: toNumber(rowData.feeSeka36),
      feeSeka32: toNumber(rowData.feeSeka32),
      feeSeka21: toNumber(rowData.feeSeka21),
      feeTeenPattiRegular: toNumber(rowData.feeTeenPattiRegular),
      feeTeenPattiAk47: toNumber(rowData.feeTeenPattiAk47),
      feeTeenPattiHukam: toNumber(rowData.feeTeenPattiHukam),
      feeTeenPattiMuflis: toNumber(rowData.feeTeenPattiMuflis),
      feeTongits: toNumber(rowData.feeTongits),
      feePusoy: toNumber(rowData.feePusoy),
      feeTotal: toNumber(rowData.feeTotal),

      // SPINUP
      spinUpBuyIn: toNumber(rowData.spinUpBuyIn),
      spinUpPrize: toNumber(rowData.spinUpPrize),

      // Jackpot
      jackpotFee: toNumber(rowData.jackpotFee),
      jackpotPrize: toNumber(rowData.jackpotPrize),

      // EV Split
      evSplitNlh: toNumber(rowData.evSplitNlh),
      evSplitPlo: toNumber(rowData.evSplitPlo),
      evSplitTotal: toNumber(rowData.evSplitTotal),

      // Ticket delivered
      ticketDeliveredValue: toNumber(rowData.ticketDeliveredValue),

      // Chips
      chipTicketBuyIn: toNumber(rowData.chipTicketBuyIn),
      chipSent: toNumber(rowData.chipSent),
      chipClassPpsr: toNumber(rowData.chipClassPpsr),
      chipClassRing: toNumber(rowData.chipClassRing),
      chipClassCustomRing: toNumber(rowData.chipClassCustomRing),
      chipClassMtt: toNumber(rowData.chipClassMtt),
      chipRedeemed: toNumber(rowData.chipRedeemed),

      // Credit
      creditLeftClub: toNumber(rowData.creditLeftClub),
      creditSent: toNumber(rowData.creditSent),
      creditRedeemed: toNumber(rowData.creditRedeemed),
      creditLeftClub2: toNumber(rowData.creditLeftClub2),

      // NLH hands
      handsNlhRegular: toNumber(rowData.handsNlhRegular),
      handsNlhThreeOne: toNumber(rowData.handsNlhThreeOne),
      handsNlhThreeOneF: toNumber(rowData.handsNlhThreeOneF),
      handsNlhSixPlus: toNumber(rowData.handsNlhSixPlus),
      handsNlhAof: toNumber(rowData.handsNlhAof),

      // PLO hands
      handsPlo4: toNumber(rowData.handsPlo4),
      handsPlo5: toNumber(rowData.handsPlo5),
      handsPlo6: toNumber(rowData.handsPlo6),
      handsPlo4Hilo: toNumber(rowData.handsPlo4Hilo),
      handsPlo5Hilo: toNumber(rowData.handsPlo5Hilo),
      handsPlo6Hilo: toNumber(rowData.handsPlo6Hilo),

      // FLASH hands
      handsFlashNlh: toNumber(rowData.handsFlashNlh),
      handsFlashPlo4: toNumber(rowData.handsFlashPlo4),
      handsFlashPlo5: toNumber(rowData.handsFlashPlo5),

      // Other hands
      handsMixedGame: toNumber(rowData.handsMixedGame),
      handsOfc: toNumber(rowData.handsOfc),
      handsSeka36: toNumber(rowData.handsSeka36),
      handsSeka32: toNumber(rowData.handsSeka32),
      handsSeka21: toNumber(rowData.handsSeka21),
      handsTeenPattiRegular: toNumber(rowData.handsTeenPattiRegular),
      handsTeenPattiAk47: toNumber(rowData.handsTeenPattiAk47),
      handsTeenPattiHukam: toNumber(rowData.handsTeenPattiHukam),
      handsTeenPattiMuflis: toNumber(rowData.handsTeenPattiMuflis),
      handsTongits: toNumber(rowData.handsTongits),
      handsPusoy: toNumber(rowData.handsPusoy),
      handsCaribbean: toNumber(rowData.handsCaribbean),
      handsColorGame: toNumber(rowData.handsColorGame),
      handsCrash: toNumber(rowData.handsCrash),
      handsLuckyDraw: toNumber(rowData.handsLuckyDraw),
      handsTotal: toNumber(rowData.handsTotal),
    };

    result.push(detailed);
  }

  console.log(`\n========== PARSED DETALHES DE CLUBE ==========`);
  console.log(`Total records: ${result.length}`);
  console.log(`Total clubs found: ${clubRanges.length}`);

  // Group records by club
  const recordsByClub: Record<string, number> = {};
  for (const record of result) {
    const key = record.clubName || "Unknown";
    recordsByClub[key] = (recordsByClub[key] || 0) + 1;
  }
  console.log(`Records by club:`);
  Object.entries(recordsByClub).forEach(([club, count]) => {
    console.log(`  - ${club}: ${count} records`);
  });

  if (result.length > 0) {
    console.log(`First record:`, JSON.stringify(result[0], null, 2));
  }
  console.log(`========== END PARSED ==========\n`);

  return result;
}

// Parse "Partidas" sheet - sessions/games for league
// Structure is similar to "Jogos PPST" with game headers and player rows
function parsePartidasSheet(sheet: XLSX.Sheet): ParsedSession[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const result: ParsedSession[] = [];

  // DEBUG: Show structure first
  debugSheetColumns(sheet, "Partidas");

  // Column letter helper
  const colLetter = (idx: number): string => {
    let letter = '';
    let i = idx;
    while (i >= 0) {
      letter = String.fromCharCode((i % 26) + 65) + letter;
      i = Math.floor(i / 26) - 1;
    }
    return letter;
  };

  // ============ DEBUG: MAP ALL GAME TYPES AND THEIR COLUMN STRUCTURES ============
  interface GameTypeDebugInfo {
    gameType: string;
    category: "PPST" | "PPSR" | "UNKNOWN";
    subType: string;
    headerRow: number;
    headerColumns: { col: string; value: string }[];
    firstDataRow: number;
    firstDataColumns: { col: string; value: string }[];
    gameInfoString: string;
    sampleGameIds: string[];
    count: number;
  }

  const gameTypeMap = new Map<string, GameTypeDebugInfo>();

  // First pass: collect all game types and their structures
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║       DEBUG: MAPEAMENTO DE TIPOS DE JOGOS E COLUNAS          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  for (let row = 0; row <= range.e.r; row++) {
    const cellB = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
    const valB = String(cellB?.v ?? cellB?.w ?? "").trim();

    // Check if this is a game ID row
    const gameIdMatch = valB.match(/ID do jogo:\s*(\d+-\d+)/i);
    if (!gameIdMatch) continue;

    const gameId = gameIdMatch[1];

    // Get game info from next row
    const nextRowB = sheet[XLSX.utils.encode_cell({ r: row + 1, c: 1 })];
    const gameInfoStr = String(nextRowB?.v ?? nextRowB?.w ?? "").trim();

    // Extract game type (PPST/NLH, PPSR/PLO5, etc.)
    const typeMatch = gameInfoStr.match(/(PPST|PPSR)\/([\w\d&+]+)/i);
    const fullType = typeMatch ? `${typeMatch[1]}/${typeMatch[2]}` : gameInfoStr.substring(0, 30);
    const category = typeMatch ? (typeMatch[1].toUpperCase() as "PPST" | "PPSR") : "UNKNOWN";
    const subType = typeMatch ? typeMatch[2].toUpperCase() : "UNKNOWN";

    // Get header row (row + 2)
    const headerRowIdx = row + 2;
    const headerColumns: { col: string; value: string }[] = [];
    for (let col = 0; col <= Math.min(range.e.c, 20); col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: headerRowIdx, c: col })];
      const val = String(cell?.v ?? cell?.w ?? "").trim();
      if (val) {
        headerColumns.push({ col: colLetter(col), value: val });
      }
    }

    // Get first data row (row + 3)
    const firstDataRowIdx = row + 3;
    const firstDataColumns: { col: string; value: string }[] = [];
    for (let col = 0; col <= Math.min(range.e.c, 20); col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: firstDataRowIdx, c: col })];
      const val = cell?.v ?? cell?.w ?? "";
      if (val !== "" && val !== null) {
        firstDataColumns.push({ col: colLetter(col), value: String(val).substring(0, 20) });
      }
    }

    // Store or update game type info
    const key = fullType;
    if (!gameTypeMap.has(key)) {
      gameTypeMap.set(key, {
        gameType: fullType,
        category,
        subType,
        headerRow: headerRowIdx,
        headerColumns,
        firstDataRow: firstDataRowIdx,
        firstDataColumns,
        gameInfoString: gameInfoStr,
        sampleGameIds: [gameId],
        count: 1,
      });
    } else {
      const existing = gameTypeMap.get(key)!;
      existing.count++;
      if (existing.sampleGameIds.length < 3) {
        existing.sampleGameIds.push(gameId);
      }
    }
  }

  // Print debug output for each game type
  console.log(`\n📊 ENCONTRADOS ${gameTypeMap.size} TIPOS DE JOGOS ÚNICOS:\n`);

  // Group by category
  const ppstTypes: GameTypeDebugInfo[] = [];
  const ppsrTypes: GameTypeDebugInfo[] = [];
  const unknownTypes: GameTypeDebugInfo[] = [];

  gameTypeMap.forEach((info) => {
    if (info.category === "PPST") ppstTypes.push(info);
    else if (info.category === "PPSR") ppsrTypes.push(info);
    else unknownTypes.push(info);
  });

  const printGameTypeInfo = (info: GameTypeDebugInfo, index: number) => {
    console.log(`\n┌─────────────────────────────────────────────────────────────────┐`);
    console.log(`│ ${index}. ${info.gameType.padEnd(20)} │ ${info.category}/${info.subType.padEnd(10)} │ ${info.count} jogos`);
    console.log(`├─────────────────────────────────────────────────────────────────┤`);
    console.log(`│ Game Info: ${info.gameInfoString.substring(0, 55)}`);
    console.log(`│ IDs: ${info.sampleGameIds.join(", ")}`);
    console.log(`├─────────────────────────────────────────────────────────────────┤`);
    console.log(`│ HEADER ROW (Row ${info.headerRow}):`);
    console.log(`│   ${info.headerColumns.map(c => `[${c.col}]=${c.value}`).join(" | ")}`);
    console.log(`├─────────────────────────────────────────────────────────────────┤`);
    console.log(`│ FIRST DATA ROW (Row ${info.firstDataRow}):`);
    console.log(`│   ${info.firstDataColumns.map(c => `[${c.col}]=${c.value}`).join(" | ")}`);
    console.log(`└─────────────────────────────────────────────────────────────────┘`);
  };

  if (ppstTypes.length > 0) {
    console.log("\n\n════════════════════ PPST (Torneios) ════════════════════");
    ppstTypes.forEach((info, idx) => printGameTypeInfo(info, idx + 1));
  }

  if (ppsrTypes.length > 0) {
    console.log("\n\n════════════════════ PPSR (Cash Games) ════════════════════");
    ppsrTypes.forEach((info, idx) => printGameTypeInfo(info, idx + 1));
  }

  if (unknownTypes.length > 0) {
    console.log("\n\n════════════════════ UNKNOWN TYPES ════════════════════");
    unknownTypes.forEach((info, idx) => printGameTypeInfo(info, idx + 1));
  }

  // Print column comparison
  console.log("\n\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║              COMPARAÇÃO DE COLUNAS POR TIPO                     ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  const allHeaders = new Map<string, Set<string>>();
  gameTypeMap.forEach((info, type) => {
    info.headerColumns.forEach(({ col, value }) => {
      if (!allHeaders.has(col)) {
        allHeaders.set(col, new Set());
      }
      allHeaders.get(col)!.add(`${value} (${type})`);
    });
  });

  console.log("\nColunas com variação por tipo de jogo:");
  allHeaders.forEach((values, col) => {
    if (values.size > 1) {
      console.log(`\n  Coluna ${col}:`);
      values.forEach(v => console.log(`    - ${v}`));
    }
  });

  console.log("\n════════════════════ FIM DO DEBUG ════════════════════\n");
  // ============ END DEBUG ============

  // Track current session context
  let currentSession: ParsedSession | null = null;
  let currentPlayers: ParsedSession["players"] = [];
  let currentGameCategory: "PPST_MTT" | "PPST_SPINUP" | "PPST_PKO" | "PPSR" | "MTT_OTHER" = "PPST_MTT";

  // ============ DYNAMIC COLUMN MAPPING BY GAME TYPE ============
  // Based on debug output, columns B-F are fixed, G+ vary by type:
  //
  // PPST/NLH (MTT standard):
  //   G=Ranking, H=Buy-in de fichas, I=Buy-in de ticket, J=Ganhos, K=Taxa, L=Gap garantido
  //
  // PPST/SPINUP:
  //   G=Ranking, H=Buy-in de fichas, I=Prêmio (prize), J=Ganhos (NO K, L!)
  //
  // PPST/PLO5 PKO (Bounty):
  //   G=Ranking, H=Buy-in de fichas, I=Buy-in de ticket, J=Ganhos, K=De recompensa (bounty), L=Taxa, M=Gap garantido
  //
  // MTT/6+ (Short Deck):
  //   Same as PPST/NLH
  //
  // PPSR (All Cash Games):
  //   G=Buy-in de fichas, H=Mãos (hands), I=Ganhos do jogador (with sub-headers in row+1)
  //   Sub-headers: I=Geral, J=De adversários, K=De Jackpot, L=De Dividir EV
  //   M=Ganhos do clube, N=Taxa, O=Taxa do Jackpot, P=Prêmios Jackpot, Q=Dividir EV

  // Fixed columns (same for all types)
  const COL_CLUB_ID = 1;      // B
  const COL_CLUB_NAME = 2;    // C
  const COL_PLAYER_ID = 3;    // D
  const COL_NICKNAME = 4;     // E
  const COL_MEMO_NAME = 5;    // F

  // Dynamic column configs per game category
  interface ColumnConfig {
    ranking?: number;
    buyInChips: number;
    buyInTicket?: number;
    prize?: number;         // SPINUP: Prêmio
    winnings: number;
    bounty?: number;        // PKO: De recompensa
    rake?: number;
    gap?: number;
    hands?: number;         // PPSR: Mãos
    // PPSR sub-columns
    winningsFromOpponents?: number;
    winningsFromJackpot?: number;
    winningsFromEvSplit?: number;
    clubWinnings?: number;
    clubRake?: number;
    jackpotRake?: number;
    jackpotPrize?: number;
    evSplit?: number;
  }

  const COLUMN_CONFIGS: Record<string, ColumnConfig> = {
    // PPST/NLH and MTT/6+ (standard MTT)
    PPST_MTT: {
      ranking: 6,       // G
      buyInChips: 7,    // H
      buyInTicket: 8,   // I
      winnings: 9,      // J
      rake: 10,         // K
      gap: 11,          // L
    },
    // MTT/6+ (Short Deck) - same as PPST_MTT
    MTT_OTHER: {
      ranking: 6,       // G
      buyInChips: 7,    // H
      buyInTicket: 8,   // I
      winnings: 9,      // J
      rake: 10,         // K
      gap: 11,          // L
    },
    // PPST/SPINUP
    PPST_SPINUP: {
      ranking: 6,       // G
      buyInChips: 7,    // H
      prize: 8,         // I = Prêmio (NOT buy-in ticket!)
      winnings: 9,      // J
      // NO rake (K) or gap (L)
    },
    // PPST/PLO5 PKO (Bounty tournaments)
    PPST_PKO: {
      ranking: 6,       // G
      buyInChips: 7,    // H
      buyInTicket: 8,   // I
      winnings: 9,      // J
      bounty: 10,       // K = De recompensa
      rake: 11,         // L
      gap: 12,          // M
    },
    // PPSR (All cash games)
    PPSR: {
      buyInChips: 6,    // G (NO ranking for cash!)
      hands: 7,         // H = Mãos
      winnings: 8,      // I = Ganhos do jogador (Geral) - first data row after sub-header
      winningsFromOpponents: 9,   // J
      winningsFromJackpot: 10,    // K
      winningsFromEvSplit: 11,    // L
      clubWinnings: 12,           // M
      clubRake: 13,               // N
      jackpotRake: 14,            // O
      jackpotPrize: 15,           // P
      evSplit: 16,                // Q
    },
  };

  // Track category counts for debug
  const categoryCounts: Record<string, number> = {
    PPST_MTT: 0,
    PPST_SPINUP: 0,
    PPST_PKO: 0,
    PPSR: 0,
    MTT_OTHER: 0,
  };

  // Helper to determine game category from gameVariant string
  function getGameCategory(gameVariant: string, gameInfoStr: string): "PPST_MTT" | "PPST_SPINUP" | "PPST_PKO" | "PPSR" | "MTT_OTHER" {
    const upperVariant = gameVariant.toUpperCase();
    const upperInfo = gameInfoStr.toUpperCase();

    // PPSR = Cash game
    if (upperVariant.includes("PPSR")) {
      return "PPSR";
    }

    // PPST types
    if (upperVariant.includes("SPINUP") || upperVariant.includes("SPIN")) {
      return "PPST_SPINUP";
    }

    // PKO (Bounty) detection - check game info string for PKO keyword
    if (upperInfo.includes("PKO") || upperInfo.includes("BOUNTY") || upperInfo.includes("RECOMPENSA")) {
      return "PPST_PKO";
    }

    // MTT/6+ and other MTT formats
    if (upperVariant.includes("MTT") || upperVariant.includes("PPST")) {
      return "PPST_MTT";
    }

    // Fallback for MTT/6+ which doesn't have PPST prefix
    if (upperInfo.includes("MTT") || upperInfo.includes("BUY-IN")) {
      return "MTT_OTHER";
    }

    return "PPST_MTT"; // Default
  }

  // Scan rows looking for session headers and player data
  for (let row = 0; row <= range.e.r; row++) {
    // Get key cells for this row
    const cellB = sheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
    const cellG = sheet[XLSX.utils.encode_cell({ r: row, c: 6 })];
    const cellD = sheet[XLSX.utils.encode_cell({ r: row, c: 3 })];

    const valB = String(cellB?.v ?? cellB?.w ?? "").trim();
    const valG = String(cellG?.v ?? cellG?.w ?? "").trim();
    const valD = String(cellD?.v ?? cellD?.w ?? "").trim();

    // Check if this is a game ID row: "ID do jogo: XXXXXX-XXXXXX"
    const gameIdMatch = valB.match(/ID do jogo:\s*(\d+-\d+)/i);
    const isGameIdRow = gameIdMatch !== null;

    // Check for "Total" row (in column G for PPST, could be elsewhere for PPSR)
    const isTotalRow = valG.toLowerCase() === "total";

    // Skip header rows
    if (valB === "ID de clube" || valD === "ID do jogador") {
      continue;
    }

    // If we find a new game ID, save previous session and start new one
    if (isGameIdRow) {
      // Save previous session if exists
      if (currentSession && currentPlayers.length > 0) {
        currentSession.players = currentPlayers;
        currentSession.playerCount = currentPlayers.length;
        currentSession.totalBuyIn = currentPlayers.reduce((sum, p) => sum + (p.buyInChips ?? p.buyIn ?? 0), 0);
        currentSession.totalWinnings = currentPlayers.reduce((sum, p) => sum + (p.winnings ?? 0), 0);
        currentSession.totalRake = currentPlayers.reduce((sum, p) => sum + (p.rake ?? 0), 0);
        result.push(currentSession);
      }

      // Extract game ID
      const gameId = gameIdMatch![1];

      // Look at next row for game type info
      const nextRowB = sheet[XLSX.utils.encode_cell({ r: row + 1, c: 1 })];
      const gameInfoStr = String(nextRowB?.v ?? nextRowB?.w ?? "").trim();

      // Parse game info: "PPST/NLH   Buy-in: 9+1   Premiação Garantida: 1000"
      let gameType = "";
      let buyInAmount: number | null = null;
      let guaranteedPrize: number | null = null;

      // Extract game type (PPST/NLH, PPSR/PLO5, MTT/6+, etc.)
      const typeMatch = gameInfoStr.match(/(PPST|PPSR|MTT)\/([\w\d+]+)/i);
      if (typeMatch) {
        gameType = `${typeMatch[1]}/${typeMatch[2]}`;
      } else {
        // Fallback: try to extract just the type portion
        const fallbackMatch = gameInfoStr.match(/^([\w\d\/+]+)\s/);
        if (fallbackMatch) {
          gameType = fallbackMatch[1];
        }
      }

      // Extract buy-in (handles both "9+1" and just "15" formats)
      const buyInMatch = gameInfoStr.match(/Buy-in:\s*([\d.]+)(?:\s*\+\s*([\d.]+))?/i);
      if (buyInMatch) {
        buyInAmount = parseFloat(buyInMatch[1]) + (buyInMatch[2] ? parseFloat(buyInMatch[2]) : 0);
      }

      // Extract guaranteed prize
      const prizeMatch = gameInfoStr.match(/Premiação Garantida:\s*([\d.]+)/i);
      if (prizeMatch) {
        guaranteedPrize = parseFloat(prizeMatch[1]);
      }

      // Extract blinds for cash games (e.g., "0.5/1")
      let blinds: string | null = null;
      const blindsMatch = gameInfoStr.match(/\s+([\d.]+)\/([\d.]+)\s+/);
      if (blindsMatch) {
        blinds = `${blindsMatch[1]}/${blindsMatch[2]}`;
      }

      // Determine game category for column mapping
      currentGameCategory = getGameCategory(gameType, gameInfoStr);
      categoryCounts[currentGameCategory]++;

      // Determine session type
      let sessionType = "mtt";
      if (currentGameCategory === "PPST_SPINUP") {
        sessionType = "spin";
      } else if (currentGameCategory === "PPSR") {
        sessionType = "cash_game";
      } else if (currentGameCategory === "PPST_PKO") {
        sessionType = "mtt"; // PKO is still MTT
      }

      currentSession = {
        externalId: gameId,
        tableName: null,
        sessionType,
        gameVariant: gameType,
        startedAt: "",
        endedAt: null,
        blinds,
        buyInAmount,
        guaranteedPrize,
        createdByNickname: null,
        createdByPpPokerId: null,
      };
      currentPlayers = [];
      continue;
    }

    // Check for player data row (column D has numeric player ID)
    if (currentSession && !isTotalRow && /^\d+$/.test(valD) && valD.length > 4) {
      const getNumericValue = (colIdx: number | undefined): number => {
        if (colIdx === undefined) return 0;
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: colIdx })];
        if (!cell) return 0;
        let val = cell.v ?? 0;
        if (cell.f && (val === 0 || val === null || val === undefined)) {
          val = calculateFormula(sheet, cell.f, new Set()) || 0;
        }
        return typeof val === "number" ? val : parseFloat(String(val).replace(",", ".")) || 0;
      };

      const getStringValue = (colIdx: number): string => {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: colIdx })];
        return String(cell?.v ?? cell?.w ?? "").trim();
      };

      // Get column config for current game category
      const colConfig = COLUMN_CONFIGS[currentGameCategory] || COLUMN_CONFIGS.PPST_MTT;

      // Build player object with dynamic columns
      const player: NonNullable<ParsedSession["players"]>[number] & {
        clubId?: string;
        clubName?: string;
        prize?: number;
        bounty?: number;
        hands?: number;
      } = {
        ppPokerId: valD,
        nickname: getStringValue(COL_NICKNAME),
        memoName: getStringValue(COL_MEMO_NAME) || null,
        ranking: getNumericValue(colConfig.ranking),
        buyInChips: getNumericValue(colConfig.buyInChips),
        buyInTicket: getNumericValue(colConfig.buyInTicket),
        winnings: getNumericValue(colConfig.winnings),
        rake: getNumericValue(colConfig.rake),
        clubId: getStringValue(COL_CLUB_ID) || undefined,
        clubName: getStringValue(COL_CLUB_NAME) || undefined,
      };

      // Add type-specific fields
      if (currentGameCategory === "PPST_SPINUP" && colConfig.prize !== undefined) {
        player.prize = getNumericValue(colConfig.prize);
      }
      if (currentGameCategory === "PPST_PKO" && colConfig.bounty !== undefined) {
        player.bounty = getNumericValue(colConfig.bounty);
      }
      if (currentGameCategory === "PPSR" && colConfig.hands !== undefined) {
        player.hands = getNumericValue(colConfig.hands);
        // For PPSR, rake comes from clubRake column
        player.rake = getNumericValue(colConfig.clubRake);
      }

      currentPlayers.push(player);
    }

    // Save session on Total row
    if (isTotalRow && currentSession && currentPlayers.length > 0) {
      currentSession.players = currentPlayers;
      currentSession.playerCount = currentPlayers.length;
      currentSession.totalBuyIn = currentPlayers.reduce((sum, p) => sum + (p.buyInChips ?? p.buyIn ?? 0), 0);
      currentSession.totalWinnings = currentPlayers.reduce((sum, p) => sum + (p.winnings ?? 0), 0);
      currentSession.totalRake = currentPlayers.reduce((sum, p) => sum + (p.rake ?? 0), 0);
      result.push(currentSession);
      currentSession = null;
      currentPlayers = [];
    }
  }

  // Don't forget last session if file doesn't end with Total row
  if (currentSession && currentPlayers.length > 0) {
    currentSession.players = currentPlayers;
    currentSession.playerCount = currentPlayers.length;
    currentSession.totalBuyIn = currentPlayers.reduce((sum, p) => sum + (p.buyInChips ?? p.buyIn ?? 0), 0);
    currentSession.totalWinnings = currentPlayers.reduce((sum, p) => sum + (p.winnings ?? 0), 0);
    currentSession.totalRake = currentPlayers.reduce((sum, p) => sum + (p.rake ?? 0), 0);
    result.push(currentSession);
  }

  console.log(`\n========== PARSED PARTIDAS ==========`);
  console.log(`Total sessions: ${result.length}`);
  console.log(`\n📊 Sessions by category:`);
  console.log(`  PPST_MTT (Standard MTT): ${categoryCounts.PPST_MTT}`);
  console.log(`  PPST_SPINUP (Spin & Go): ${categoryCounts.PPST_SPINUP}`);
  console.log(`  PPST_PKO (Bounty): ${categoryCounts.PPST_PKO}`);
  console.log(`  PPSR (Cash Game): ${categoryCounts.PPSR}`);
  console.log(`  MTT_OTHER (MTT/6+ etc): ${categoryCounts.MTT_OTHER}`);
  if (result.length > 0) {
    console.log(`\nFirst session:`, JSON.stringify(result[0], null, 2));
    const totalPlayers = result.reduce((sum, s) => sum + (s.playerCount || 0), 0);
    console.log(`Total players across all sessions: ${totalPlayers}`);
  }
  console.log(`========== END PARSED PARTIDAS ==========\n`);

  return result;
}

// Column mappings for Demonstrativo sheet
const DEMONSTRATIVO_COLUMNS = {
  occurredAt: 0, // A
  ppPokerId: 1, // B
  nickname: 2, // C
  memoName: 3, // D
  type: 4, // E
  amount: 5, // F
};

// Parser for Demonstrativo (Statement) sheet
function parseDemonstrativoSheet(sheet: XLSX.Sheet): ParsedDemonstrativo[] {
  debugSheetColumns(sheet, "Demonstrativo");

  const rawData = parseSheetByPosition(
    sheet,
    DEMONSTRATIVO_COLUMNS,
    2,
    (row) => Boolean(row.ppPokerId || row.occurredAt)
  );

  const result = rawData.map((row) => ({
    occurredAt: row.occurredAt ? String(row.occurredAt) : "",
    ppPokerId: row.ppPokerId ? String(row.ppPokerId) : "",
    nickname: row.nickname || "",
    memoName: row.memoName || null,
    type: row.type || null,
    amount: toNumber(row.amount),
  }));

  console.log(`\n========== PARSED DEMONSTRATIVO ==========`);
  console.log(`Total records: ${result.length}`);
  if (result.length > 0) {
    console.log(`First record:`, JSON.stringify(result[0], null, 2));
  }
  console.log(`========== END PARSED DEMONSTRATIVO ==========\n`);

  return result;
}

// Column mappings for Retorno de taxa (Rakeback) sheet
const RAKEBACK_COLUMNS = {
  superAgentPpPokerId: 1, // B - ID do superagente
  agentPpPokerId: 2, // C - ID do agente
  country: 3, // D - País/região
  agentNickname: 4, // E - Apelido
  memoName: 5, // F - Nome de memorando
  averageRakebackPercent: 6, // G - Retorno% médio de taxa
  totalRt: 7, // H - Total de RT
};

// Parser for Retorno de taxa (Rakeback) sheet
function parseRakebackSheet(sheet: XLSX.Sheet): ParsedRakeback[] {
  debugSheetColumns(sheet, "Retorno de taxa");

  const rawData = parseSheetByPosition(
    sheet,
    RAKEBACK_COLUMNS,
    2,
    (row) => Boolean(row.agentPpPokerId)
  );

  const result = rawData
    .filter((row) => row.agentPpPokerId && !isNaN(Number(row.agentPpPokerId)))
    .map((row) => ({
      agentPpPokerId: String(row.agentPpPokerId || ""),
      agentNickname: row.agentNickname || "",
      country: row.country || null,
      memoName: row.memoName || null,
      superAgentPpPokerId: row.superAgentPpPokerId
        ? String(row.superAgentPpPokerId)
        : null,
      averageRakebackPercent: toNumber(row.averageRakebackPercent),
      totalRt: toNumber(row.totalRt),
    }));

  console.log(`\n========== PARSED RETORNO DE TAXA ==========`);
  console.log(`Total records: ${result.length}`);
  if (result.length > 0) {
    console.log(`First record:`, JSON.stringify(result[0], null, 2));
  }
  console.log(`========== END PARSED RETORNO DE TAXA ==========\n`);

  return result;
}

// Parse League Excel workbook
function parseLeagueExcelWorkbook(workbook: XLSX.WorkBook): ParsedLeagueImportData {
  const result: ParsedLeagueImportData = {};

  // Log all sheet names for debugging
  console.log("\n========== WORKBOOK SHEETS ==========");
  console.log("Sheet names:", workbook.SheetNames);
  console.log("======================================\n");

  // Parse each known sheet
  const sheetParsers: Record<string, (sheet: XLSX.Sheet) => void> = {
    // League-level sheet (NEW - first tab)
    "Geral de liga": (sheet) => { result.leagueSummary = parseGeralDeLigaSheet(sheet); },
    "Geral da liga": (sheet) => { result.leagueSummary = parseGeralDeLigaSheet(sheet); },
    "League General": (sheet) => { result.leagueSummary = parseGeralDeLigaSheet(sheet); },
    // Standard club sheets
    "Geral": (sheet) => { result.clubSummaries = parseGeralSheet(sheet); },
    "General": (sheet) => { result.clubSummaries = parseGeralSheet(sheet); },
    "Geral de clube": (sheet) => { result.clubSummaries = parseGeralSheet(sheet); },
    // Detalhes de Clube (NEW)
    "Detalhado": (sheet) => { result.clubDetailed = parseDetalhesDeClubeSheet(sheet); },
    "Detalhes de clube": (sheet) => { result.clubDetailed = parseDetalhesDeClubeSheet(sheet); },
    "Club Details": (sheet) => { result.clubDetailed = parseDetalhesDeClubeSheet(sheet); },
    // Partidas (Sessions)
    "Partidas": (sheet) => { result.sessions = parsePartidasSheet(sheet); },
    "Sessions": (sheet) => { result.sessions = parsePartidasSheet(sheet); },
    // User details
    "Detalhes do usuário": (sheet) => { result.players = parseUserDetailsSheet(sheet); },
    "User Details": (sheet) => { result.players = parseUserDetailsSheet(sheet); },
    // Transactions
    "Transações": (sheet) => { result.transactions = parseTransacoesSheet(sheet); },
    "Transactions": (sheet) => { result.transactions = parseTransacoesSheet(sheet); },
    // Demonstrativo (Statement)
    "Demonstrativo": (sheet) => { result.demonstrativo = parseDemonstrativoSheet(sheet); },
    "Statement": (sheet) => { result.demonstrativo = parseDemonstrativoSheet(sheet); },
    // Retorno de taxa (Rakeback)
    "Retorno de taxa": (sheet) => { result.rakebacks = parseRakebackSheet(sheet); },
    "Fee Return": (sheet) => { result.rakebacks = parseRakebackSheet(sheet); },
    "Rakeback": (sheet) => { result.rakebacks = parseRakebackSheet(sheet); },
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const parser = sheetParsers[sheetName];
    if (parser) {
      console.log(`Parsing sheet: "${sheetName}"`);
      parser(sheet);
    } else {
      console.log(`Skipping unknown sheet: "${sheetName}"`);
    }
  }

  // Update club count from league summary
  if (result.leagueSummary) {
    result.clubCount = result.leagueSummary.totalClubs;
  }

  return result;
}

// Validate league import data
function validateLeagueImportData(data: ParsedLeagueImportData): LeagueValidationResult {
  const checks: any[] = [];
  const warnings: any[] = [];
  let passedChecks = 0;
  let totalChecks = 0;

  // Check for league summary (Geral de Liga)
  totalChecks++;
  if (data.leagueSummary && data.leagueSummary.clubs.length > 0) {
    passedChecks++;
    checks.push({
      id: "geral_de_liga_sheet_present",
      label: "Aba Geral de Liga",
      description: `${data.leagueSummary.clubs.length} clubes encontrados na liga`,
      status: "passed",
      count: data.leagueSummary.clubs.length,
      category: "structure",
      severity: "critical",
    });
  } else {
    checks.push({
      id: "geral_de_liga_sheet_present",
      label: "Aba Geral de Liga",
      description: "Nenhum dado de liga encontrado",
      status: "warning",
      category: "structure",
      severity: "warning",
    });
  }

  // Check for club summaries (Geral de Clube)
  totalChecks++;
  if (data.clubSummaries && data.clubSummaries.length > 0) {
    passedChecks++;
    checks.push({
      id: "geral_sheet_present",
      label: "Aba Geral de Clube",
      description: "Dados dos clubes encontrados",
      status: "passed",
      count: data.clubSummaries.length,
      category: "structure",
      severity: "critical",
    });
  } else {
    checks.push({
      id: "geral_sheet_present",
      label: "Aba Geral de Clube",
      description: "Nenhum dado de clube encontrado",
      status: "failed",
      category: "structure",
      severity: "critical",
    });
  }

  // Check for players
  totalChecks++;
  if (data.players && data.players.length > 0) {
    passedChecks++;
    checks.push({
      id: "user_details_sheet_present",
      label: "Detalhes do Usuário",
      description: "Dados de jogadores encontrados",
      status: "passed",
      count: data.players.length,
      category: "structure",
      severity: "warning",
    });
  } else {
    checks.push({
      id: "user_details_sheet_present",
      label: "Detalhes do Usuário",
      description: "Nenhum dado de jogador encontrado",
      status: "warning",
      category: "structure",
      severity: "warning",
    });
  }

  // Check for transactions
  totalChecks++;
  if (data.transactions && data.transactions.length > 0) {
    passedChecks++;
    checks.push({
      id: "transactions_sheet_present",
      label: "Transações",
      description: "Dados de transações encontrados",
      status: "passed",
      count: data.transactions.length,
      category: "structure",
      severity: "warning",
    });
  } else {
    checks.push({
      id: "transactions_sheet_present",
      label: "Transações",
      description: "Nenhuma transação encontrada",
      status: "warning",
      category: "structure",
      severity: "warning",
    });
  }

  const hasBlockingErrors = checks.some(
    (c) => c.status === "failed" && c.severity === "critical"
  );

  const qualityScore = totalChecks > 0
    ? Math.round((passedChecks / totalChecks) * 100)
    : 0;

  // Calculate stats from league summary if available
  const leagueClubs = data.leagueSummary?.clubs || [];
  const totalClubs = leagueClubs.length || data.clubCount || 1;
  const totalPlayers = data.clubSummaries?.length || 0;
  const totalTransactions = data.transactions?.length || 0;

  // Use league summary totals if available
  const totalWinnings = data.leagueSummary?.totalPlayerEarningsGeneral ??
    data.clubSummaries?.reduce((sum, s) => sum + (s.generalTotal || 0), 0) ?? 0;
  const totalRake = data.leagueSummary?.totalClubEarningsJackpotFee ??
    data.clubSummaries?.reduce((sum, s) => sum + (s.feeGeneral || 0), 0) ?? 0;

  // Build club distribution from league summary
  const clubDistribution = leagueClubs.map((club) => ({
    clubId: club.clubId,
    clubName: club.clubName,
    playerCount: 0, // Not available at league level
    totalRake: club.clubEarningsJackpotFee,
    percentage: totalWinnings !== 0
      ? Math.abs(club.playerEarningsGeneral / totalWinnings) * 100
      : 0,
  }));

  // Game type distribution from league summary
  const gameTypeDistribution = data.leagueSummary ? [
    { type: "ring_games", label: "Ring Games", value: data.leagueSummary.totalPlayerEarningsRingGames, percentage: 0 },
    { type: "mtt_sitng", label: "MTT/SitNGo", value: data.leagueSummary.totalPlayerEarningsMttSitNGo, percentage: 0 },
    { type: "spinup", label: "SpinUp", value: data.leagueSummary.totalPlayerEarningsSpinUp, percentage: 0 },
    { type: "caribbean", label: "Caribbean+", value: data.leagueSummary.totalPlayerEarningsCaribbeanPoker, percentage: 0 },
    { type: "color_game", label: "Color Game", value: data.leagueSummary.totalPlayerEarningsColorGame, percentage: 0 },
    { type: "crash", label: "Crash", value: data.leagueSummary.totalPlayerEarningsCrash, percentage: 0 },
    { type: "lucky_draw", label: "Lucky Draw", value: data.leagueSummary.totalPlayerEarningsLuckyDraw, percentage: 0 },
    { type: "jackpot", label: "Jackpot", value: data.leagueSummary.totalPlayerEarningsJackpot, percentage: 0 },
  ].filter(g => g.value !== 0) : [];

  // Calculate percentages
  const totalGameValue = gameTypeDistribution.reduce((sum, g) => sum + Math.abs(g.value), 0);
  gameTypeDistribution.forEach(g => {
    g.percentage = totalGameValue > 0 ? (Math.abs(g.value) / totalGameValue) * 100 : 0;
  });

  // Find top performers from league clubs (by player earnings)
  const sortedByGeneral = [...leagueClubs].sort((a, b) => b.playerEarningsGeneral - a.playerEarningsGeneral);
  const majorWinner = sortedByGeneral.length > 0 && sortedByGeneral[0].playerEarningsGeneral > 0
    ? { name: sortedByGeneral[0].clubName, value: sortedByGeneral[0].playerEarningsGeneral }
    : null;
  const majorLoser = sortedByGeneral.length > 0 && sortedByGeneral[sortedByGeneral.length - 1].playerEarningsGeneral < 0
    ? { name: sortedByGeneral[sortedByGeneral.length - 1].clubName, value: sortedByGeneral[sortedByGeneral.length - 1].playerEarningsGeneral }
    : null;

  return {
    qualityScore,
    passedChecks,
    totalChecks,
    hasBlockingErrors,
    checks,
    warnings,
    insights: [],
    period: {
      start: data.periodStart || data.leagueSummary?.periodDate || "",
      end: data.periodEnd || data.leagueSummary?.periodDate || "",
      days: 0,
    },
    stats: {
      totalLeagues: 1,
      totalClubs,
      totalPlayers,
      newPlayers: totalPlayers,
      existingPlayers: 0,
      winners: leagueClubs.filter((c) => c.playerEarningsGeneral > 0).length ||
        data.clubSummaries?.filter((s) => s.generalTotal > 0).length || 0,
      losers: leagueClubs.filter((c) => c.playerEarningsGeneral < 0).length ||
        data.clubSummaries?.filter((s) => s.generalTotal < 0).length || 0,
      totalWinnings,
      totalRake,
      avgWinningsPerPlayer: totalPlayers > 0 ? totalWinnings / totalPlayers : 0,
      totalTransactions,
      transactionVolume: data.transactions?.reduce(
        (sum, t) => sum + Math.abs(t.creditSent) + Math.abs(t.chipsSent),
        0
      ) || 0,
      avgTransactionValue: 0,
      totalSessions: data.sessions?.length || 0,
      cashGameSessions: 0,
      mttSessions: 0,
      sitNGoSessions: 0,
    },
    agents: [],
    gameTypeDistribution,
    clubDistribution,
    topPerformers: {
      majorWinner,
      majorLoser,
    },
  };
}

export function LeagueImportUploader() {
  const t = useI18n();
  const { toast, update } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [parsedDataForValidation, setParsedDataForValidation] =
    useState<ParsedLeagueImportData | null>(null);
  const [validationResult, setValidationResult] =
    useState<LeagueValidationResult | null>(null);
  const [currentFileName, setCurrentFileName] = useState("");
  const [currentFileSize, setCurrentFileSize] = useState(0);

  const handleApproveImport = useCallback(async () => {
    if (!parsedDataForValidation) return;

    setIsImporting(true);
    try {
      // TODO: Implement backend processing for league imports
      toast({
        title: t("poker.leagueImport.uploadSuccess"),
        variant: "success",
      });
      setValidationModalOpen(false);
      setParsedDataForValidation(null);
      setValidationResult(null);
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsImporting(false);
    }
  }, [parsedDataForValidation, toast, t]);

  const handleRejectImport = useCallback(() => {
    setValidationModalOpen(false);
    setParsedDataForValidation(null);
    setValidationResult(null);
    toast({
      title: t("poker.leagueImport.cancelled"),
      variant: "default",
    });
  }, [toast, t]);

  const processFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);

      // Show processing toast with progress bar
      const { id, dismiss } = toast({
        variant: "progress",
        title: "Lendo arquivo...",
        description: file.name,
        progress: 0,
        duration: Number.POSITIVE_INFINITY,
      });

      try {
        update(id, { title: "Lendo arquivo Excel...", progress: 10 });
        const arrayBuffer = await file.arrayBuffer();

        update(id, { title: "Parseando planilha...", progress: 25 });
        const workbook = XLSX.read(arrayBuffer, {
          type: "array",
          cellFormula: true,
          cellStyles: true,
          cellDates: true,
          cellNF: true,      // Preserve number formats
          sheetStubs: true,  // Include empty cells for formula evaluation
          dense: false,      // Use sparse array format for better formula access
        });

        let parsedData: ParsedLeagueImportData = {};

        update(id, { title: "Extraindo período...", progress: 40 });
        // Extract period from Geral sheet header
        const geralSheet =
          workbook.Sheets["Geral"] ||
          workbook.Sheets["General"] ||
          workbook.Sheets["Geral de clube"];
        if (geralSheet) {
          const periodCell = geralSheet["A3"];
          if (periodCell && periodCell.v) {
            const periodMatch = periodCell.v.match(
              /(\d{4}\/\d{2}\/\d{2})\s*-\s*(\d{4}\/\d{2}\/\d{2})/
            );
            if (periodMatch) {
              parsedData.periodStart = periodMatch[1].replace(/\//g, "-");
              parsedData.periodEnd = periodMatch[2].replace(/\//g, "-");
            }
          }
        }

        update(id, { title: "Processando abas...", progress: 55 });
        // Parse all sheets
        const sheetData = parseLeagueExcelWorkbook(workbook);
        parsedData = { ...parsedData, ...sheetData };

        // Add file metadata
        parsedData.fileName = file.name;
        parsedData.fileSize = file.size;

        update(id, { title: "Verificando dados...", progress: 80 });
        const hasData =
          (parsedData.players?.length ?? 0) > 0 ||
          (parsedData.transactions?.length ?? 0) > 0 ||
          (parsedData.clubSummaries?.length ?? 0) > 0;

        if (!hasData) {
          throw new Error(t("poker.leagueImport.noDataFound"));
        }

        update(id, { title: "Validando dados...", progress: 90 });
        // Validate the data
        const validation = validateLeagueImportData(parsedData);

        // Store data for validation modal
        setCurrentFileName(file.name);
        setCurrentFileSize(file.size);
        setParsedDataForValidation(parsedData);
        setValidationResult(validation);
        setValidationModalOpen(true);

        // Dismiss processing toast
        dismiss();
      } catch (error: any) {
        dismiss();
        toast({
          title: t("poker.leagueImport.parseError"),
          description: error.message,
          variant: "error",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [toast, update, t]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      processFile(acceptedFiles[0]);
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <>
      {/* Drop zone wrapper */}
      <div
        className="relative h-full"
        {...getRootProps({ onClick: (evt) => evt.stopPropagation() })}
      >
        {/* Drag overlay */}
        <div className="absolute top-0 right-0 left-0 z-[51] w-full pointer-events-none h-[calc(100vh-150px)]">
          <div
            className={cn(
              "bg-background dark:bg-[#1A1A1A] h-full w-full flex items-center justify-center text-center transition-opacity",
              isDragActive ? "visible opacity-100" : "invisible opacity-0"
            )}
          >
            <input {...getInputProps()} id="upload-poker-file" />
            <div className="flex flex-col items-center justify-center gap-2">
              <p className="text-sm">{t("poker.leagueImport.dropHere")}</p>
              <span className="text-xs text-[#878787]">
                {t("poker.leagueImport.supportedFormats")}
              </span>
            </div>
          </div>
        </div>

        {/* Empty state - Vault style */}
        <div className="h-[calc(100vh-250px)] flex items-center justify-center">
          <div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col">
            <div className="flex w-full flex-col relative text-center">
              <div className="pb-4">
                <h2 className="font-medium text-lg">
                  {t("poker.leagueImport.empty_title")}
                </h2>
              </div>

              <p className="pb-6 text-sm text-[#878787]">
                {t("poker.leagueImport.empty_description")}
              </p>

              <button
                type="button"
                onClick={() => document.getElementById("upload-poker-file")?.click()}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                {t("poker.leagueImport.upload")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* League Validation Modal */}
      {parsedDataForValidation && validationResult && (
        <LeagueImportValidationModal
          open={validationModalOpen}
          onOpenChange={setValidationModalOpen}
          parsedData={parsedDataForValidation}
          validationResult={validationResult}
          onApprove={handleApproveImport}
          onReject={handleRejectImport}
          isProcessing={isImporting}
        />
      )}
    </>
  );
}

LeagueImportUploader.Skeleton = function LeagueImportUploaderSkeleton() {
  return <Skeleton className="h-48 w-full rounded-lg" />;
};
