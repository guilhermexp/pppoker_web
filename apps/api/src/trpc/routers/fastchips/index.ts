import { createTRPCRouter } from "../../init";
import { fastchipsImportsRouter } from "./imports";
import { fastchipsMembersRouter } from "./members";
import { fastchipsOperationsRouter } from "./operations";
import { fastchipsPaymentOrdersRouter } from "./payment-orders";

export const fastchipsRouter = createTRPCRouter({
  imports: fastchipsImportsRouter,
  operations: fastchipsOperationsRouter,
  members: fastchipsMembersRouter,
  paymentOrders: fastchipsPaymentOrdersRouter,
});
