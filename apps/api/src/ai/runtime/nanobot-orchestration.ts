import { getSharedRedisClient } from "@midpoker/cache/shared-redis";
import { runs, schedules, tasks } from "@trigger.dev/sdk";

type NanobotCronScheduleInput =
  | {
      kind: "every";
      everySeconds: number;
    }
  | {
      kind: "cron";
      cronExpr: string;
      timezone?: string;
    }
  | {
      kind: "at";
      at: string;
    };

export type NanobotCronAddInput = {
  teamId: string;
  userId: string;
  chatId: string;
  message: string;
  channel?: string;
  timezone?: string;
  schedule: NanobotCronScheduleInput;
};

export type NanobotSpawnInput = {
  teamId: string;
  userId: string;
  chatId: string;
  task: string;
  label?: string;
  channel?: string;
  country?: string;
  city?: string;
  timezone?: string;
};

type CronJobRecord = {
  kind: "cron";
  jobId: string;
  teamId: string;
  userId: string;
  chatId: string;
  message: string;
  channel?: string;
  timezone?: string;
  triggerMode: "schedule" | "delayed-run";
  triggerScheduleId?: string;
  triggerRunId?: string;
  cronExpr?: string;
  originalEverySeconds?: number;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "removed" | "executed" | "failed";
  lastRunAt?: string;
  lastError?: string;
};

type SubagentTaskRecord = {
  kind: "subagent";
  taskId: string;
  teamId: string;
  userId: string;
  chatId: string;
  task: string;
  label?: string;
  channel?: string;
  country?: string;
  city?: string;
  timezone?: string;
  triggerRunId?: string;
  createdAt: string;
  updatedAt: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  resultText?: string;
  lastError?: string;
};

const CRON_TASK_ID = "nanobot-cron-dispatch";
const CRON_ONCE_TASK_ID = "nanobot-cron-once-dispatch";
const SUBAGENT_TASK_ID = "nanobot-subagent-run";
const REDIS_PREFIX = "nanobot:orchestration";

function nowIso() {
  return new Date().toISOString();
}

function cronJobKey(teamId: string, jobId: string) {
  return `${REDIS_PREFIX}:cron:${teamId}:${jobId}`;
}

function cronIndexKey(teamId: string) {
  return `${REDIS_PREFIX}:cron:index:${teamId}`;
}

function subagentTaskKey(teamId: string, taskId: string) {
  return `${REDIS_PREFIX}:subagent:${teamId}:${taskId}`;
}

function subagentIndexKey(teamId: string) {
  return `${REDIS_PREFIX}:subagent:index:${teamId}`;
}

function cronExternalId(teamId: string, jobId: string) {
  return `nanobot-cron:${teamId}:${jobId}`;
}

function parseCronExternalId(externalId: string | undefined | null) {
  if (!externalId) return null;
  const parts = externalId.split(":");
  if (parts.length !== 3 || parts[0] !== "nanobot-cron") return null;
  return { teamId: parts[1]!, jobId: parts[2]! };
}

function buildInternalAuthHeaders() {
  const token = process.env.NANOBOT_ORCHESTRATION_INTERNAL_TOKEN?.trim();
  if (!token) return { "content-type": "application/json" } as HeadersInit;
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  } as HeadersInit;
}

function buildNanobotRuntimeHeaders() {
  const headers: HeadersInit = {
    "content-type": "application/json",
    accept: "text/event-stream, application/json, text/plain",
  };
  const apiKey = process.env.NANOBOT_API_KEY?.trim();
  if (apiKey) {
    (headers as Record<string, string>).authorization = `Bearer ${apiKey}`;
  }
  return headers;
}

function getOrchestrationCallbackBaseUrl() {
  const base = (
    process.env.NANOBOT_ORCHESTRATION_CALLBACK_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.API_URL ??
    ""
  )
    .trim()
    .replace(/\/$/, "");

  if (!base) {
    throw new Error(
      "NANOBOT_ORCHESTRATION_CALLBACK_URL (or API_URL/NEXT_PUBLIC_API_URL) is required for Trigger-based Nanobot orchestration",
    );
  }
  return base;
}

function buildCronDispatchCallbackUrl() {
  return `${getOrchestrationCallbackBaseUrl()}/nanobot/orchestration/cron/dispatch`;
}

function buildSubagentDispatchCallbackUrl() {
  return `${getOrchestrationCallbackBaseUrl()}/nanobot/orchestration/subagent/dispatch`;
}

