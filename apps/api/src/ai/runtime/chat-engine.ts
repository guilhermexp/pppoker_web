import type { NanobotSettings } from "@api/schemas/nanobot";
import {
  getChatEngineFromEnv,
  shouldFallbackToLegacyOnNanobotError,
} from "./chat-engine-config";
import { nanobotToUIMessageStream } from "./nanobot";

// Fix 20: Lazy-load legacy agent — only imported when engine !== "nanobot"
async function getLegacyAgent() {
  const { mainAgent } = await import("@api/ai/agents/main");
  return mainAgent;
}

// Use the lazy-loaded agent's type for the options signature
type LegacyAgent = Awaited<ReturnType<typeof getLegacyAgent>>;
export type LegacyChatStreamOptions = Parameters<
  LegacyAgent["toUIMessageStream"]
>[0];
type ChatResponse = Awaited<ReturnType<LegacyAgent["toUIMessageStream"]>>;

function resolveRequestedEngine(options: LegacyChatStreamOptions) {
  const envEngine = getChatEngineFromEnv();
  if (envEngine === "nanobot") return "nanobot" as const;

  const teamNanobotConfig = (
    options.context as { nanobotConfig?: NanobotSettings }
  )?.nanobotConfig;
  if (teamNanobotConfig?.enabled) return "nanobot" as const;

  return "legacy" as const;
}

export async function runChatAgent(
  options: LegacyChatStreamOptions,
): Promise<ChatResponse> {
  const engine = resolveRequestedEngine(options);

  if (engine !== "nanobot") {
    const mainAgent = await getLegacyAgent();
    return mainAgent.toUIMessageStream(options);
  }

  try {
    return await nanobotToUIMessageStream(options);
  } catch (error) {
    if (!shouldFallbackToLegacyOnNanobotError()) {
      throw error;
    }

    console.error(
      "[chat-engine] nanobot failed, falling back to legacy",
      error,
    );
    const mainAgent = await getLegacyAgent();
    return mainAgent.toUIMessageStream(options);
  }
}
