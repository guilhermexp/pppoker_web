import {
  getLegacyToolManifest,
  invokeLegacyTool,
} from "@api/ai/runtime/legacy-tool-gateway";
import {
  addNanobotCronJob,
  dispatchNanobotCronJob,
  dispatchNanobotSubagentTask,
  enqueueNanobotSubagentTask,
  getNanobotSubagentTask,
  listNanobotCronJobs,
  parseNanobotCronScheduleRequest,
  removeNanobotCronJob,
} from "@api/ai/runtime/nanobot-orchestration";
import type { Context } from "@api/rest/types";
import { OpenAPIHono, z } from "@hono/zod-openapi";
import { withRequiredScope } from "../middleware";

const app = new OpenAPIHono<Context>();

const nanobotOrchestrationTools = [
  {
    name: "cron",
    description:
      "Schedule reminders and recurring tasks. Actions: add, list, remove.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["add", "list", "remove"] },
        message: { type: "string" },
        every_seconds: { type: "integer" },
        cron_expr: { type: "string" },
        tz: { type: "string" },
        at: { type: "string" },
        job_id: { type: "string" },
      },
      required: ["action"],
    },
  },
  {
    name: "spawn",
    description:
      "Spawn a background subagent task handled by Trigger.dev and report results back asynchronously.",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "string" },
        label: { type: "string" },
      },
      required: ["task"],
    },
  },
] as const;

const invokeToolSchema = z.object({
  toolName: z.string(),
  input: z.unknown().optional(),
  chatId: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
});

const internalDispatchSchema = z.object({
  teamId: z.string(),
  jobId: z.string().optional(),
  taskId: z.string().optional(),
});

const cronToolActionSchema = z.object({
  action: z.enum(["add", "list", "remove"]),
  message: z.string().optional(),
  every_seconds: z.number().int().positive().optional(),
  cron_expr: z.string().optional(),
  tz: z.string().optional(),
  timezone: z.string().optional(),
  at: z.string().optional(),
  job_id: z.string().optional(),
  chatId: z.string().optional(),
  channel: z.string().optional(),
});

const spawnToolActionSchema = z.object({
  task: z.string().min(1),
  label: z.string().optional(),
  chatId: z.string().optional(),
  channel: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional(),
});

function isValidInternalToken(c: Context) {
  const expected = process.env.NANOBOT_ORCHESTRATION_INTERNAL_TOKEN?.trim();
  if (!expected) return false;
  const authHeader = c.req.header("authorization") ?? "";
  return authHeader === `Bearer ${expected}`;
}

app.get("/health", withRequiredScope("chat.write"), async (c) => {
  const tools = getLegacyToolManifest();
  return c.json({
    success: true,
    engine: (process.env.CHAT_AGENT_ENGINE ?? "legacy").toLowerCase(),
    nanobot: {
      baseUrl: process.env.NANOBOT_BASE_URL ?? null,
      chatPath: process.env.NANOBOT_CHAT_PATH ?? "/api/chat",
      fallbackToLegacy:
        (process.env.NANOBOT_FALLBACK_TO_LEGACY ?? "true").toLowerCase() !==
        "false",
      configured: Boolean(process.env.NANOBOT_BASE_URL),
      orchestration: {
        callbackUrl:
          process.env.NANOBOT_ORCHESTRATION_CALLBACK_URL ??
          process.env.API_URL ??
          process.env.NEXT_PUBLIC_API_URL ??
          null,
        hasInternalToken: Boolean(
          process.env.NANOBOT_ORCHESTRATION_INTERNAL_TOKEN,
        ),
        triggerCronTaskId: "nanobot-cron-dispatch",
        triggerSubagentTaskId: "nanobot-subagent-run",
      },
    },
    tools: {
      total: tools.length + nanobotOrchestrationTools.length,
    },
  });
});

app.get("/tools", withRequiredScope("chat.write"), async (c) => {
  return c.json({
    success: true,
    tools: [...nanobotOrchestrationTools, ...getLegacyToolManifest()],
  });
});

