import { createTRPCRouter } from "../../init";
import { pokerAnalyticsRouter } from "./analytics";
import { pokerImportsRouter } from "./imports";
import { pokerPlayersRouter } from "./players";
import { pokerSessionsRouter } from "./sessions";
import { pokerSettlementsRouter } from "./settlements";

export const pokerRouter = createTRPCRouter({
  players: pokerPlayersRouter,
  sessions: pokerSessionsRouter,
  settlements: pokerSettlementsRouter,
  imports: pokerImportsRouter,
  analytics: pokerAnalyticsRouter,
});
