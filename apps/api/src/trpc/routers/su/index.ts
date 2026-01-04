import { createTRPCRouter } from "../../init";
import { suAnalyticsRouter } from "./analytics";
import { suImportsRouter } from "./imports";
import { suSettlementsRouter } from "./settlements";
import { suWeekPeriodsRouter } from "./week-periods";

export const suRouter = createTRPCRouter({
  analytics: suAnalyticsRouter,
  imports: suImportsRouter,
  settlements: suSettlementsRouter,
  weekPeriods: suWeekPeriodsRouter,
});
