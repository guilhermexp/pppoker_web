import { createTRPCRouter } from "../../init";
import { pokerAnalyticsRouter } from "./analytics";
import { pokerClubDataRouter } from "./club-data";
import { pokerImportsRouter } from "./imports";
import { pokerMembersRouter } from "./members";
import { pokerPlayersRouter } from "./players";
import { pppokerRouter } from "./pppoker";
import { pokerRoomsRouter } from "./rooms";
import { pokerSessionsRouter } from "./sessions";
import { pokerSettlementsRouter } from "./settlements";
import { pokerTransactionsRouter } from "./transactions";
import { pokerWeekPeriodsRouter } from "./week-periods";

export const pokerRouter = createTRPCRouter({
  players: pokerPlayersRouter,
  sessions: pokerSessionsRouter,
  settlements: pokerSettlementsRouter,
  imports: pokerImportsRouter,
  analytics: pokerAnalyticsRouter,
  clubData: pokerClubDataRouter,
  transactions: pokerTransactionsRouter,
  weekPeriods: pokerWeekPeriodsRouter,
  pppoker: pppokerRouter,
  rooms: pokerRoomsRouter,
  members: pokerMembersRouter,
});
