import { createTRPCRouter } from "../../init";
import { fastchipsImportsRouter } from "./imports";
import { fastchipsMembersRouter } from "./members";
import { fastchipsOperationsRouter } from "./operations";

export const fastchipsRouter = createTRPCRouter({
  imports: fastchipsImportsRouter,
  operations: fastchipsOperationsRouter,
  members: fastchipsMembersRouter,
});
