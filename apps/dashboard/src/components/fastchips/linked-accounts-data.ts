export type FastChipsLinkedAccountStatus = "active" | "inactive";
export type FastChipsLinkedAccountRestriction = "auto_withdraw" | "blocked" | null;

export type FastChipsLinkedAccount = {
  id: string;
  name: string;
  playerId: string;
  phone: string;
  date: string;
  status: FastChipsLinkedAccountStatus | null;
  restriction: FastChipsLinkedAccountRestriction;
};

export const fastChipsLinkedAccounts: FastChipsLinkedAccount[] = [
  {
    id: "la-1",
    name: "Fabricio Fialho Rodrigues",
    playerId: "5675796",
    phone: "(11) 93776-2827",
    date: "5/7/25",
    status: null,
    restriction: null,
  },
  {
    id: "la-2",
    name: "Rodrigo Costa de Andrade",
    playerId: "8137917",
    phone: "(71) 99622-1604",
    date: "20/5/25",
    status: null,
    restriction: null,
  },
  {
    id: "la-3",
    name: "thyago jose pacheco",
    playerId: "11768073",
    phone: "(42) 99115-1313",
    date: "19/4/25",
    status: null,
    restriction: null,
  },
  {
    id: "la-4",
    name: "Roberth Figner Alves lima",
    playerId: "11751561",
    phone: "(99) 98492-2041",
    date: "18/4/25",
    status: "active",
    restriction: "auto_withdraw",
  },
  {
    id: "la-5",
    name: "Lucivan Klebson Camara da Silva",
    playerId: "7700471",
    phone: "(84) 99659-8601",
    date: "13/4/25",
    status: "active",
    restriction: "auto_withdraw",
  },
  {
    id: "la-6",
    name: "tiago peres milhomem",
    playerId: "8816619",
    phone: "(63) 99987-2505",
    date: "11/4/25",
    status: "active",
    restriction: "auto_withdraw",
  },
  {
    id: "la-7",
    name: "hycktogaras Monteiro Ferreira de Barros",
    playerId: "11613801",
    phone: "(97) 98407-9903",
    date: "10/4/25",
    status: "active",
    restriction: "auto_withdraw",
  },
  {
    id: "la-8",
    name: "Ikaro Souza",
    playerId: "11410037",
    phone: "(67) 99245-5105",
    date: "8/4/25",
    status: "active",
    restriction: "auto_withdraw",
  },
  {
    id: "la-9",
    name: "henri andre bohrer cecon",
    playerId: "11485868",
    phone: "(49) 99830-0900",
    date: "1/4/25",
    status: "active",
    restriction: "auto_withdraw",
  },
];
