import {
  getLegacyToolManifest,
  invokeLegacyTool,
} from "@api/ai/runtime/legacy-tool-gateway";
import { createAdminClient } from "@api/services/supabase";
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
const PPPOKER_BRIDGE_URL =
  process.env.PPPOKER_BRIDGE_URL || "http://localhost:8000";

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

const pppokerChipActionSchema = z.object({
  target_id: z.number().int().positive().optional(),
  targetPlayerId: z.number().int().positive().optional(),
  amount: z.number().int().positive(),
  liga_id: z.number().int().positive().optional(),
  ligaId: z.number().int().positive().optional(),
  order_nsu: z.string().min(1).optional(),
  orderNsu: z.string().min(1).optional(),
  player_nome: z.string().optional(),
  playerNome: z.string().optional(),
});

async function getPppokerBridgeCredentials(teamId: string) {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("pppoker_club_connections")
    .select("club_id, pppoker_username, pppoker_password")
    .eq("team_id", teamId)
    .in("sync_status", ["active", "error"])
    .limit(1)
    .single();

  if (!data) {
    throw new Error(
      "Nenhuma conexao PPPoker encontrada para este time. Refaca o login PPPoker.",
    );
  }

  return data;
}

async function ensureFastchipsMember(
  teamId: string,
  targetPlayerId: number,
  playerName?: string,
) {
  const supabase = await createAdminClient();
  const pppokerId = String(targetPlayerId);

  const { data: existing } = await supabase
    .from("fastchips_members")
    .select("id, name")
    .eq("team_id", teamId)
    .eq("pppoker_id", pppokerId)
    .maybeSingle();

  if (existing?.id) {
    return { id: existing.id, name: existing.name ?? playerName ?? pppokerId };
  }

  const fallbackName = playerName?.trim() || `UID ${pppokerId}`;

  await supabase.from("fastchips_members").upsert(
    {
      team_id: teamId,
      name: fallbackName,
      pppoker_id: pppokerId,
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "team_id,pppoker_id" },
  );

  const { data: created } = await supabase
    .from("fastchips_members")
    .select("id, name")
    .eq("team_id", teamId)
    .eq("pppoker_id", pppokerId)
    .maybeSingle();

  if (!created?.id) return null;
  return { id: created.id, name: created.name ?? fallbackName };
}

async function tryRegisterFastchipsOperation(params: {
  teamId: string;
  toolName: "enviar_fichas" | "sacar_fichas";
  targetPlayerId: number;
  amount: number;
  orderNsu?: string;
  playerName?: string;
}) {
  try {
    const member = await ensureFastchipsMember(
      params.teamId,
      params.targetPlayerId,
      params.playerName,
    );
    if (!member?.id) return;

    const supabase = await createAdminClient();
    const operationType =
      params.toolName === "enviar_fichas" ? "saida" : "entrada";
    const purpose = params.toolName === "enviar_fichas" ? "pagamento" : "saque";

    await supabase.from("fastchips_operations").insert({
      team_id: params.teamId,
      external_id: `nanobot_${params.toolName}_${params.targetPlayerId}_${Date.now()}`,
      payment_id: params.orderNsu ?? null,
      occurred_at: new Date().toISOString(),
      operation_type: operationType,
      purpose,
      member_id: member.id,
      member_name: member.name,
      pppoker_id: String(params.targetPlayerId),
      gross_amount: params.amount,
      net_amount: params.amount,
      fee_rate: 0,
      fee_amount: 0,
    });
  } catch (error) {
    console.warn(
      "[nanobot/tools/invoke] failed to register fastchips operation",
      error,
    );
  }
}

async function tryMarkPaymentOrderAsDelivered(
  teamId: string,
  orderNsu: string | undefined,
) {
  if (!orderNsu) return;
  try {
    const supabase = await createAdminClient();
    await supabase
      .from("fastchips_payment_orders")
      .update({
        status: "fichas_enviadas",
        fichas_enviadas_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("team_id", teamId)
      .eq("order_nsu", orderNsu);
  } catch (error) {
    console.warn(
      "[nanobot/tools/invoke] failed to mark payment order as delivered",
      error,
    );
  }
}

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
    engine: (process.env.CHAT_AGENT_ENGINE ?? "nanobot").toLowerCase(),
    nanobot: {
      baseUrl: process.env.NANOBOT_BASE_URL ?? null,
      chatPath: process.env.NANOBOT_CHAT_PATH ?? "/api/chat",
      fallbackToLegacy:
        (process.env.NANOBOT_FALLBACK_TO_LEGACY ?? "false").toLowerCase() ===
        "true",
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

    if (
      parsed.data.toolName === "enviar_fichas" ||
      parsed.data.toolName === "sacar_fichas"
    ) {
      const chipParsed = pppokerChipActionSchema.safeParse(
        parsed.data.input && typeof parsed.data.input === "object"
          ? parsed.data.input
          : {},
      );

      if (!chipParsed.success) {
        return c.json({ success: false, error: chipParsed.error }, 400);
      }

      const targetPlayerId =
        chipParsed.data.target_id ?? chipParsed.data.targetPlayerId;
      if (!targetPlayerId) {
        return c.json(
          {
            success: false,
            error: "target_id (ou targetPlayerId) e obrigatorio",
          },
          400,
        );
      }

      const ligaId = chipParsed.data.liga_id ?? chipParsed.data.ligaId ?? 3357;
      const orderNsu = chipParsed.data.order_nsu ?? chipParsed.data.orderNsu;
      const playerName = chipParsed.data.player_nome ?? chipParsed.data.playerNome;
      const creds = await getPppokerBridgeCredentials(teamId);
      const bridgePath =
        parsed.data.toolName === "enviar_fichas"
          ? "chips/send"
          : "chips/withdraw";

      const bridgeResp = await fetch(
        `${PPPOKER_BRIDGE_URL}/clubs/${creds.club_id}/${bridgePath}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PPPoker-Username": creds.pppoker_username,
            "X-PPPoker-Password": creds.pppoker_password,
          },
          body: JSON.stringify({
            target_player_id: targetPlayerId,
            amount: chipParsed.data.amount,
            liga_id: ligaId,
          }),
        },
      );

      const bridgeJson = await bridgeResp
        .json()
        .catch(() => ({ success: false, error: "Bridge response invalida" }));
      if (!bridgeResp.ok || !bridgeJson?.success) {
        return c.json(
          {
            success: false,
            error:
              bridgeJson?.error ||
              bridgeJson?.detail ||
              `Falha PPPoker bridge (${bridgeResp.status})`,
          },
          502,
        );
      }

      await tryRegisterFastchipsOperation({
        teamId,
        toolName: parsed.data.toolName,
        targetPlayerId,
        amount: chipParsed.data.amount,
        orderNsu,
        playerName,
      });

      if (parsed.data.toolName === "enviar_fichas") {
        await tryMarkPaymentOrderAsDelivered(teamId, orderNsu);
      }

      return c.json({
        success: true,
        toolName: parsed.data.toolName,
        yielded: [],
        output:
          bridgeJson?.message ??
          (parsed.data.toolName === "enviar_fichas"
            ? "Fichas enviadas com sucesso."
            : "Saque de fichas executado com sucesso."),
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
