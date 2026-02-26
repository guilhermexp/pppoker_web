import { buildAppContext } from "@api/ai/runtime/app-context";
import { nanobotToUIMessageStream } from "@api/ai/runtime/nanobot";
import { getNanobotSettingsForTeam } from "@api/ai/runtime/nanobot-team-settings";
import { getUserContext } from "@api/ai/utils/get-user-context";
import type { Context } from "@api/rest/types";
import { chatRequestSchema } from "@api/schemas/chat";
import { OpenAPIHono } from "@hono/zod-openapi";
import { withRequiredScope } from "../middleware";

const app = new OpenAPIHono<Context>();

app.post("/", withRequiredScope("chat.write"), async (c) => {
  const body = await c.req.json();
  const validationResult = chatRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return c.json({ success: false, error: validationResult.error }, 400);
  }

  const { message, messages, id, timezone, agentChoice, toolChoice, country, city } =
    validationResult.data;

  const teamId = c.get("teamId");
  const session = c.get("session");
  const userId = session.user.id;
  const db = c.get("db");

  const userContext = await getUserContext({
    db,
    userId,
    teamId,
    country,
    city,
    timezone,
  });

  const appContext = buildAppContext(userContext, id);
  const nanobotConfig = await getNanobotSettingsForTeam(teamId);
  if (nanobotConfig) {
    appContext.nanobotConfig = nanobotConfig;
  }
  if (messages) {
    appContext.messages = messages;
  }

  return nanobotToUIMessageStream({
    message,
    strategy: "auto",
    maxRounds: 5,
    maxSteps: 20,
    context: appContext,
    agentChoice,
    toolChoice,
  });
});

export { app as chatRouter };
