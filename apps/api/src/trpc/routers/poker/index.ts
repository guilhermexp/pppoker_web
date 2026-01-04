import { createTRPCRouter } from "../../init";
import { pokerAnalyticsRouter } from "./analytics";
import { pokerImportsRouter } from "./imports";
import { pokerPlayersRouter } from "./players";
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
  transactions: pokerTransactionsRouter,
  weekPeriods: pokerWeekPeriodsRouter,
});
