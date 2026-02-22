import { buildAppContext } from "@api/ai/agents/config/shared";
import { getLegacyTool, listLegacyTools } from "@api/ai/tools/registry";
import { getUserContext } from "@api/ai/utils/get-user-context";
import type { Database } from "@midpoker/db/client";

type UIChunk = Record<string, unknown>;

type InvokeLegacyToolParams = {
  db: Database;
  teamId: string;
  userId: string;
  toolName: string;
  input: unknown;
  chatId: string;
  country?: string;
  city?: string;
  timezone?: string;
};

export type LegacyToolInvokeResult = {
  toolName: string;
  yielded: unknown[];
  output: unknown;
  uiChunks: UIChunk[];
};

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return !!value && typeof (value as any)[Symbol.asyncIterator] === "function";
}

export function getLegacyToolManifest() {
  return listLegacyTools();
}

export async function invokeLegacyTool(
  params: InvokeLegacyToolParams,
): Promise<LegacyToolInvokeResult> {
  const tool = getLegacyTool(params.toolName);

  if (!tool) {
    throw new Error(`Unknown tool: ${params.toolName}`);
  }

  const parsedInput = (tool.inputSchema as any).parse(params.input ?? {});

  const userContext = await getUserContext({
    db: params.db,
    userId: params.userId,
    teamId: params.teamId,
    country: params.country,
    city: params.city,
    timezone: params.timezone,
  });
  const appContext = buildAppContext(userContext, params.chatId);

  const uiChunks: UIChunk[] = [];
  const writer = {
    write(chunk: UIChunk) {
      uiChunks.push(chunk);
    },
    merge() {
      // Tool execution in the gateway only needs artifact/data writes.
    },
    onError: undefined,
  };

  const executionOptions = {
    experimental_context: {
      ...appContext,
      writer,
    },
  };

  const result = tool.execute(parsedInput, executionOptions);

  const yielded: unknown[] = [];
  let output: unknown = undefined;

  if (isAsyncIterable(result)) {
    const iterator = result[Symbol.asyncIterator]();
    while (true) {
      const next = await iterator.next();
      if (next.done) {
        output = next.value;
        break;
      }
      yielded.push(next.value);
    }
  } else {
    output = await result;
  }

  return {
    toolName: params.toolName,
    yielded,
    output,
    uiChunks,
  };
}