app.post("/tools/invoke", withRequiredScope("chat.write"), async (c) => {
  const body = await c.req.json();
  const parsed = invokeToolSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error }, 400);
  }

  const db = c.get("db");
  const teamId = c.get("teamId");
  const session = c.get("session");

  try {
    if (parsed.data.toolName === "cron") {
      const cronParsed = cronToolActionSchema.safeParse({
        ...(parsed.data.input && typeof parsed.data.input === "object"
          ? parsed.data.input
          : {}),
        chatId: parsed.data.chatId,
        country: parsed.data.country,
        city: parsed.data.city,
        timezone: parsed.data.timezone,
      });

      if (!cronParsed.success) {
        return c.json({ success: false, error: cronParsed.error }, 400);
      }

      if (cronParsed.data.action === "list") {
        const jobs = await listNanobotCronJobs(teamId, cronParsed.data.chatId);
        return c.json({
          success: true,
          toolName: "cron",
          yielded: [],
          output: { jobs },
          uiChunks: [],
        });
      }

      if (cronParsed.data.action === "remove") {
        if (!cronParsed.data.job_id) {
          return c.json(
            { success: false, error: "job_id is required for remove" },
            400,
          );
        }
        const result = await removeNanobotCronJob(
          teamId,
          cronParsed.data.job_id,
        );
        return c.json({
          success: true,
          toolName: "cron",
          yielded: [],
          output: result,
          uiChunks: [],
        });
      }

      if (!cronParsed.data.message) {
        return c.json(
          { success: false, error: "message is required for add" },
          400,
        );
      }

      const schedule = parseNanobotCronScheduleRequest({
        every_seconds: cronParsed.data.every_seconds,
        cron_expr: cronParsed.data.cron_expr,
        tz: cronParsed.data.tz,
        at: cronParsed.data.at,
      });

      const job = await addNanobotCronJob({
        teamId,
        userId: session.user.id,
        chatId: cronParsed.data.chatId ?? `nanobot_${Date.now()}`,
        message: cronParsed.data.message,
        channel: cronParsed.data.channel,
        timezone: cronParsed.data.timezone ?? cronParsed.data.tz,
        schedule,
      });

      return c.json({
        success: true,
        toolName: "cron",
        yielded: [],
        output: { job },
        uiChunks: [],
      });
    }

    if (parsed.data.toolName === "spawn") {
      const spawnParsed = spawnToolActionSchema.safeParse({
        ...(parsed.data.input && typeof parsed.data.input === "object"
          ? parsed.data.input
          : {}),
        chatId: parsed.data.chatId,
        country: parsed.data.country,
        city: parsed.data.city,
        timezone: parsed.data.timezone,
      });

      if (!spawnParsed.success) {
        return c.json({ success: false, error: spawnParsed.error }, 400);
      }

      const task = await enqueueNanobotSubagentTask({
        teamId,
        userId: session.user.id,
        chatId: spawnParsed.data.chatId ?? `nanobot_${Date.now()}`,
        task: spawnParsed.data.task,
        label: spawnParsed.data.label,
        channel: spawnParsed.data.channel,
        country: spawnParsed.data.country,
        city: spawnParsed.data.city,
        timezone: spawnParsed.data.timezone,
      });

      return c.json({
        success: true,
        toolName: "spawn",
        yielded: [],
        output: {
          taskId: task.taskId,
          status: task.status,
          message: `Subagent [${task.label ?? task.task.slice(0, 30)}] started (id: ${task.taskId}).`,
        },
        uiChunks: [],
      });
    }

    const result = await invokeLegacyTool({
      db,
      teamId,
      userId: session.user.id,
      toolName: parsed.data.toolName,
      input: parsed.data.input,
      chatId: parsed.data.chatId ?? `nanobot_tool_${Date.now()}`,
      country: parsed.data.country,
      city: parsed.data.city,
      timezone: parsed.data.timezone,
    });

    return c.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json(
      {
        success: false,
        error: message,
        code: message.includes("BANK_ACCOUNT_REQUIRED")
          ? "BANK_ACCOUNT_REQUIRED"
          : "TOOL_EXECUTION_FAILED",
      },
      500,
    );
  }
});

