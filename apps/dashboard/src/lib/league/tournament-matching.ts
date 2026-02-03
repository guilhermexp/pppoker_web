import type { StoredTournament } from "@/app/[locale]/(app)/(sidebar)/su/grade/grade-tab";

// Torneio realizado salvo no localStorage (extraído do import PPST)
export interface StoredRealizedTournament {
  name: string; // metadata.nomeMesa (uppercase, trimmed)
  date: string; // metadata.dataInicio (YYYY/MM/DD)
  day: string; // dia da semana computado (MONDAY, TUESDAY, etc.)
  time: string; // metadata.horaInicio (HH:MM)
  gtdFichas: number; // metadata.premiacaoGarantida (valor em R$)
  gameType: string; // extraído de tipoJogo: "NLH", "PLO", "SPINUP", etc.
  buyIn: number; // metadata.buyInBase
  entries: number; // jogadores.length
  overlay: number; // (buyinFichas + buyinTicket) - taxa - gtdFichas (negativo = overlay)
}

export interface StoredRealizedData {
  weekNumber: number;
  period: { start: string; end: string };
  savedAt: string;
  tournaments: StoredRealizedTournament[];
  totalGTDFichas: number;
  totalCount: number;
}

// Resultado da validação de datas
export interface DateValidationResult {
  datesMatch: boolean;
  scheduleStart: string; // DD/MM
  scheduleEnd: string; // DD/MM
  importStart: string; // DD/MM (convertido de YYYY-MM-DD)
  importEnd: string; // DD/MM (convertido de YYYY-MM-DD)
}

// Converte "2025-01-27" → "27/01"
export function isoToDDMM(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}`;
}

// Compara períodos: scheduleStart/End em DD/MM, importStart/End em YYYY-MM-DD
export function validateDateRanges(
  scheduleStart: string,
  scheduleEnd: string,
  importStart: string,
  importEnd: string,
): DateValidationResult {
  const importStartDDMM = isoToDDMM(importStart);
  const importEndDDMM = isoToDDMM(importEnd);
  return {
    datesMatch:
      scheduleStart === importStartDDMM && scheduleEnd === importEndDDMM,
    scheduleStart,
    scheduleEnd,
    importStart: importStartDDMM,
    importEnd: importEndDDMM,
  };
}

// Resultado do matching
export interface MatchResult {
  matched: MatchedPair[];
  missingFromImport: StoredTournament[];
  extraInImport: StoredRealizedTournament[];
}

export interface MatchedPair {
  schedule: StoredTournament;
  realized: StoredRealizedTournament;
  score: number;
  matchType: "exact";
}

// Extrai game type de tipoJogo: "PPST/NLH" → "NLH", "PPST/PLO PKO" → "PLO"
export function extractGameType(tipoJogo: string): string {
  // Remove any organizer prefix before "/" (e.g., "PPST/NLH", "SA/NLH", "MKO/PLO")
  const cleaned = tipoJogo
    .replace(/^[^/]+\//, "")
    .trim()
    .toUpperCase();
  // Pega o primeiro token: "NLH", "PLO", "SPINUP", etc.
  const token = cleaned.split(/\s+/)[0];
  return token || cleaned;
}

// Converte data YYYY/MM/DD ou YYYY-MM-DD para dia da semana (MONDAY, TUESDAY, etc.)
export function dateToDayOfWeek(dateStr: string): string {
  const parts = dateStr.split(/[/\-]/);
  if (parts.length !== 3) return "";
  const [year, month, day] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  return days[date.getDay()] || "";
}

// Converte horário de UTC-5 (planilha PPPoker) para UTC-3 (Brasília): +2h
export function convertUtc5ToUtc3(time: string): string {
  const parts = time.split(":");
  if (parts.length < 2) return time;
  const h = Number.parseInt(parts[0], 10);
  const m = Number.parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const newH = (h + 2) % 24;
  return `${String(newH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Normalização de nome: uppercase, trim, remove caracteres especiais, espaços duplos
function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Comparação de hora: exata
function hoursMatch(time1: string, time2: string): boolean {
  return time1 === time2;
}

// Comparação de hora: tolerante (±1h)
function hoursTolerant(time1: string, time2: string): boolean {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const diff = Math.abs(toMinutes(time1) - toMinutes(time2));
  return diff <= 60;
}

// Comparação de GTD: grade é USD, import é R$ (converte para USD dividindo por 5)
function gtdMatch(gradeUsd: number, importBrl: number): boolean {
  return gradeUsd === importBrl / 5;
}

// Matching principal — critérios obrigatórios: dia + horário + GTD em dólar
export function matchTournaments(
  schedule: StoredTournament[],
  realized: StoredRealizedTournament[],
): MatchResult {
  const matched: MatchedPair[] = [];
  const usedSchedule = new Set<number>();
  const usedRealized = new Set<number>();

  for (let si = 0; si < schedule.length; si++) {
    if (usedSchedule.has(si)) continue;
    const s = schedule[si];
    for (let ri = 0; ri < realized.length; ri++) {
      if (usedRealized.has(ri)) continue;
      const r = realized[ri];
      const sName = normalizeName(s.name);
      const rName = normalizeName(r.name);
      const nameMatch =
        sName === rName || sName.includes(rName) || rName.includes(sName);
      if (
        s.day === r.day &&
        s.time === r.time &&
        gtdMatch(s.gtd, r.gtdFichas) &&
        nameMatch
      ) {
        matched.push({
          schedule: s,
          realized: r,
          score: 100,
          matchType: "exact",
        });
        usedSchedule.add(si);
        usedRealized.add(ri);
        break;
      }
    }
  }

  // Sobrantes
  const missingFromImport: StoredTournament[] = [];
  for (let si = 0; si < schedule.length; si++) {
    if (!usedSchedule.has(si)) {
      missingFromImport.push(schedule[si]);
    }
  }

  const extraInImport: StoredRealizedTournament[] = [];
  for (let ri = 0; ri < realized.length; ri++) {
    if (!usedRealized.has(ri)) {
      extraInImport.push(realized[ri]);
    }
  }

  return { matched, missingFromImport, extraInImport };
}
