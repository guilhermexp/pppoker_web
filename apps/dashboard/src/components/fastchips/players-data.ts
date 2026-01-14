export type FastChipsPlayer = {
  id: string;
  playerId: string;
  name: string;
  linkedAt: string;
  totalLinkedAccounts: number;
};

export type FastChipsPlayerLinkedAccount = {
  id: string;
  name: string;
  playerId: string;
  status: "active" | "inactive";
  restriction: "auto_withdraw" | "blocked";
};

export const fastChipsPlayers: FastChipsPlayer[] = [
  {
    id: "p-1",
    playerId: "5675796",
    name: "Fabricio Fialho Rodrigues",
    linkedAt: "05/07/25",
    totalLinkedAccounts: 2,
  },
  {
    id: "p-2",
    playerId: "8137917",
    name: "Rodrigo Costa de Andrade",
    linkedAt: "20/05/25",
    totalLinkedAccounts: 1,
  },
  {
    id: "p-3",
    playerId: "11768073",
    name: "thyago jose pacheco",
    linkedAt: "19/04/25",
    totalLinkedAccounts: 1,
  },
  {
    id: "p-4",
    playerId: "11751561",
    name: "Roberth Figner Alves lima",
    linkedAt: "18/04/25",
    totalLinkedAccounts: 1,
  },
  {
    id: "p-5",
    playerId: "7700471",
    name: "Lucivan Klebson Camara da Silva",
    linkedAt: "13/04/25",
    totalLinkedAccounts: 1,
  },
  {
    id: "p-6",
    playerId: "8816619",
    name: "tiago peres milhomem",
    linkedAt: "11/04/25",
    totalLinkedAccounts: 1,
  },
  {
    id: "p-7",
    playerId: "11410037",
    name: "Ikaro Souza",
    linkedAt: "08/04/25",
    totalLinkedAccounts: 1,
  },
  {
    id: "p-8",
    playerId: "11485868",
    name: "henri andre bohrer cecon",
    linkedAt: "01/04/25",
    totalLinkedAccounts: 1,
  },
  {
    id: "p-9",
    playerId: "11485868",
    name: "Lucas Farlley Brandao Miranda",
    linkedAt: "01/04/25",
    totalLinkedAccounts: 1,
  },
];

export const fastChipsPlayerLinkedAccounts: Record<
  string,
  FastChipsPlayerLinkedAccount[]
> = {
  "p-1": [
    {
      id: "la-1",
      name: "Fabricio",
      playerId: "5675796",
      status: "active",
      restriction: "auto_withdraw",
    },
    {
      id: "la-2",
      name: "Fabricio",
      playerId: "5675796",
      status: "active",
      restriction: "blocked",
    },
  ],
  "p-2": [
    {
      id: "la-3",
      name: "Rodrigo",
      playerId: "8137917",
      status: "active",
      restriction: "auto_withdraw",
    },
  ],
  "p-3": [
    {
      id: "la-4",
      name: "thyago",
      playerId: "11768073",
      status: "inactive",
      restriction: "blocked",
    },
  ],
  "p-4": [
    {
      id: "la-5",
      name: "Roberth",
      playerId: "11751561",
      status: "active",
      restriction: "auto_withdraw",
    },
  ],
  "p-5": [
    {
      id: "la-6",
      name: "Lucivan",
      playerId: "7700471",
      status: "active",
      restriction: "auto_withdraw",
    },
  ],
  "p-6": [
    {
      id: "la-7",
      name: "tiago",
      playerId: "8816619",
      status: "active",
      restriction: "auto_withdraw",
    },
  ],
  "p-7": [
    {
      id: "la-8",
      name: "Ikaro",
      playerId: "11410037",
      status: "active",
      restriction: "auto_withdraw",
    },
  ],
  "p-8": [
    {
      id: "la-9",
      name: "henri",
      playerId: "11485868",
      status: "active",
      restriction: "auto_withdraw",
    },
  ],
  "p-9": [
    {
      id: "la-10",
      name: "Lucas",
      playerId: "11485868",
      status: "active",
      restriction: "auto_withdraw",
    },
  ],
};
