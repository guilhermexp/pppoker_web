export type FastChipsMovementType = "entry" | "exit";
export type FastChipsMovementStatus = "completed" | "pending";

export type FastChipsMovement = {
  id: string;
  playerId: string;
  date: string;
  time: string;
  amount: string;
  type: FastChipsMovementType;
  status: FastChipsMovementStatus;
  paymentId: string;
  purpose: string;
  grossAmount: string;
  netAmount: string;
  fee: string;
  payer: string;
};

export const fastChipsMovements: FastChipsMovement[] = [
  {
    id: "mv-1",
    playerId: "11385474",
    date: "31/1/25",
    time: "23:01",
    amount: "R$ 100,00",
    type: "entry",
    status: "completed",
    paymentId: "e00416968202502010201jiuog7ev1ww3",
    purpose: "Recebimento",
    grossAmount: "R$ 100,00",
    netAmount: "R$ 99,50",
    fee: "R$ 0,50",
    payer: "Rodrigo Alves de Jesus",
  },
  {
    id: "mv-2",
    playerId: "7009595",
    date: "31/1/25",
    time: "22:37",
    amount: "R$ 100,00",
    type: "entry",
    status: "completed",
    paymentId: "e00416968202502010201hu9k8ze1qq1",
    purpose: "Recebimento",
    grossAmount: "R$ 100,00",
    netAmount: "R$ 99,50",
    fee: "R$ 0,50",
    payer: "Igor Israel",
  },
  {
    id: "mv-3",
    playerId: "4156269",
    date: "31/1/25",
    time: "21:14",
    amount: "R$ 80,00",
    type: "entry",
    status: "completed",
    paymentId: "e00416968202502010201as7j3k1lv5s",
    purpose: "Recebimento",
    grossAmount: "R$ 80,00",
    netAmount: "R$ 79,60",
    fee: "R$ 0,40",
    payer: "Marcus Vinicius",
  },
  {
    id: "mv-4",
    playerId: "11751561",
    date: "30/1/25",
    time: "20:10",
    amount: "R$ 50,00",
    type: "exit",
    status: "completed",
    paymentId: "e00416968202502010201bb2p5xd9p0z",
    purpose: "Resgate",
    grossAmount: "R$ 50,00",
    netAmount: "R$ 49,50",
    fee: "R$ 0,50",
    payer: "Roberth Alves",
  },
];
