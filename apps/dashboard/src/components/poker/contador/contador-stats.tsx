"use client";

import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import type { ClubInfo, LiveMember } from "./types";
import { formatBalance } from "./types";

export interface ContadorStatsProps {
  members: LiveMember[];
  clubInfo?: ClubInfo;
  loggedInUid?: number;
}

export function ContadorStats({
  members,
  clubInfo,
  loggedInUid,
}: ContadorStatsProps) {
  const loggedInMember = loggedInUid
    ? members.find((m) => m.uid === loggedInUid)
    : undefined;
  const meuSaldo = loggedInMember?.saldo_caixa ?? 0;

  const fichasDisponiveis = clubInfo?.fichasDisponiveis ?? 0;
  const totalFichasPP = members.reduce(
    (sum, m) => sum + (m.saldo_caixa ?? 0),
    0,
  );

  const stats = [
    {
      label: "Fichas disponíveis",
      sublabel: "Caixa do clube",
      value: formatBalance(fichasDisponiveis),
      icon: Icons.Currency,
      color: fichasDisponiveis > 0 ? "text-green-600" : "text-muted-foreground",
    },
    {
      label: "Meu saldo",
      sublabel: loggedInMember?.nome ?? "Usuário logado",
      value: formatBalance(meuSaldo),
      icon: Icons.Customers,
      color:
        meuSaldo > 0
          ? "text-green-600"
          : meuSaldo < 0
            ? "text-red-600"
            : "text-muted-foreground",
    },
    {
      label: "Saldo agentes",
      sublabel: "Caixa dos agentes/gestores",
      value: formatBalance(totalFichasPP),
      icon: Icons.TrendingUp,
      color: totalFichasPP >= 0 ? "text-blue-600" : "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col items-center rounded-lg border bg-muted/40 px-2 py-2"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary mb-1">
            <s.icon className="h-3 w-3" />
          </span>
          <p
            className={cn("font-mono text-sm font-semibold leading-tight", s.color)}
          >
            {s.value}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}
