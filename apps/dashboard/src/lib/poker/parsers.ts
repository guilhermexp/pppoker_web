import * as XLSX from "xlsx";

/**
 * Shared parser utility functions for PPPoker spreadsheet imports.
 *
 * These functions are used across multiple import uploaders:
 * - poker/import-uploader.tsx (club spreadsheets)
 * - poker/league-import-uploader.tsx (league spreadsheets)
 * - league/league-import-uploader.tsx (SU spreadsheets)
 * - workers/excel-parser.worker.ts (background parsing)
 */

// ============================================================================
// NUMBER PARSING
// ============================================================================

/**
 * Convert a value to number, handling Brazilian format (comma as decimal separator).
 * If the value contains a comma, dots are treated as thousand separators (Brazilian format).
 * Otherwise, standard parseFloat is used.
 */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const str = value.toString().trim();
  if (str.includes(",")) {
    // Brazilian format: dots are thousand separators, comma is decimal
    const cleaned = str.replace(/\./g, "").replace(",", ".");
    const parsed = Number.parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  const parsed = Number.parseFloat(str);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse a value that might be "/" or "-" (representing null/empty in PPPoker exports).
 * Returns null for slash/dash/empty, or the numeric value.
 */
export function parseSlashValue(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const str = String(value).trim();
  if (str === "/" || str === "-" || str === "") return null;
  return toNumber(str);
}

// ============================================================================
// EXCEL CELL UTILITIES
// ============================================================================

/**
 * Convert Excel column letter to 0-based index.
 * A=0, B=1, ..., Z=25, AA=26, AB=27, etc.
 */
export function columnLetterToIndex(letter: string): number {
  let index = 0;
  const upper = letter.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Get cell value from an XLSX sheet, with formula calculation support.
 * Handles numeric values, string values that look like numbers,
 * formatted text values, and recursive formula evaluation.
 */
export function getCellValue(
  sheet: XLSX.Sheet,
  address: string,
  visited: Set<string> = new Set(),
): number {
  if (visited.has(address)) return 0;
  visited.add(address);

  const cell = sheet[address];
  if (!cell) return 0;

  // Priority 1: Raw numeric value
  if (cell.v !== undefined && cell.v !== null) {
    if (typeof cell.v === "number") return cell.v;
    const parsed = Number.parseFloat(
      typeof cell.v === "string" ? cell.v.replace(/,/g, ".") : String(cell.v),
    );
    if (!Number.isNaN(parsed)) return parsed;
  }

  // Priority 2: Formatted text value
  if (cell.w !== undefined && cell.w !== null) {
    const parsed = Number.parseFloat(String(cell.w).replace(/,/g, "."));
    if (!Number.isNaN(parsed)) return parsed;
  }

  // Priority 3: Formula evaluation
  if (cell.f) {
    return calculateFormula(sheet, cell.f, visited);
  }

  return 0;
}

/**
 * Calculate Excel formulas recursively.
 * Supports: SUM(range), SUM(multi-range), SUBTOTAL(9,range), SUM(col:col),
 * SUMIF/SUMIFS (returns 0), IF(condition, true, false), cell references,
 * arithmetic (+, -, *, /), and plain numbers.
 */
export function calculateFormula(
  sheet: XLSX.Sheet,
  formula: string,
  visited: Set<string> = new Set(),
): number {
  const cleanFormula = formula.trim().replace(/^=/, "");

  // SUM(range) - e.g., SUM(I5:Q5)
  const sumMatch = cleanFormula.match(/^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/i);
  if (sumMatch) {
    const [, startCol, startRowStr, endCol, endRowStr] = sumMatch;
    return sumRange(sheet, startCol, startRowStr, endCol, endRowStr, visited);
  }

  // SUBTOTAL(9,range) - same as SUM for our purposes
  const subtotalMatch = cleanFormula.match(
    /^SUBTOTAL\s*\(\s*\d+\s*,\s*([A-Z]+)(\d+):([A-Z]+)(\d+)\s*\)$/i,
  );
  if (subtotalMatch) {
    const [, startCol, startRowStr, endCol, endRowStr] = subtotalMatch;
    return sumRange(sheet, startCol, startRowStr, endCol, endRowStr, visited);
  }

  // Simple SUM with single column range like SUM(G:G) or SUM(G5:G999)
  const colSumMatch = cleanFormula.match(
    /^SUM\(([A-Z]+)(?:(\d+))?:([A-Z]+)(?:(\d+))?\)$/i,
  );
  if (colSumMatch) {
    const [, startCol, startRowStr, endCol, endRowStr] = colSumMatch;
    if (startCol.toUpperCase() === endCol.toUpperCase()) {
      const colIdx = columnLetterToIndex(startCol);
      const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
      const startRow = startRowStr ? Number.parseInt(startRowStr, 10) - 1 : 0;
      const endRow = endRowStr ? Number.parseInt(endRowStr, 10) - 1 : range.e.r;

      let sum = 0;
      for (let row = startRow; row <= endRow; row++) {
        const addr = XLSX.utils.encode_cell({ r: row, c: colIdx });
        sum += getCellValue(sheet, addr, new Set(visited));
      }
      return sum;
    }
  }

  // SUM with multiple ranges - e.g., SUM(A1:B2,C3:D4)
  const multiSumMatch = cleanFormula.match(/^SUM\((.+)\)$/i);
  if (multiSumMatch) {
    const ranges = multiSumMatch[1].split(",");
    let sum = 0;
    for (const rangePart of ranges) {
      const trimmedRange = rangePart.trim();
      // Range (A1:B2)
      const rangeMatch = trimmedRange.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
      if (rangeMatch) {
        const [, sc, sr, ec, er] = rangeMatch;
        sum += sumRange(sheet, sc, sr, ec, er, visited);
        continue;
      }
      // Single cell (A1)
      const cellMatch = trimmedRange.match(/^([A-Z]+)(\d+)$/i);
      if (cellMatch) {
        const [, col, rowStr] = cellMatch;
        const addr = XLSX.utils.encode_cell({
          r: Number.parseInt(rowStr, 10) - 1,
          c: columnLetterToIndex(col),
        });
        sum += getCellValue(sheet, addr, new Set(visited));
      }
    }
    return sum;
  }

  // SUMIF/SUMIFS - cannot evaluate properly, return 0
  if (cleanFormula.match(/^SUMIFS?\(/i)) {
    return 0;
  }

  // IF statement: IF(condition, true_val, false_val)
  const ifMatch = cleanFormula.match(/^IF\(([^,]+),\s*([^,]+),\s*([^)]+)\)$/i);
  if (ifMatch) {
    const trueVal = ifMatch[2].trim();
    const cellRef = trueVal.match(/^([A-Z]+)(\d+)$/i);
    if (cellRef) {
      const addr = XLSX.utils.encode_cell({
        r: Number.parseInt(cellRef[2], 10) - 1,
        c: columnLetterToIndex(cellRef[1]),
      });
      return getCellValue(sheet, addr, new Set(visited));
    }
    const num = Number.parseFloat(trueVal);
    if (!Number.isNaN(num)) return num;
    return 0;
  }

  // Cell reference like =A1 or A1
  const cellRefMatch = cleanFormula.match(/^([A-Z]+)(\d+)$/i);
  if (cellRefMatch) {
    const [, col, rowStr] = cellRefMatch;
    const addr = XLSX.utils.encode_cell({
      r: Number.parseInt(rowStr, 10) - 1,
      c: columnLetterToIndex(col),
    });
    return getCellValue(sheet, addr, visited);
  }

  // Multiple cell arithmetic: A1+B1+C1 or A1-B1-C1 or A1+B1-C1 etc
  const multiArithMatch = cleanFormula.match(
    /^([A-Z]+\d+(?:\s*[+\-]\s*[A-Z]+\d+)+)$/i,
  );
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
          const addr = XLSX.utils.encode_cell({
            r: Number.parseInt(ref[2], 10) - 1,
            c: columnLetterToIndex(ref[1]),
          });
          const val = getCellValue(sheet, addr, new Set(visited));
          result = currentOp === "+" ? result + val : result - val;
        }
      }
    }
    return result;
  }

  // Simple arithmetic: A1+B1 or A1-B1
  const arithmeticMatch = cleanFormula.match(
    /^([A-Z]+)(\d+)\s*([+\-])\s*([A-Z]+)(\d+)$/i,
  );
  if (arithmeticMatch) {
    const [, col1, row1, op, col2, row2] = arithmeticMatch;
    const addr1 = XLSX.utils.encode_cell({
      r: Number.parseInt(row1, 10) - 1,
      c: columnLetterToIndex(col1),
    });
    const addr2 = XLSX.utils.encode_cell({
      r: Number.parseInt(row2, 10) - 1,
      c: columnLetterToIndex(col2),
    });
    const val1 = getCellValue(sheet, addr1, new Set(visited));
    const val2 = getCellValue(sheet, addr2, new Set(visited));
    return op === "+" ? val1 + val2 : val1 - val2;
  }

  // Multiplication/Division: A1*B1 or A1/B1
  const multDivMatch = cleanFormula.match(
    /^([A-Z]+)(\d+)\s*([*\/])\s*([A-Z]+)(\d+)$/i,
  );
  if (multDivMatch) {
    const [, col1, row1, op, col2, row2] = multDivMatch;
    const addr1 = XLSX.utils.encode_cell({
      r: Number.parseInt(row1, 10) - 1,
      c: columnLetterToIndex(col1),
    });
    const addr2 = XLSX.utils.encode_cell({
      r: Number.parseInt(row2, 10) - 1,
      c: columnLetterToIndex(col2),
    });
    const val1 = getCellValue(sheet, addr1, new Set(visited));
    const val2 = getCellValue(sheet, addr2, new Set(visited));
    if (op === "*") return val1 * val2;
    if (op === "/" && val2 !== 0) return val1 / val2;
    return 0;
  }

  // Number with cell: A1*100 or 100*A1 or A1/100
  const numCellMatch = cleanFormula.match(
    /^(?:([A-Z]+)(\d+)\s*([*\/])\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*([*\/])\s*([A-Z]+)(\d+))$/i,
  );
  if (numCellMatch) {
    if (numCellMatch[1]) {
      // Cell first: A1*100
      const addr = XLSX.utils.encode_cell({
        r: Number.parseInt(numCellMatch[2], 10) - 1,
        c: columnLetterToIndex(numCellMatch[1]),
      });
      const cellVal = getCellValue(sheet, addr, new Set(visited));
      const num = Number.parseFloat(numCellMatch[4]);
      const op = numCellMatch[3];
      if (op === "*") return cellVal * num;
      if (op === "/" && num !== 0) return cellVal / num;
    } else {
      // Number first: 100*A1
      const addr = XLSX.utils.encode_cell({
        r: Number.parseInt(numCellMatch[8], 10) - 1,
        c: columnLetterToIndex(numCellMatch[7]),
      });
      const cellVal = getCellValue(sheet, addr, new Set(visited));
      const num = Number.parseFloat(numCellMatch[5]);
      const op = numCellMatch[6];
      if (op === "*") return num * cellVal;
      if (op === "/" && cellVal !== 0) return num / cellVal;
    }
    return 0;
  }

  // Plain number
  const plainNum = Number.parseFloat(cleanFormula);
  if (!Number.isNaN(plainNum)) return plainNum;

  return 0;
}

