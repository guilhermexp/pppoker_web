import * as XLSX from "xlsx";

// Tipos
export interface TournamentEvent {
  id: string;
  day: string;
  name: string;
  game: string;
  gtd: string;
  buyIn: string;
  rebuy: string;
  addOn: string;
  stack: string;
  players: string;
  lateReg: string;
  minutes: string;
  structure: string;
  times: Record<string, string>;
}

export interface WeekScheduleInfo {
  startDate: string;
  endDate: string;
  filename: string;
}

export interface TournamentScheduleData {
  events: TournamentEvent[];
  weekInfo: WeekScheduleInfo;
}

// Converte número Excel (fração do dia) para string HH:MM
const excelTimeToStr = (val: unknown): string => {
  if (typeof val === "number") {
    const totalMinutes = Math.round(val * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }
  // Se já for string no formato HH:MM, retorna como está
  const strVal = String(val || "").trim();
  if (/^\d{1,2}:\d{2}$/.test(strVal)) {
    return strVal;
  }
  return strVal;
};

// Extrai datas da semana do nome do arquivo
const parseWeekFromFilename = (filename: string): WeekScheduleInfo | null => {
  const match = filename.match(
    /(\d{1,2})[\s_-](\d{1,2})[\s_-]al[\s_-](\d{1,2})[\s_-](\d{1,2})/i
  );
  if (match) {
    const [, startDay, startMonth, endDay, endMonth] = match;
    return {
      startDate: `${startDay.padStart(2, "0")}/${startMonth.padStart(2, "0")}`,
      endDate: `${endDay.padStart(2, "0")}/${endMonth.padStart(2, "0")}`,
      filename,
    };
  }
  return null;
};

// Mapa de dias (PT-BR e EN)
const dayMap: Record<string, string> = {
  MONDAY: "MONDAY",
  SEGUNDA: "MONDAY",
  "SEGUNDA-FEIRA": "MONDAY",
  TUESDAY: "TUESDAY",
  TERÇA: "TUESDAY",
  TERCA: "TUESDAY",
  "TERÇA-FEIRA": "TUESDAY",
  "TERCA-FEIRA": "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  QUARTA: "WEDNESDAY",
  "QUARTA-FEIRA": "WEDNESDAY",
  THURSDAY: "THURSDAY",
  QUINTA: "THURSDAY",
  "QUINTA-FEIRA": "THURSDAY",
  FRIDAY: "FRIDAY",
  SEXTA: "FRIDAY",
  "SEXTA-FEIRA": "FRIDAY",
  SATURDAY: "SATURDAY",
  SÁBADO: "SATURDAY",
  SABADO: "SATURDAY",
  SUNDAY: "SUNDAY",
  DOMINGO: "SUNDAY",
};

// Labels em português para os dias
export const dayLabels: Record<string, string> = {
  MONDAY: "Segunda",
  TUESDAY: "Terça",
  WEDNESDAY: "Quarta",
  THURSDAY: "Quinta",
  FRIDAY: "Sexta",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

// Ordem dos dias
export const dayOrder = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

// Encontra índice de coluna pelo nome do header
const findColumnIndex = (row: unknown[], names: string[]): number => {
  for (let i = 0; i < row.length; i++) {
    const cell = String(row[i] || "").trim().toUpperCase();
    for (const name of names) {
      if (cell === name.toUpperCase() || cell.includes(name.toUpperCase())) {
        return i;
      }
    }
  }
  return -1;
};

// Verifica se uma linha contém um dia da semana
const findDayInRow = (row: unknown[]): string | null => {
  for (const cell of row) {
    const val = String(cell || "").trim().toUpperCase();
    if (dayMap[val]) {
      return dayMap[val];
    }
  }
  return null;
};

// Função principal de processamento do arquivo XLSX
export const parseTournamentSchedule = (
  file: File
): Promise<TournamentScheduleData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        });

        const events: TournamentEvent[] = [];
        let currentDay = "";

        // Encontrar a linha de header procurando por "NAME" ou "GTD"
        let headerRowIdx = -1;
        let cols = {
          time: 2,
          gtd: -1,
          name: -1,
          game: -1,
          buyIn: -1,
          rebuy: -1,
          addOn: -1,
          stack: -1,
          players: -1,
          lateReg: -1,
          minutes: -1,
          structure: -1,
        };

        for (let i = 0; i < Math.min(15, json.length); i++) {
          const row = json[i];
          const nameIdx = findColumnIndex(row, ["NAME", "NOME", "TORNEIO", "TOURNAMENT"]);
          const gtdIdx = findColumnIndex(row, ["GTD", "GARANTIDO", "GUARANTEED"]);

          if (nameIdx !== -1 || gtdIdx !== -1) {
            headerRowIdx = i;
            cols.name = nameIdx !== -1 ? nameIdx : 9;
            cols.gtd = gtdIdx !== -1 ? gtdIdx : 8;
            cols.time = findColumnIndex(row, ["-3"]);
            if (cols.time === -1) cols.time = 2; // Fallback para coluna C
            cols.game = findColumnIndex(row, ["GAME", "JOGO", "TIPO"]);
            if (cols.game === -1) cols.game = cols.name + 1;
            cols.buyIn = findColumnIndex(row, ["BUY-IN", "BUYIN", "BUY IN", "BUY"]);
            if (cols.buyIn === -1) cols.buyIn = cols.game + 1;
            cols.rebuy = findColumnIndex(row, ["REBUY", "RE-BUY"]);
            if (cols.rebuy === -1) cols.rebuy = cols.buyIn + 1;
            cols.addOn = findColumnIndex(row, ["ADD-ON", "ADDON", "ADD ON"]);
            if (cols.addOn === -1) cols.addOn = cols.rebuy + 1;
            cols.stack = findColumnIndex(row, ["STACK"]);
            if (cols.stack === -1) cols.stack = cols.addOn + 2; // Pula uma coluna
            cols.players = findColumnIndex(row, ["PLAYERS", "JOGADORES"]);
            if (cols.players === -1) cols.players = cols.stack + 1;
            cols.lateReg = findColumnIndex(row, ["LATE", "LATE REG", "LATEREG"]);
            if (cols.lateReg === -1) cols.lateReg = cols.players + 1;
            cols.minutes = findColumnIndex(row, ["MINUTES", "MINUTOS", "MIN"]);
            if (cols.minutes === -1) cols.minutes = cols.lateReg + 1;
            cols.structure = findColumnIndex(row, ["STRUCTURE", "ESTRUTURA"]);
            if (cols.structure === -1) cols.structure = cols.minutes + 1;
            break;
          }
        }

        // Processar todas as linhas
        for (let i = 0; i < json.length; i++) {
          const row = json[i];

          // Verificar se esta linha contém um dia da semana
          const dayFound = findDayInRow(row);
          if (dayFound) {
            currentDay = dayFound;
            continue;
          }

          // Pular se ainda não encontramos um dia ou se é a linha de header
          if (!currentDay || i === headerRowIdx) {
            continue;
          }

          // Tentar extrair nome do torneio
          const tournamentName = String(row[cols.name] || "").trim();

          // Validar se é uma linha de dados (tem nome do torneio)
          if (
            tournamentName &&
            tournamentName.length > 1 &&
            !["NAME", "NOME", "TORNEIO", "-5", "-3", "+3", "+8"].includes(tournamentName.toUpperCase())
          ) {
            events.push({
              id: `${currentDay}-${i}`,
              day: currentDay,
              name: tournamentName,
              game: String(row[cols.game] || "").trim(),
              gtd: String(row[cols.gtd] || "").trim(),
              buyIn: String(row[cols.buyIn] || "").trim(),
              rebuy: String(row[cols.rebuy] || "").trim(),
              addOn: String(row[cols.addOn] || "").trim(),
              stack: String(row[cols.stack] || "").trim(),
              players: String(row[cols.players] || "").trim(),
              lateReg: String(row[cols.lateReg] || "").trim(),
              minutes: String(row[cols.minutes] || "").trim(),
              structure: String(row[cols.structure] || "").trim(),
              times: { "-3": excelTimeToStr(row[cols.time]) },
            });
          }
        }

        // Extrair info da semana do nome do arquivo ou da aba
        let weekInfo =
          parseWeekFromFilename(file.name) ||
          parseWeekFromFilename(wb.SheetNames[0]);

        // Se não conseguir extrair do nome, usar semana atual
        if (!weekInfo) {
          const today = new Date();
          const dayOfWeek = today.getDay();
          const monday = new Date(today);
          monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);

          weekInfo = {
            startDate: `${String(monday.getDate()).padStart(2, "0")}/${String(monday.getMonth() + 1).padStart(2, "0")}`,
            endDate: `${String(sunday.getDate()).padStart(2, "0")}/${String(sunday.getMonth() + 1).padStart(2, "0")}`,
            filename: file.name,
          };
        }

        resolve({ events, weekInfo });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

// Agrupa eventos por dia
export const groupEventsByDay = (
  events: TournamentEvent[]
): Record<string, TournamentEvent[]> => {
  const grouped: Record<string, TournamentEvent[]> = {};
  for (const event of events) {
    if (!grouped[event.day]) {
      grouped[event.day] = [];
    }
    grouped[event.day].push(event);
  }
  return grouped;
};

// Calcula totais
export const calculateTotals = (events: TournamentEvent[]) => {
  let totalGTD = 0;
  const totalTournaments = events.length;

  for (const event of events) {
    // Remove tudo que não é dígito ou ponto
    const gtd = Number.parseFloat(event.gtd.replace(/[^\d.]/g, "")) || 0;
    totalGTD += gtd;
  }

  return { totalGTD, totalTournaments };
};
