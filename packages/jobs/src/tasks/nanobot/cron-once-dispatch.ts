import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

const payloadSchema = z.object({
  callbackUrl: z.string().url().optional(),
  teamId: z.string(),
  jobId: z.string(),
});

function getInternalToken() {
  const token = process.env.NANOBOT_ORCHESTRATION_INTERNAL_TOKEN?.trim();
  if (!token) {
    throw new Error("NANOBOT_ORCHESTRATION_INTERNAL_TOKEN is required");
  }
  return token;
}

function getDefaultCallbackUrl() {
  const base = (
    process.env.NANOBOT_ORCHESTRATION_CALLBACK_URL ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    ""
  )
    .trim()
    .replace(/\/$/, "");

  if (!base) {
    throw new Error(
      "NANOBOT_ORCHESTRATION_CALLBACK_URL (or API_URL/NEXT_PUBLIC_API_URL) is required",
    );
  }
  return `${base}/nanobot/orchestration/cron/dispatch`;
}

export const nanobotCronOnceDispatch = schemaTask({
  id: "nanobot-cron-once-dispatch",
  schema: payloadSchema,
  maxDuration: 60,
  run: async (payload) => {
    const response = await fetch(
      payload.callbackUrl ?? getDefaultCallbackUrl(),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${getInternalToken()}`,
        },
        body: JSON.stringify({
          teamId: payload.teamId,
          jobId: payload.jobId,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Cron once callback failed (${response.status}): ${body}`,
      );
    }

    return { ok: true };
  },
});