async function withRedis<T>(
  fn: (redis: Awaited<ReturnType<typeof getSharedRedisClient>>) => Promise<T>,
): Promise<T> {
  const redis = await getSharedRedisClient();
  return fn(redis);
}

async function saveCronRecord(record: CronJobRecord) {
  await withRedis(async (redis) => {
    await redis.set(
      cronJobKey(record.teamId, record.jobId),
      JSON.stringify(record),
    );
    await redis.sAdd(cronIndexKey(record.teamId), record.jobId);
  });
}

async function loadCronRecord(teamId: string, jobId: string) {
  return withRedis(async (redis) => {
    const raw = await redis.get(cronJobKey(teamId, jobId));
    if (!raw) return null;
    return JSON.parse(raw) as CronJobRecord;
  });
}

async function listCronRecords(teamId: string) {
  return withRedis(async (redis) => {
    const ids = await redis.sMembers(cronIndexKey(teamId));
    if (!ids.length) return [] as CronJobRecord[];

    const raws = await Promise.all(
      ids.map((id) => redis.get(cronJobKey(teamId, id))),
    );
    return raws
      .filter((raw): raw is string => Boolean(raw))
      .map((raw) => JSON.parse(raw) as CronJobRecord)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  });
}

async function saveSubagentRecord(record: SubagentTaskRecord) {
  await withRedis(async (redis) => {
    await redis.set(
      subagentTaskKey(record.teamId, record.taskId),
      JSON.stringify(record),
    );
    await redis.sAdd(subagentIndexKey(record.teamId), record.taskId);
  });
}

async function loadSubagentRecord(teamId: string, taskId: string) {
  return withRedis(async (redis) => {
    const raw = await redis.get(subagentTaskKey(teamId, taskId));
    if (!raw) return null;
    return JSON.parse(raw) as SubagentTaskRecord;
  });
}

function everySecondsToCronExpr(everySeconds: number): string {
  if (!Number.isFinite(everySeconds) || everySeconds <= 0) {
    throw new Error("every_seconds must be a positive integer");
  }

  if (everySeconds < 60 || everySeconds % 60 !== 0) {
    throw new Error(
      "Trigger.dev schedules are minute-based in this integration. Use every_seconds múltiplo de 60 ou cron_expr.",
    );
  }

  const minutes = everySeconds / 60;
  if (minutes === 1) return "* * * * *";
  if (minutes <= 59) return `*/${minutes} * * * *`;
  if (minutes === 60) return "0 * * * *";
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    if (hours <= 23) return `0 */${hours} * * *`;
  }

  throw new Error(
    "every_seconds não suportado nesta fase. Use cron_expr para agendamentos mais específicos.",
  );
}

function oneShotDateToDelay(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid at datetime. Expected ISO datetime.");
  }
  if (date.getTime() <= Date.now()) {
    throw new Error("at must be in the future");
  }
  return date;
}

export async function addNanobotCronJob(input: NanobotCronAddInput) {
  const jobId = crypto.randomUUID().slice(0, 8);
  const createdAt = nowIso();

  const baseRecord: CronJobRecord = {
    kind: "cron",
    jobId,
    teamId: input.teamId,
    userId: input.userId,
    chatId: input.chatId,
    message: input.message,
    channel: input.channel,
    timezone: input.timezone,
    createdAt,
    updatedAt: createdAt,
    status: "active",
    triggerMode: "schedule",
  };

  if (input.schedule.kind === "cron" || input.schedule.kind === "every") {
    const cronExpr =
      input.schedule.kind === "cron"
        ? input.schedule.cronExpr
        : everySecondsToCronExpr(input.schedule.everySeconds);

    const schedule = await schedules.create({
      task: CRON_TASK_ID,
      cron: cronExpr,
      timezone:
        input.schedule.kind === "cron"
          ? (input.schedule.timezone ?? input.timezone ?? "UTC")
          : "UTC",
      externalId: cronExternalId(input.teamId, jobId),
      deduplicationKey: `${input.teamId}:${jobId}:${CRON_TASK_ID}`,
    });

    const record: CronJobRecord = {
      ...baseRecord,
      triggerMode: "schedule",
      triggerScheduleId: schedule.id,
      cronExpr,
      originalEverySeconds:
        input.schedule.kind === "every"
          ? input.schedule.everySeconds
          : undefined,
      timezone:
        input.schedule.kind === "cron"
          ? (input.schedule.timezone ?? input.timezone)
          : input.timezone,
    };
    await saveCronRecord(record);
    return record;
  }

  const delay = oneShotDateToDelay(input.schedule.at);
  const run = await tasks.trigger(
    CRON_ONCE_TASK_ID,
    {
      callbackUrl: buildCronDispatchCallbackUrl(),
      teamId: input.teamId,
      jobId,
    },
    { delay },
  );

  const record: CronJobRecord = {
    ...baseRecord,
    triggerMode: "delayed-run",
    triggerRunId: run.id,
    scheduledAt: delay.toISOString(),
  };
  await saveCronRecord(record);
  return record;
}