app.post("/orchestration/cron", withRequiredScope("chat.write"), async (c) => {
  const body = await c.req.json();
  const parsed = cronToolActionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error }, 400);
  }

  const db = c.get("db");
  void db; // kept for parity with other nanobot gateway handlers
  const teamId = c.get("teamId");
  const session = c.get("session");

  try {
    if (parsed.data.action === "list") {
      const jobs = await listNanobotCronJobs(teamId, parsed.data.chatId);
      return c.json({ success: true, jobs });
    }

    if (parsed.data.action === "remove") {
      if (!parsed.data.job_id) {
        return c.json(
          { success: false, error: "job_id is required for remove" },
          400,
        );
      }
      const result = await removeNanobotCronJob(teamId, parsed.data.job_id);
      return c.json({ success: true, ...result });
    }

    if (!parsed.data.message) {
      return c.json(
        { success: false, error: "message is required for add" },
        400,
      );
    }

    const schedule = parseNanobotCronScheduleRequest({
      every_seconds: parsed.data.every_seconds,
      cron_expr: parsed.data.cron_expr,
      tz: parsed.data.tz,
      at: parsed.data.at,
    });

    const record = await addNanobotCronJob({
      teamId,
      userId: session.user.id,
      chatId: parsed.data.chatId ?? `nanobot_${Date.now()}`,
      message: parsed.data.message,
      channel: parsed.data.channel,
      timezone: parsed.data.timezone ?? parsed.data.tz,
      schedule,
    });

    return c.json({ success: true, job: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

app.post("/orchestration/spawn", withRequiredScope("chat.write"), async (c) => {
  const body = await c.req.json();
  const parsed = spawnToolActionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error }, 400);
  }

  const teamId = c.get("teamId");
  const session = c.get("session");

  try {
    const task = await enqueueNanobotSubagentTask({
      teamId,
      userId: session.user.id,
      chatId: parsed.data.chatId ?? `nanobot_${Date.now()}`,
      task: parsed.data.task,
      label: parsed.data.label,
      channel: parsed.data.channel,
      country: parsed.data.country,
      city: parsed.data.city,
      timezone: parsed.data.timezone,
    });

    return c.json({
      success: true,
      task,
      message: `Subagent [${task.label ?? task.task.slice(0, 30)}] started (id: ${task.taskId}).`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

app.get(
  "/orchestration/subagent/:taskId",
  withRequiredScope("chat.write"),
  async (c) => {
    const teamId = c.get("teamId");
    const taskId = c.req.param("taskId");
    const task = await getNanobotSubagentTask(teamId, taskId);
    if (!task) return c.json({ success: false, error: "Not found" }, 404);
    return c.json({ success: true, task });
  },
);

app.post("/orchestration/cron/dispatch", async (c) => {
  if (!isValidInternalToken(c)) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const parsed = internalDispatchSchema.safeParse(body);
  if (!parsed.success || !parsed.data.jobId) {
    return c.json(
      { success: false, error: "teamId and jobId are required" },
      400,
    );
  }

  try {
    const result = await dispatchNanobotCronJob({
      teamId: parsed.data.teamId,
      jobId: parsed.data.jobId,
    });
    return c.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

app.post("/orchestration/subagent/dispatch", async (c) => {
  if (!isValidInternalToken(c)) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const parsed = internalDispatchSchema.safeParse(body);
  if (!parsed.success || !parsed.data.taskId) {
    return c.json(
      { success: false, error: "teamId and taskId are required" },
      400,
    );
  }

  try {
    const result = await dispatchNanobotSubagentTask({
      teamId: parsed.data.teamId,
      taskId: parsed.data.taskId,
    });
    return c.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ success: false, error: message }, 500);
  }
});

export { app as nanobotRouter };
