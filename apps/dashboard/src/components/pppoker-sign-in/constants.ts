export const ROLE_LABELS: Record<string, string> = {
  dono: "Dono",
  gestor: "Gestor",
  super_agente: "Super Agente",
  agente: "Agente",
  membro: "Membro",
};

export const ROLE_STYLES: Record<string, { dot: string; text: string }> = {
  dono: { dot: "bg-yellow-400", text: "text-yellow-400" },
  gestor: { dot: "bg-blue-400", text: "text-blue-400" },
  super_agente: { dot: "bg-purple-400", text: "text-purple-400" },
  agente: { dot: "bg-green-400", text: "text-green-400" },
  membro: { dot: "bg-zinc-500", text: "text-zinc-500" },
};

export const LAST_CLUB_KEY = "pppoker_last_club_id";

export function getLastClubId(): number | null {
  try {
    const val = localStorage.getItem(LAST_CLUB_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

export function saveLastClubId(clubId: number) {
  try {
    localStorage.setItem(LAST_CLUB_KEY, String(clubId));
  } catch {
    // ignore
  }
}

export function canManageClub(role: string): boolean {
  return role === "dono" || role === "gestor";
}

export const inputClassName =
  "w-full bg-[#0e0e0e] border border-white/10 text-white font-sans font-medium text-sm h-[40px] px-4 hover:border-white/20 transition-colors placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 rounded-none";