export async function listNanobotCronJobs(teamId: string, chatId?: string) {
  const records = await listCronRecords(teamId);
  return chatId ? records.filter((job) => job.chatId === chatId) : records;
}

export async function removeNanobotCronJob(teamId: string, jobId: string) {
  const record = await loadCronRecord(teamId, jobId);
  if (!record) return { removed: false, reason: "NOT_FOUND" as const };

  if (record.status === "removed") {
    return { removed: true, alreadyRemoved: true as const, record };
  }

  if (record.triggerMode === "schedule" && record.triggerScheduleId) {
    await schedules.del(record.triggerScheduleId);
  } else if (record.triggerMode === "delayed-run" && record.triggerRunId) {
    await runs.cancel(record.triggerRunId);
  }

  const updated: CronJobRecord = {
    ...record,
    status: "removed",
    updatedAt: nowIso(),
  };
  await saveCronRecord(updated);

  return { removed: true as const, record: updated };
}

export async function enqueueNanobotSubagentTask(input: NanobotSpawnInput) {
  const taskId = crypto.randomUUID().slice(0, 8);
  const createdAt = nowIso();
  const record: SubagentTaskRecord = {
    kind: "subagent",
    taskId,
    teamId: input.teamId,
    userId: input.userId,
    chatId: input.chatId,
    task: input.task,
    label: input.label,
    channel: input.channel,
    country: input.country,
    city: input.city,
    timezone: input.timezone,
    createdAt,
    updatedAt: createdAt,
    status: "queued",
  };
  await saveSubagentRecord(record);

  const run = await tasks.trigger(SUBAGENT_TASK_ID, {
    callbackUrl: buildSubagentDispatchCallbackUrl(),
    teamId: input.teamId,
    taskId,
  });

  const updated: SubagentTaskRecord = {
    ...record,
    triggerRunId: run.id,
    updatedAt: nowIso(),
  };
  await saveSubagentRecord(updated);

  return updated;
}

export async function getNanobotSubagentTask(teamId: string, taskId: string) {
  return loadSubagentRecord(teamId, taskId);
}

export async function markNanobotCronDispatchResult(params: {
  teamId: string;
  jobId: string;
  ok: boolean;
  error?: string;
}) {
  const record = await loadCronRecord(params.teamId, params.jobId);
  if (!record) return null;

  const updated: CronJobRecord = {
    ...record,
    updatedAt: nowIso(),
    lastRunAt: nowIso(),
    status: params.ok
      ? record.triggerMode === "delayed-run"
        ? "executed"
        : "active"
      : "failed",
    lastError: params.error,
  };
  await saveCronRecord(updated);
  return updated;
}

export async function markNanobotSubagentDispatchProgress(params: {
  teamId: string;
  taskId: string;
  status: SubagentTaskRecord["status"];
  resultText?: string;
  error?: string;
}) {
  const record = await loadSubagentRecord(params.teamId, params.taskId);
  if (!record) return null;

  const updated: SubagentTaskRecord = {
    ...record,
    status: params.status,
    updatedAt: nowIso(),
    resultText: params.resultText ?? record.resultText,
    lastError: params.error,
  };
  await saveSubagentRecord(updated);
  return updated;
}

export function parseNanobotCronScheduleRequest(input: {
  every_seconds?: number;
  cron_expr?: string;
  tz?: string;
  at?: string;
}) {
  if (input.every_seconds) {
    return { kind: "every", everySeconds: input.every_seconds } as const;
  }
  if (input.cron_expr) {
    return {
      kind: "cron",
      cronExpr: input.cron_expr,
      timezone: input.tz,
    } as const;
  }
  if (input.at) {
    return { kind: "at", at: input.at } as const;
  }
  throw new Error("Provide every_seconds, cron_expr, or at");
}

