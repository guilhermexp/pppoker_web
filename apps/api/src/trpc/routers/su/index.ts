import { createTRPCRouter } from "../../init";
import { suAnalyticsRouter } from "./analytics";
import { suImportsRouter } from "./imports";
import { suMetasRouter } from "./metas";
import { suSettlementsRouter } from "./settlements";
import { suTournamentAnalysesRouter } from "./tournament-analyses";
import { suWeekPeriodsRouter } from "./week-periods";

export const suRouter = createTRPCRouter({
  analytics: suAnalyticsRouter,
  imports: suImportsRouter,
  metas: suMetasRouter,
  settlements: suSettlementsRouter,
  tournamentAnalyses: suTournamentAnalysesRouter,
  weekPeriods: suWeekPeriodsRouter,
});
