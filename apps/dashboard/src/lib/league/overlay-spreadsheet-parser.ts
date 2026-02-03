import * as XLSX from "xlsx";

export interface SAOverlayResumen {
  unionId: string;
  percentage: number;
  ppst: number;
  satLocal: number;
  sat: number;
  total: number;
}

export interface SAOverlayTournament {
  sheet: string;
  name: string;
  date: string;
  gameType: string;
  buyIn: string;
  gtd: number;
  entries: number;
  overlayPct: number;
  overlay: number;
}

export interface SAOverlayData {
  resumen: SAOverlayResumen[];
  tournaments: SAOverlayTournament[];
  filename: string;
}

// Tenta converter valor para número
function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^\d.,-]/g, "").replace(",", ".");
    const num = Number.parseFloat(cleaned);
    return Number.isNaN(num) ? 0 : num;
  }
  return 0;
}

function toStr(val: unknown): string {
  return String(val ?? "").trim();
}

// ========================
// RESUMEN parser
// ========================
// Formato real:
// Row 0: [null, null, "PPST", "SAT LOCAL", "SAT", "TOTAL"]
// Row 1: [] (vazio)
// Row 2+: [unionId(number), percentage(number), ppst, satLocal, sat, total]
// Row N: ["TOTALES", null, totalPpst, null, totalSat, totalGeral]
function parseResumen(sheet: XLSX.WorkSheet): SAOverlayResumen[] {
  const json: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
  });

  if (json.length < 2) return [];

  // Detectar header: procurar row com "PPST" e "TOTAL"
  let headerIdx = -1;
  let colPpst = -1;
  let colSatLocal = -1;
  let colSat = -1;
  let colTotal = -1;

  for (let i = 0; i < Math.min(5, json.length); i++) {
    const row = json[i];
    if (!row) continue;
    for (let j = 0; j < row.length; j++) {
      const cell = toStr(row[j]).toUpperCase();
      if (cell === "PPST") colPpst = j;
      else if (cell === "SAT LOCAL" || cell === "SAT_LOCAL") colSatLocal = j;
      else if (cell === "SAT" && colSatLocal !== j) colSat = j;
      else if (cell === "TOTAL") colTotal = j;
    }
    if (colPpst !== -1) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return [];

  // Union ID está na coluna 0, percentage na coluna 1
  const results: SAOverlayResumen[] = [];
  for (let i = headerIdx + 1; i < json.length; i++) {
    const row = json[i];
    if (!row || row.length === 0) continue;

    const firstCell = row[0];
    // Parar no TOTALES ou em linhas não-numéricas (exceto strings como "TOTALES")
    if (typeof firstCell === "string") {
      if (firstCell.toUpperCase() === "TOTALES") break;
      continue;
    }
    if (typeof firstCell !== "number") continue;

    const unionId = String(firstCell);
    if (!unionId || unionId.length < 2) continue;

    results.push({
      unionId,
      percentage: toNumber(row[1]),
      ppst: colPpst !== -1 ? toNumber(row[colPpst]) : 0,
      satLocal: colSatLocal !== -1 ? toNumber(row[colSatLocal]) : 0,
      sat: colSat !== -1 ? toNumber(row[colSat]) : 0,
      total: colTotal !== -1 ? toNumber(row[colTotal]) : 0,
    });
  }

  return results;
}

// ========================
// Tournament sheet parser (Hoja*, SAT*, BR*)
// ========================
// Cada aba = 1 torneio. Estrutura:
// Row 0: ["2026/01/12\r\nUTC -0500", "Hora de inicio: 2026/01/12 09:00 ..."]
// Row 1: ["...", "ID de la partida: ... Nombre de la mesa: DEEP TURBO"]
// Row 2: ["...", "PPST/NLH   Entrada: 1.8+0.2   Bote de premios Gtd.: 200"]
// Row 3: [null, "ID de Super Unión", ..., "GT = ", 200, "% overlay =", -0.001, "TOTAL =", -0.2]
// Row 4+: Player data
function parseTournamentSheet(
  sheetName: string,
  sheet: XLSX.WorkSheet,
): SAOverlayTournament | null {
  const json: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
  });

  if (json.length < 4) return null;

  // Row 0: extrair data
  const row0Str = toStr(json[0]?.[0]);
  let date = "";
  const dateMatch = row0Str.match(/(\d{4}\/\d{2}\/\d{2})/);
  if (dateMatch) date = dateMatch[1];

  // Row 1: extrair nome do torneio (Nombre de la mesa)
  const row1Str = toStr(json[1]?.[1]);
  let name = "";
  const nameMatch = row1Str.match(/Nombre de la mesa:\s*(.+?)$/i);
  if (nameMatch) name = nameMatch[1].trim();

  // Row 2: extrair tipo de jogo, buy-in e GTD
  const row2Str = toStr(json[2]?.[1]);
  let gameType = "";
  let buyIn = "";
  let gtd = 0;

  const gameMatch = row2Str.match(/^([A-Z0-9/+]+)/i);
  if (gameMatch) gameType = gameMatch[1];

  const entradaMatch = row2Str.match(/Entrada:\s*([\d.+]+)/i);
  if (entradaMatch) buyIn = entradaMatch[1];

  const gtdMatch = row2Str.match(/Gtd\.?:\s*([\d,.]+)/i);
  if (gtdMatch) gtd = toNumber(gtdMatch[1]);

  // Row 3: extrair overlay dos dados laterais
  // Formato: [..., "GT = ", 200, "% overlay =", -0.001, "TOTAL =", -0.2]
  const row3 = json[3] as unknown[];
  let overlayPct = 0;
  let overlay = 0;
  let entries = 0;

  if (row3) {
    for (let j = 0; j < row3.length; j++) {
      const cell = toStr(row3[j]).toUpperCase();
      if (cell.includes("% OVERLAY")) {
        overlayPct = toNumber(row3[j + 1]);
      } else if (cell.includes("TOTAL =") || cell === "TOTAL =") {
        overlay = toNumber(row3[j + 1]);
      }
    }
  }

  // Contar entries: linhas com dados de jogador (coluna 1 = "/")
  for (let i = 4; i < json.length; i++) {
    const row = json[i];
    if (!row) continue;
    if (toStr(row[1]) === "/") entries++;
  }

  if (!name) return null;

  return {
    sheet: sheetName,
    name,
    date,
    gameType,
    buyIn,
    gtd,
    entries,
    overlayPct,
    overlay,
  };
}

// Identifica se uma aba é de torneios
function isTournamentSheet(name: string): boolean {
  const upper = name.toUpperCase();
  return (
    upper.startsWith("HOJA") ||
    upper.startsWith("SAT") ||
    upper.startsWith("BR")
  );
}

export function parseSAOverlaySpreadsheet(file: File): Promise<SAOverlayData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });

        let resumen: SAOverlayResumen[] = [];
        const tournaments: SAOverlayTournament[] = [];

        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName];
          const upper = sheetName.toUpperCase();

          if (
            upper === "RESUMEN" ||
            upper === "RESUMO" ||
            upper === "SUMMARY"
          ) {
            resumen = parseResumen(sheet);
          } else if (isTournamentSheet(sheetName)) {
            const tournament = parseTournamentSheet(sheetName, sheet);
            if (tournament) tournaments.push(tournament);
          }
        }

        resolve({ resumen, tournaments, filename: file.name });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
