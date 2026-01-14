export type FastChipsTransactionStatus = "completed" | "unpaid";

export type FastChipsTransaction = {
  id: string;
  name: string;
  playerId: string;
  date: string;
  time: string;
  chips: number;
  amount: string;
  status: FastChipsTransactionStatus;
  email: string;
  phone: string;
};

export const fastChipsTransactions: FastChipsTransaction[] = [
  {
    id: "tx-1",
    name: "pedro vanzan",
    playerId: "11364992",
    date: "23/7/25",
    time: "15:37",
    chips: 30,
    amount: "R$ 30,00",
    status: "completed",
    email: "pv.vanzan@gmail.com",
    phone: "(16) 99733-2803",
  },
  {
    id: "tx-2",
    name: "pedro vanzan",
    playerId: "11364992",
    date: "23/7/25",
    time: "15:35",
    chips: 20,
    amount: "R$ 20,00",
    status: "completed",
    email: "pv.vanzan@gmail.com",
    phone: "(16) 99733-2803",
  },
  {
    id: "tx-3",
    name: "Marcio Leandro da Rosa Tobin",
    playerId: "11275639",
    date: "21/7/25",
    time: "09:00",
    chips: 10,
    amount: "R$ 10,00",
    status: "completed",
    email: "marcio.tobin@gmail.com",
    phone: "(16) 99111-2233",
  },
  {
    id: "tx-4",
    name: "Kleber Nascimento",
    playerId: "5307742",
    date: "13/7/25",
    time: "22:25",
    chips: 108,
    amount: "R$ 108,00",
    status: "unpaid",
    email: "kleber.nascimento@gmail.com",
    phone: "(16) 99876-4321",
  },
  {
    id: "tx-5",
    name: "Charles Espindola",
    playerId: "6335551",
    date: "9/7/25",
    time: "19:10",
    chips: 30,
    amount: "R$ 30,00",
    status: "completed",
    email: "charles.espindola@gmail.com",
    phone: "(16) 99700-1122",
  },
  {
    id: "tx-6",
    name: "Charles Espindola",
    playerId: "6335551",
    date: "9/7/25",
    time: "19:04",
    chips: 20,
    amount: "R$ 20,00",
    status: "completed",
    email: "charles.espindola@gmail.com",
    phone: "(16) 99700-1122",
  },
  {
    id: "tx-7",
    name: "igor Israel pirez da Silva",
    playerId: "7009595",
    date: "6/7/25",
    time: "12:08",
    chips: 150,
    amount: "R$ 150,00",
    status: "completed",
    email: "igor.pirez@gmail.com",
    phone: "(16) 99655-8899",
  },
  {
    id: "tx-8",
    name: "Marcus Vinicius Rodrigues da Silva",
    playerId: "4156269",
    date: "5/7/25",
    time: "20:35",
    chips: 100,
    amount: "R$ 100,00",
    status: "completed",
    email: "marcus.vinicius@gmail.com",
    phone: "(16) 99444-6677",
  },
];
