import { memoryProvider } from "@api/ai/runtime/app-context";
import {
  deleteChatSchema,
  getChatSchema,
  listChatsSchema,
} from "@api/schemas/chat";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";

interface RedisMessage {
  role?: string;
  content?: unknown;
  timestamp?: string | Date;
  [key: string]: unknown;
}

/**
 * Convert Redis ConversationMessage to UIMessage format expected by ChatProvider.
 * Redis stores: {role, content, timestamp}
 * UI expects: {id, role, parts: [{type: "text", text: "..."}], createdAt}
 */
function toUIMessage(raw: RedisMessage, index: number) {
  const content =
    typeof raw.content === "string"
      ? raw.content
      : raw.content != null
        ? JSON.stringify(raw.content)
        : "";

  return {
    id: (raw as Record<string, unknown>).id
      ? String((raw as Record<string, unknown>).id)
      : `redis-${index}`,
    role: raw.role ?? "user",
    content,
    parts: [{ type: "text" as const, text: content }],
    createdAt: raw.timestamp ? new Date(raw.timestamp) : undefined,
  };
}

export const chatsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listChatsSchema)
    .query(async ({ ctx, input }) => {
      const scopedUserId = `${ctx.session.user.id}:${ctx.teamId}`;

      return memoryProvider.getChats({
        userId: scopedUserId,
        search: input.search,
        limit: input.limit ?? 50,
      });
    }),

  get: protectedProcedure.input(getChatSchema).query(async ({ ctx, input }) => {
    const scopedUserId = `${ctx.session.user.id}:${ctx.teamId}`;
    const chat = await memoryProvider.getChat(input.chatId);
    const chatOwnerId =
      chat && typeof chat === "object"
        ? (chat as Record<string, unknown>).userId
        : undefined;

    if (!chat || chatOwnerId !== scopedUserId) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const raw = await memoryProvider.getMessages({
      chatId: input.chatId,
      limit: 50,
    });

    // Transform Redis ConversationMessage[] to UIMessage[] for the frontend
    return (raw as RedisMessage[]).map(toUIMessage);
  }),

  delete: protectedProcedure
    .input(deleteChatSchema)
    .mutation(async ({ ctx, input }) => {
      const scopedUserId = `${ctx.session.user.id}:${ctx.teamId}`;
      const chat = await memoryProvider.getChat(input.chatId);
      const chatOwnerId =
        chat && typeof chat === "object"
          ? (chat as Record<string, unknown>).userId
          : undefined;

      if (!chat || chatOwnerId !== scopedUserId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return memoryProvider.deleteChat(input.chatId);
    }),
});
