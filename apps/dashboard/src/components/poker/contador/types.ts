// ---------------------------------------------------------------------------
// Types (matches bridge /clubs/{id}/members response)
// ---------------------------------------------------------------------------

export type LiveMember = {
  uid: number;
  nome: string;
  papel_num: number;
  papel: string;
  avatar_url: string;
  join_ts: number;
  last_active_ts: number;
  titulo: string;
  online: boolean;
  saldo_caixa: number | null;
  credito_linha: number;
  agente_uid: number | null;
  agente_nome: string;
  super_agente_uid: number | null;
  super_agente_nome: string;
};

// ---------------------------------------------------------------------------
// Types for club info
// ---------------------------------------------------------------------------

export type ClubInfo = {
  fichasDisponiveis?: number;
  clubName?: string;
  ownerName?: string;
  totalMembers?: number;
};

// ---------------------------------------------------------------------------
// Transaction type
// ---------------------------------------------------------------------------

export type Transaction = {
  id: string;
  occurredAt: string;
  type: string;
  sender: {
    id: string;
    nickname: string;
    memoName: string | null;
    ppPokerId: string | null;
  } | null;
  recipient: {
    id: string;
    nickname: string;
    memoName: string | null;
    ppPokerId: string | null;
  } | null;
  amount: number;
  creditSent: number;
  creditRedeemed: number;
  chipsSent: number;
  chipsRedeemed: number;
  note: string | null;
};

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

export const ROLE_COLORS: Record<string, string> = {
  Dono: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Gestor: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  "Super Agente": "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  Agente: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  Membro: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
};

export const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  credit_given: {
    label: "Crédito dado",
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  },
  credit_received: {
    label: "Crédito recebido",
    color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  },
  credit_paid: {
    label: "Crédito pago",
    color: "bg-green-500/15 text-green-700 dark:text-green-400",
  },
  buy_in: {
    label: "Buy-in",
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  cash_out: {
    label: "Cash-out",
    color: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  },
  transfer_in: {
    label: "Recebimento",
    color: "bg-green-500/15 text-green-700 dark:text-green-400",
  },
  transfer_out: {
    label: "Envio",
    color: "bg-red-500/15 text-red-700 dark:text-red-400",
  },
  rake: {
    label: "Rake",
    color: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  },
  agent_commission: {
    label: "Comissão",
    color: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  },
  rakeback: {
    label: "Rakeback",
    color: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  },
  jackpot: {
    label: "Jackpot",
    color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  },
  adjustment: {
    label: "Ajuste",
    color: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
  },
};

export function formatBalance(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
