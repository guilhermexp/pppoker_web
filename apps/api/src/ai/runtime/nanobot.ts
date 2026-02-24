import type { UIChatMessage } from "@api/ai/types";
import type { NanobotSettings } from "@api/schemas/nanobot";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { nanoid } from "nanoid";
import type { LegacyChatStreamOptions } from "./chat-engine";

type NanobotAgentStatus = {
  status: "routing" | "executing" | "completing";
  agent:
    | "orchestrator"
    | "triage"
    | "general"
    | "research"
    | "operations"
    | "reports"
    | "analytics"
    | "transactions"
    | "invoices"
    | "customers"
    | "timeTracking";
};

type NanobotSource = {
  id?: string;
  url: string;
  title?: string;
};

type NanobotNormalizedResponse = {
  text: string;
  suggestions?: string[];
  sources?: NanobotSource[];
};

type NanobotSSEEvent = {
  event?: string;
  data?: unknown;
};

const DEFAULT_TIMEOUT_MS = 120_000;

function parseEnvJsonSafe(input: string | undefined): Record<string, string> {
  if (!input?.trim()) return {};
  try {
    const parsed = JSON.parse(input);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

function buildTeamMcpServers(teamConfig?: NanobotSettings) {
  const pppoker = teamConfig?.mcpConfig?.pppoker;
  if (!pppoker?.enabled) return undefined;

  const args = [
    pppoker.scriptPath,
    ...pppoker.extraArgsText.split(/\s+/).filter(Boolean),
  ];

  return {
    [pppoker.serverName || "pppoker"]: {
      command: pppoker.command || "python3",
      args,
      cwd: pppoker.cwd || undefined,
      env: parseEnvJsonSafe(pppoker.envJson),
    },
  };
}

function getTeamNanobotConfig(
  options: LegacyChatStreamOptions,
): NanobotSettings | undefined {
  return (options.context as { nanobotConfig?: NanobotSettings } | undefined)
    ?.nanobotConfig;
}

export function extractUserTextFromMessage(message: UIChatMessage): string {
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content;
  }

  const textFromParts = (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => {
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("");

  return textFromParts.trim();
}

export function normalizeNanobotJSONResponse(
  input: unknown,
): NanobotNormalizedResponse {
  if (typeof input === "string") {
    return { text: input };
  }

  if (!input || typeof input !== "object") {
    return { text: "" };
  }

  const data = input as Record<string, unknown>;

  const textCandidates = [
    data.text,
    data.response,
    data.answer,
    data.content,
    (data.message as Record<string, unknown> | undefined)?.content,
  ];

  const text =
    textCandidates.find((candidate) => typeof candidate === "string") ?? "";

  const suggestionsRaw =
    data.suggestions ??
    (data.followups as Record<string, unknown> | undefined)?.prompts;

  const suggestions = Array.isArray(suggestionsRaw)
    ? suggestionsRaw.filter((item): item is string => typeof item === "string")
    : undefined;

  const sourcesRaw = Array.isArray(data.sources) ? data.sources : undefined;
  const sources = sourcesRaw
    ?.map((source) => {
      if (!source || typeof source !== "object") return null;
      const sourceObj = source as Record<string, unknown>;
      const url = sourceObj.url;
      if (typeof url !== "string" || !url) return null;
      return {
        id: typeof sourceObj.id === "string" ? sourceObj.id : undefined,
        url,
        title:
          typeof sourceObj.title === "string" ? sourceObj.title : undefined,
      } satisfies NanobotSource;
    })
    .filter((source): source is NanobotSource => source !== null);

  return {
    text: typeof text === "string" ? text : "",
    suggestions,
    sources,
  };
}

function getNanobotBaseUrl(
  env: Record<string, string | undefined> = process.env,
) {
  return (env.NANOBOT_BASE_URL ?? "").trim().replace(/\/$/, "");
}

function getNanobotChatPath(
  env: Record<string, string | undefined> = process.env,
): string {
  const path = (env.NANOBOT_CHAT_PATH ?? "/api/chat").trim();
  if (!path) return "/api/chat";
  return path.startsWith("/") ? path : `/${path}`;
}

function getNanobotTimeoutMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const parsed = Number.parseInt(env.NANOBOT_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

async function fetchNanobot(
  options: LegacyChatStreamOptions,
): Promise<Response> {
  const teamConfig = getTeamNanobotConfig(options);
  const mcpServers = buildTeamMcpServers(teamConfig);
  const baseUrl = (teamConfig?.baseUrl || getNanobotBaseUrl())
    .trim()
    .replace(/\/$/, "");

  if (!baseUrl) {
    throw new Error(
      "NANOBOT_BASE_URL is required when CHAT_AGENT_ENGINE=nanobot",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getNanobotTimeoutMs());

  try {
    const headers: HeadersInit = {
      "content-type": "application/json",
      accept: "text/event-stream, application/json, text/plain",
    };

    const apiKey = teamConfig?.apiKey || process.env.NANOBOT_API_KEY;
    if (apiKey) {
      headers.authorization = `Bearer ${apiKey}`;
    }

    const chatPath = (teamConfig?.chatPath || getNanobotChatPath()).trim();

    const response = await fetch(
      `${baseUrl}${chatPath.startsWith("/") ? chatPath : `/${chatPath}`}`,
      {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          chatId: (options.context as Record<string, unknown> | undefined)
            ?.chatId,
          message: options.message,
          messages: (options.context as Record<string, unknown> | undefined)
            ?.messages,
          text: extractUserTextFromMessage(options.message as UIChatMessage),
          context: options.context,
          agentChoice: (options as Record<string, unknown>).agentChoice,
          toolChoice: (options as Record<string, unknown>).toolChoice,
          // Forward a small subset of runtime knobs to help the sidecar choose behavior.
          runtime: {
            strategy: (options as Record<string, unknown>).strategy,
            maxRounds: (options as Record<string, unknown>).maxRounds,
            maxSteps: (options as Record<string, unknown>).maxSteps,
          },
          uiContract: {
            emitAgentStatus: true,
            emitSuggestions: true,
            streamProtocol: "ai-sdk-ui-message",
          },
          provider:
            teamConfig?.modelConfig?.provider ||
            teamConfig?.provider ||
            undefined,
          model:
            teamConfig?.modelConfig?.model || teamConfig?.model || undefined,
          nanobotConfig: teamConfig
            ? {
                modelConfig: teamConfig.modelConfig,
                channels: teamConfig.channels,
                gatewayConfig: teamConfig.gatewayConfig,
                soul: teamConfig.soul,
                soulConfig: teamConfig.soulConfig,
                agentCmd: teamConfig.agentCmd,
                agentCmdConfig: teamConfig.agentCmdConfig,
                memoryNotes: teamConfig.memoryNotes,
                memoryConfig: teamConfig.memoryConfig,
                skillsConfig: teamConfig.skillsConfig,
                automationConfig: teamConfig.automationConfig,
                mcpConfig: teamConfig.mcpConfig,
                mcpServers,
              }
            : undefined,
          mcpServers,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Nanobot request failed (${response.status} ${response.statusText}): ${errorBody.slice(
          0,
          500,
        )}`,
      );
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function writeAgentStatus(
  writer: { write: (chunk: any) => void },
  status: NanobotAgentStatus,
) {
  writer.write({
    type: "data-agent-status",
    data: status,
  });
}

function writeSuggestions(
  writer: { write: (chunk: any) => void },
  prompts?: string[],
) {
  if (!prompts?.length) return;

  writer.write({
    type: "data-suggestions",
    data: { prompts },
  });
}

function writeSources(
  writer: { write: (chunk: any) => void },
  sources?: NanobotSource[],
) {
  if (!sources?.length) return;

  for (const source of sources) {
    writer.write({
      type: "source-url",
      sourceId: source.id ?? nanoid(),
      url: source.url,
      title: source.title,
    });
  }
}

function writeText(
  writer: { write: (chunk: any) => void },
  textId: string,
  text: string,
) {
  writer.write({ type: "text-start", id: textId });
  if (text) {
    writer.write({ type: "text-delta", id: textId, delta: text });
  }
  writer.write({ type: "text-end", id: textId });
}

function findSSEBoundary(
  buf: string,
): { index: number; length: number } | -1 {
  const rnrn = buf.indexOf("\r\n\r\n");
  const nn = buf.indexOf("\n\n");
  if (rnrn === -1 && nn === -1) return -1;
  if (rnrn !== -1 && (nn === -1 || rnrn <= nn))
    return { index: rnrn, length: 4 };
  return { index: nn, length: 2 };
}

async function* parseSSE(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<NanobotSSEEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Handle both \n\n and \r\n\r\n boundaries (sse_starlette uses \r\n)
      let boundaryIndex = findSSEBoundary(buffer);
      while (boundaryIndex !== -1) {
        const rawEvent = buffer.slice(0, boundaryIndex.index);
        buffer = buffer.slice(boundaryIndex.index + boundaryIndex.length);

        const parsed = parseSSEEvent(rawEvent);
        if (parsed) yield parsed;

        boundaryIndex = findSSEBoundary(buffer);
      }
    }

    buffer += decoder.decode();
    const tail = parseSSEEvent(buffer.trim());
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

function parseSSEEvent(raw: string): NanobotSSEEvent | null {
  if (!raw) return null;

  const lines = raw.split(/\r?\n/);
  let eventName: string | undefined;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0 && !eventName) return null;

  const dataText = dataLines.join("\n");
  if (!dataText) return { event: eventName };
  if (dataText === "[DONE]") return { event: eventName ?? "done" };

  try {
    return { event: eventName, data: JSON.parse(dataText) };
  } catch {
    return { event: eventName, data: dataText };
  }
}

function tryWriteDirectChunk(
  writer: { write: (chunk: any) => void },
  data: unknown,
): boolean {
  if (!data || typeof data !== "object") return false;
  const chunk = data as Record<string, unknown>;
  if (typeof chunk.type !== "string") return false;

  const supportedPrefix =
    chunk.type.startsWith("data-") ||
    [
      "text-start",
      "text-delta",
      "text-end",
      "tool-input-start",
      "tool-input-delta",
      "tool-input-available",
      "tool-input-error",
      "tool-output-available",
      "tool-output-error",
      "source-url",
      "start",
      "finish",
      "error",
    ].includes(chunk.type);

  if (!supportedPrefix) return false;

  writer.write(chunk);
  return true;
}

const SSE_IDLE_TIMEOUT_MS = 60_000;

async function* parseSSEWithTimeout(
  stream: ReadableStream<Uint8Array>,
  timeoutMs: number,
): AsyncGenerator<NanobotSSEEvent> {
  const inner = parseSSE(stream);
  while (true) {
    const raceResult = await Promise.race([
      inner.next(),
      new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), timeoutMs),
      ),
    ]);
    if (raceResult === "timeout") {
      await inner.return(undefined);
      return;
    }
    const result = raceResult as IteratorResult<NanobotSSEEvent>;
    if (result.done) return;
    yield result.value;
  }
}

async function pipeNanobotSSEToUIStream(
  response: Response,
  writer: { write: (chunk: any) => void },
): Promise<{ finishWritten: boolean }> {
  if (!response.body) return { finishWritten: false };

  const textId = nanoid();
  let textStarted = false;
  let textEnded = false;
  let finishWritten = false;
  let receivedAnyData = false;

  const ensureTextStart = () => {
    if (!textStarted) {
      writer.write({ type: "text-start", id: textId });
      textStarted = true;
    }
  };

  const ensureTextEnd = () => {
    if (textStarted && !textEnded) {
      writer.write({ type: "text-end", id: textId });
      textEnded = true;
    }
  };

  for await (const event of parseSSEWithTimeout(response.body, SSE_IDLE_TIMEOUT_MS)) {
    if (
      event.data &&
      typeof event.data === "object" &&
      (event.data as Record<string, unknown>).type === "finish"
    ) {
      finishWritten = true;
      continue;
    }

    if (event.data && tryWriteDirectChunk(writer, event.data)) {
      continue;
    }

    receivedAnyData = true;
    const eventName = (event.event ?? "").toLowerCase();
    const payload = event.data;

    if (eventName === "done") {
      break;
    }

    if (eventName === "error") {
      const errorMsg =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>).error
          : payload;
      ensureTextStart();
      writer.write({
        type: "text-delta",
        id: textId,
        delta: `\n\n⚠️ ${typeof errorMsg === "string" ? errorMsg : "Erro no processamento do agente."}`,
      });
      break;
    }

    if (eventName === "agent-status") {
      if (payload && typeof payload === "object") {
        writer.write({ type: "data-agent-status", data: payload });
      }
      continue;
    }

    if (eventName === "suggestions") {
      const prompts =
        Array.isArray(payload) &&
        payload.every((item) => typeof item === "string")
          ? payload
          : Array.isArray(
                (payload as { prompts?: unknown } | undefined)?.prompts,
              )
            ? (payload as { prompts: unknown[] }).prompts.filter(
                (item): item is string => typeof item === "string",
              )
            : undefined;
      writeSuggestions(writer, prompts);
      continue;
    }

    if (eventName === "approval-request") {
      ensureTextEnd();
      if (payload && typeof payload === "object") {
        const approval = payload as Record<string, unknown>;
        const toolCallId = `approval-${approval.id ?? nanoid()}`;
        writer.write({
          type: "tool-input-start",
          toolCallId,
          toolName: "pppokerApproval",
        });
        writer.write({
          type: "tool-input-available",
          toolCallId,
          toolName: "pppokerApproval",
          input: approval,
        });
        writer.write({
          type: "tool-output-available",
          toolCallId,
          output: approval,
        });
      }
      continue;
    }

    if (eventName === "source" || eventName === "source-url") {
      const normalized = normalizeNanobotJSONResponse({ sources: [payload] });
      writeSources(writer, normalized.sources);
      continue;
    }

    if (
      eventName === "text-delta" ||
      eventName === "delta" ||
      eventName === "token" ||
      eventName === "text"
    ) {
      let delta = "";

      if (typeof payload === "string") {
        delta = payload;
      } else if (payload && typeof payload === "object") {
        const candidate = (payload as Record<string, unknown>).delta;
        const textCandidate = (payload as Record<string, unknown>).text;
        const tokenCandidate = (payload as Record<string, unknown>).token;
        delta =
          [candidate, textCandidate, tokenCandidate].find(
            (value): value is string => typeof value === "string",
          ) ?? "";
      }

      if (delta) {
        ensureTextStart();
        writer.write({ type: "text-delta", id: textId, delta });
      }
    }
  }

  // If the loop ended without receiving any events (timeout), write error
  if (!receivedAnyData) {
    ensureTextStart();
    writer.write({
      type: "text-delta",
      id: textId,
      delta: "⚠️ O agente demorou demais para responder. Tente novamente.",
    });
  }

  ensureTextEnd();
  return { finishWritten };
}

export async function nanobotToUIMessageStream(
  options: LegacyChatStreamOptions,
): Promise<Response> {
  const nanobotResponse = await fetchNanobot(options);
  const contentType = nanobotResponse.headers.get("content-type") ?? "";

  const stream = createUIMessageStream<UIChatMessage>({
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      writeAgentStatus(writer, { status: "routing", agent: "orchestrator" });
      writeAgentStatus(writer, { status: "executing", agent: "orchestrator" });

      if (contentType.includes("text/event-stream")) {
        const { finishWritten } = await pipeNanobotSSEToUIStream(
          nanobotResponse,
          writer,
        );
        writeAgentStatus(writer, {
          status: "completing",
          agent: "orchestrator",
        });
        if (!finishWritten) {
          writer.write({ type: "finish", finishReason: "stop" });
        }
        return;
      }

      if (contentType.includes("application/json")) {
        const payload = normalizeNanobotJSONResponse(
          await nanobotResponse.json(),
        );
        writeSources(writer, payload.sources);
        writeText(writer, nanoid(), payload.text);
        writeSuggestions(writer, payload.suggestions);
        writeAgentStatus(writer, {
          status: "completing",
          agent: "orchestrator",
        });
        writer.write({ type: "finish", finishReason: "stop" });
        return;
      }

      const text = await nanobotResponse.text();
      writeText(writer, nanoid(), text);
      writeAgentStatus(writer, { status: "completing", agent: "orchestrator" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
    onError: (error) => {
      console.error("[nanobot] ui stream error", error);
      return "Nanobot response failed";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