// ============================================================================
// SHEET PARSING
// ============================================================================

/**
 * Parse an XLSX sheet by column position, using a column map.
 * Handles formula cells, cached values, and formatted text.
 *
 * @param sheet - The XLSX worksheet
 * @param columnMap - Maps field names to 0-based column indices
 * @param headerRows - Number of header rows to skip (data starts at this row)
 * @param rowFilter - Optional filter function; if not provided, rows with valid ppPokerId are included
 */
export function parseSheetByPosition(
  sheet: XLSX.Sheet,
  columnMap: Record<string, number>,
  headerRows = 4,
  rowFilter?: (rowData: Record<string, any>) => boolean,
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
          const parsed = Number.parseFloat(trimmed);
          value = !Number.isNaN(parsed) ? parsed : cell.w;
        }

        // Additional check: if we have a formula and the value seems wrong
        // (0 for a formula that should have a value)
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

      if (field === "ppPokerId" && value && !Number.isNaN(Number(value))) {
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

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Sum all cell values in a rectangular range.
 */
function sumRange(
  sheet: XLSX.Sheet,
  startCol: string,
  startRowStr: string,
  endCol: string,
  endRowStr: string,
  visited: Set<string>,
): number {
  const startColIdx = columnLetterToIndex(startCol);
  const endColIdx = columnLetterToIndex(endCol);
  const startRowIdx = Number.parseInt(startRowStr, 10) - 1;
  const endRowIdx = Number.parseInt(endRowStr, 10) - 1;

  let sum = 0;
  for (let row = startRowIdx; row <= endRowIdx; row++) {
    for (let col = startColIdx; col <= endColIdx; col++) {
      const addr = XLSX.utils.encode_cell({ r: row, c: col });
      sum += getCellValue(sheet, addr, new Set(visited));
    }
  }
  return sum;
}
