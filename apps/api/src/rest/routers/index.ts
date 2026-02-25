import { OpenAPIHono } from "@hono/zod-openapi";
import { protectedMiddleware } from "../middleware";
import { bankAccountsRouter } from "./bank-accounts";
import { chatRouter } from "./chat";
import { customersRouter } from "./customers";
import { documentsRouter } from "./documents";
import { inboxRouter } from "./inbox";
import { infinitepaySettingsRouter } from "./infinitepay-settings";
import { infinitepayWebhookRouter } from "./infinitepay-webhook";
import { invoicesRouter } from "./invoices";
import { nanobotRouter } from "./nanobot";
import { notificationsRouter } from "./notifications";
import oauthRouter from "./oauth";
import { paymentOrdersRouter } from "./payment-orders";
import { reportsRouter } from "./reports";
import { searchRouter } from "./search";
import { tagsRouter } from "./tags";
import { teamsRouter } from "./teams";
import { trackerEntriesRouter } from "./tracker-entries";
import { trackerProjectsRouter } from "./tracker-projects";
import { transactionsRouter } from "./transactions";
import { transcriptionRouter } from "./transcription";
import { usersRouter } from "./users";

const routers = new OpenAPIHono();

// Mount OAuth routes first (publicly accessible)
routers.route("/oauth", oauthRouter);

// Mount public webhook (InfinitePay calls this — no auth)
routers.route("/infinitepay/webhook", infinitepayWebhookRouter);

// Mount API-key authenticated routes (before protected middleware)
routers.route("/payment-orders", paymentOrdersRouter);
routers.route("/infinitepay-settings", infinitepaySettingsRouter);

// Apply protected middleware to all subsequent routes
routers.use(...protectedMiddleware);

// Mount protected routes
routers.route("/notifications", notificationsRouter);
routers.route("/transactions", transactionsRouter);
routers.route("/teams", teamsRouter);
routers.route("/users", usersRouter);
routers.route("/customers", customersRouter);
routers.route("/bank-accounts", bankAccountsRouter);
routers.route("/tags", tagsRouter);
routers.route("/documents", documentsRouter);
routers.route("/inbox", inboxRouter);
routers.route("/invoices", invoicesRouter);
routers.route("/search", searchRouter);
routers.route("/reports", reportsRouter);
routers.route("/tracker-projects", trackerProjectsRouter);
routers.route("/tracker-entries", trackerEntriesRouter);
routers.route("/chat", chatRouter);
routers.route("/nanobot", nanobotRouter);
routers.route("/transcription", transcriptionRouter);

export { routers };
