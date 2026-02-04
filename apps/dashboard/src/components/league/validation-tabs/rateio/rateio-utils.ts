export function formatNumber(value: number): string {
  return `R$ ${new Intl.NumberFormat("pt-BR").format(Math.round(value))}`;
}

export function parseDateString(value: string): Date | null {
  if (!value) {
    return null;
  }
  const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) {
    return null;
  }
  const [, dayStr, monthStr, yearStr] = match;
  const day = Number(dayStr);
  const month = Number(monthStr);
  const yearRaw = Number(yearStr);
  if (!day || !month || !yearRaw) {
    return null;
  }
  const year = yearStr.length === 2 ? 2000 + yearRaw : yearRaw;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function getWeekdayLabel(value: string): string {
  const date = parseDateString(value);
  if (!date) {
    return "Sem data";
  }
  const labels = [
    "Domingo",
    "Segunda feira",
    "Terca",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sabado",
  ];
  const label = labels[date.getDay()] ?? "Sem data";
  return label;
}

export function formatDateDisplay(value: string): string {
  const date = parseDateString(value);
  if (!date) {
    return value || "-";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function getDateKey(value: string): string {
  const date = parseDateString(value);
  if (!date) {
    return value || "sem-data";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatHourRange(start: number, end: number): string {
  return `${String(start).padStart(2, "0")}h - ${String(end).padStart(2, "0")}h`;
}

export type TorneioInfo = {
  nome: string;
  data: string;
  horaInicio: string;
  gtdUSD: number;
  gtdBRL: number;
  buyinBRL: number;
  entradas: number;
  overlay: number;
};

export type MetaGroupData = {
  id: string;
  name: string;
  metaPercent: number;
  isActive: boolean;
  members: {
    superUnionId: number;
    displayName?: string | null;
    fallbackPercent?: number;
  }[];
  timeSlots: {
    id: string;
    name: string;
    hourStart: number;
    hourEnd: number;
    metaPercent: number;
    isActive: boolean;
  }[];
};

// Types for available leagues and clubs extracted from import data
export type AvailableLeague = {
  ligaId: number;
  ligaNome: string;
  superUnionId: number | null;
};

export type AvailableClub = {
  clubeId: number;
  clubeNome: string;
  ligaId: number;
  ligaNome: string;
  superUnionId: number | null;
};

// Types for overlay distribution calculation
export type OverlayDistributionClub = {
  clubId: number;
  clubName: string;
  superUnionId: number;
  ligaId: number;
  metaTarget: number;
  metaType: string;
  actual: number;
  shortfall: number;
  referenceBuyin: number;
  charge: number;
  metMeta: boolean;
};

export type OverlayDistributionTournament = {
  gameId: string;
  gameName: string;
  startedAt: string;
  dayOfWeek: number;
  dayOfWeekLabel: string;
  hour: number;
  overlayAmount: number;
  status: "no_matching_metas" | "all_metas_met" | "clubs_charged";
  clubDistribution: OverlayDistributionClub[];
  totalClubCharges: number;
  leagueRemainder: number;
};

export type OverlayDistributionSummary = {
  totalOverlayTournaments: number;
  totalOverlayAmount: number;
  totalClubCharges: number;
  leagueRemainder: number;
  tournamentsWithNoMeta: number;
  tournamentsAllMetsMet: number;
};

export type OverlayDistributionClubSummary = {
  clubId: number;
  clubName: string;
  superUnionId: number;
  ligaId: number;
  totalCharge: number;
  tournamentsCharged: number;
  tournamentsExempt: number;
};

export type OverlayDistributionResult = {
  summary: OverlayDistributionSummary;
  tournaments: OverlayDistributionTournament[];
  clubSummary: OverlayDistributionClubSummary[];
};

export type OverlaySelectionMap = Record<string, boolean>;

// Fallback groups when no DB groups are configured
// BR is pre-defined (fixed members). SA has NO pre-defined members —
// its members are populated dynamically from the imported spreadsheet
// (all leagues not in BR).
export const FALLBACK_GROUPS: MetaGroupData[] = [
  {
    id: "fallback-br",
    name: "BR",
    metaPercent: 60,
    isActive: true,
    members: [
      { superUnionId: 1675, displayName: "Evolution 1", fallbackPercent: 60 },
      { superUnionId: 1765, displayName: "Evolution 2", fallbackPercent: 0 },
      { superUnionId: 2101, displayName: "Evolution 3", fallbackPercent: 0 },
      { superUnionId: 2448, displayName: "Evolution 4", fallbackPercent: 0 },
    ],
    timeSlots: [],
  },
  {
    id: "fallback-sa",
    name: "SA",
    metaPercent: 40,
    isActive: true,
    members: [],
    timeSlots: [],
  },
];