export async function dispatchNanobotCronJob(params: {
  teamId: string;
  jobId: string;
}) {
  const record = await loadCronRecord(params.teamId, params.jobId);
  if (!record) {
    throw new Error("Cron job not found");
  }

  buildCronDispatchCallbackUrl();

  const baseUrl = (process.env.NANOBOT_BASE_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  const chatPath = (process.env.NANOBOT_CHAT_PATH ?? "/api/chat").trim();
  if (!baseUrl) {
    throw new Error(
      "NANOBOT_BASE_URL is required to dispatch Nanobot cron jobs",
    );
  }

  const response = await fetch(
    `${baseUrl}${chatPath.startsWith("/") ? chatPath : `/${chatPath}`}`,
    {
      method: "POST",
      headers: buildNanobotRuntimeHeaders(),
      body: JSON.stringify({
        chatId: record.chatId,
        text: record.message,
        message: {
          role: "user",
          content: record.message,
        },
        runtime: {
          mode: "cron",
          orchestratedBy: "trigger.dev",
          nanobotJobId: record.jobId,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Nanobot cron dispatch failed (${response.status}): ${errorBody.slice(0, 500)}`,
    );
  }

  const text = await response.text().catch(() => "");
  await markNanobotCronDispatchResult({
    teamId: record.teamId,
    jobId: record.jobId,
    ok: true,
  });
  return { ok: true, record, responsePreview: text.slice(0, 400) };
}

export async function dispatchNanobotSubagentTask(params: {
  teamId: string;
  taskId: string;
}) {
  const record = await loadSubagentRecord(params.teamId, params.taskId);
  if (!record) {
    throw new Error("Subagent task not found");
  }

  await markNanobotSubagentDispatchProgress({
    teamId: record.teamId,
    taskId: record.taskId,
    status: "running",
  });

  const baseUrl = (process.env.NANOBOT_BASE_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  const chatPath = (process.env.NANOBOT_CHAT_PATH ?? "/api/chat").trim();
  if (!baseUrl) {
    throw new Error(
      "NANOBOT_BASE_URL is required to dispatch Nanobot subagent tasks",
    );
  }

  const response = await fetch(
    `${baseUrl}${chatPath.startsWith("/") ? chatPath : `/${chatPath}`}`,
    {
      method: "POST",
      headers: buildNanobotRuntimeHeaders(),
      body: JSON.stringify({
        chatId: record.chatId,
        text: record.task,
        message: {
          role: "user",
          content: record.task,
        },
        runtime: {
          mode: "subagent",
          orchestratedBy: "trigger.dev",
          nanobotTaskId: record.taskId,
          background: true,
          label: record.label,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    const error = `Nanobot subagent dispatch failed (${response.status}): ${errorBody.slice(
      0,
      500,
    )}`;
    await markNanobotSubagentDispatchProgress({
      teamId: record.teamId,
      taskId: record.taskId,
      status: "failed",
      error,
    });
    throw new Error(error);
  }

  const responseText = await response.text().catch(() => "");
  await markNanobotSubagentDispatchProgress({
    teamId: record.teamId,
    taskId: record.taskId,
    status: "completed",
    resultText: responseText.slice(0, 5000),
  });

  return { ok: true, taskId: record.taskId };
}

export async function triggerCronDispatchCallback(params: {
  callbackUrl?: string;
  teamId: string;
  jobId: string;
}) {
  const callbackUrl = params.callbackUrl || buildCronDispatchCallbackUrl();
  const response = await fetch(callbackUrl, {
    method: "POST",
    headers: buildInternalAuthHeaders(),
    body: JSON.stringify({
      teamId: params.teamId,
      jobId: params.jobId,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Cron dispatch callback failed (${response.status}): ${body.slice(0, 500)}`,
    );
  }
}

export async function triggerSubagentDispatchCallback(params: {
  callbackUrl?: string;
  teamId: string;
  taskId: string;
}) {
  const callbackUrl = params.callbackUrl || buildSubagentDispatchCallbackUrl();
  const response = await fetch(callbackUrl, {
    method: "POST",
    headers: buildInternalAuthHeaders(),
    body: JSON.stringify({
      teamId: params.teamId,
      taskId: params.taskId,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Subagent dispatch callback failed (${response.status}): ${body.slice(0, 500)}`,
    );
  }
}

export function parseCronDispatchExternalId(externalId: string | undefined) {
  return parseCronExternalId(externalId);
}
