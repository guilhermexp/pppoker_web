import { schedules } from "@trigger.dev/sdk";

function parseExternalId(externalId?: string | null) {
  if (!externalId) return null;
  const parts = externalId.split(":");
  if (parts.length !== 3 || parts[0] !== "nanobot-cron") return null;
  return { teamId: parts[1]!, jobId: parts[2]! };
}

function getInternalToken() {
  const token = process.env.NANOBOT_ORCHESTRATION_INTERNAL_TOKEN?.trim();
  if (!token) {
    throw new Error("NANOBOT_ORCHESTRATION_INTERNAL_TOKEN is required");
  }
  return token;
}

function getCallbackUrl() {
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

export const nanobotCronDispatch = schedules.task({
  id: "nanobot-cron-dispatch",
  maxDuration: 60,
  run: async (payload) => {
    const parsed = parseExternalId(payload.externalId);
    if (!parsed) {
      throw new Error("Invalid externalId for nanobot cron dispatch");
    }

    const response = await fetch(getCallbackUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${getInternalToken()}`,
      },
      body: JSON.stringify(parsed),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("Nanobot cron callback failed", body);
      throw new Error(`Callback failed (${response.status})`);
    }

    return { ok: true, ...parsed };
  },
});
