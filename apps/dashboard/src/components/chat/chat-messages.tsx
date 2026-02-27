"use client";

import { ArtifactToggleIcon } from "@/components/chat/artifact-toggle-icon";
import { ChatMessageActions } from "@/components/chat/chat-message-actions";
import { ConnectBankMessage } from "@/components/chat/connect-bank-message";
import { FaviconStack } from "@/components/favicon-stack";
import { useUserQuery } from "@/hooks/use-user";
import {
  extractArtifactTypeFromMessage,
  extractBankAccountRequired,
} from "@/lib/chat-utils";
import { Message, MessageAvatar, MessageContent } from "@midpoker/ui/message";
import { Response } from "@midpoker/ui/response";
import type { UIMessage } from "ai";
import { PaperclipIcon } from "lucide-react";
import Image from "next/image";
import React, { useMemo } from "react";

interface ChatMessagesProps {
  messages: UIMessage[];
  isStreaming?: boolean;
}

interface SourceItem {
  url: string;
  title: string;
  publishedDate?: string;
}

interface WebSearchToolOutput {
  sources?: SourceItem[];
}

function extractWebSearchSources(parts: UIMessage["parts"]): SourceItem[] {
  const sources: SourceItem[] = [];

  for (const part of parts) {
    const type = part.type as string;
    if (type === "tool-webSearch") {
      const output = (part as { output?: WebSearchToolOutput }).output;
      if (output?.sources) {
        sources.push(...output.sources);
      }
    }
  }

  return sources;
}

function extractAiSdkSources(parts: UIMessage["parts"]): SourceItem[] {
  const sources: SourceItem[] = [];

  for (const part of parts) {
    if (part.type === "source-url") {
      const sourcePart = part as { url: string; title?: string };
      sources.push({
        url: sourcePart.url,
        title: sourcePart.title || sourcePart.url,
      });
    }
  }

  return sources;
}

function extractFileParts(parts: UIMessage["parts"]) {
  return parts.filter((part) => part.type === "file");
}

function normalizeAssistantText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface MemoizedChatMessageProps {
  message: Omit<UIMessage, "parts">;
  parts: UIMessage["parts"];
  isMessageFinished: boolean;
  user:
    | {
        avatarUrl?: string | null;
        fullName?: string | null;
        email?: string | null;
      }
    | null
    | undefined;
}

const MemoizedChatMessage = React.memo(function MemoizedChatMessage({
  message,
  parts,
  isMessageFinished,
  user,
}: MemoizedChatMessageProps) {
  // Fallback: when parts is empty/undefined (e.g. messages loaded from Redis via store),
  // reconstruct parts from the message's content field.
  const safeParts = useMemo(() => {
    if (parts && parts.length > 0) return parts;
    const content = (message as { content?: string }).content;
    if (typeof content === "string" && content.length > 0) {
      return [{ type: "text" as const, text: content }];
    }
    return [];
  }, [parts, message]);
  const textParts = useMemo(
    () => safeParts.filter((part) => part.type === "text"),
    [safeParts],
  );
  const rawTextContent = useMemo(
    () =>
      textParts.map((part) => (part.type === "text" ? part.text : "")).join(""),
    [textParts],
  );
  const textContent = useMemo(
    () =>
      message.role === "assistant"
        ? normalizeAssistantText(rawTextContent)
        : rawTextContent,
    [message.role, rawTextContent],
  );

  const fileParts = useMemo(() => extractFileParts(safeParts), [safeParts]);

  // Fix 19: Deduplicate sources with Map O(n) instead of filter+findIndex O(n²)
  const uniqueSources = useMemo(() => {
    const aiSdkSources = extractAiSdkSources(safeParts);
    const webSearchSources = extractWebSearchSources(safeParts);
    const allSources = [...aiSdkSources, ...webSearchSources];
    return [...new Map(allSources.map((s) => [s.url, s])).values()];
  }, [safeParts]);

  const bankAccountRequired = useMemo(
    () => extractBankAccountRequired(safeParts),
    [safeParts],
  );

  const artifactType = useMemo(
    () =>
      message.role === "assistant"
        ? extractArtifactTypeFromMessage(safeParts)
        : null,
    [message.role, safeParts],
  );

  const shouldShowSources =
    uniqueSources.length > 0 &&
    message.role === "assistant" &&
    isMessageFinished;

  return (
    <div key={message.id} className="group">
      {fileParts.length > 0 && (
        <Message from={message.role}>
          <MessageContent className="max-w-[80%]">
            <div className="flex flex-wrap gap-2 mb-2">
              {fileParts.map((part) => {
                if (part.type !== "file") return null;

                const file = part as {
                  type: "file";
                  url?: string;
                  mediaType?: string;
                  filename?: string;
                };

                const fileKey = `${file.url}-${file.filename}`;
                const isImage = file.mediaType?.startsWith("image/");

                if (isImage && file.url) {
                  return (
                    <div
                      key={fileKey}
                      className="relative rounded-lg border overflow-hidden"
                    >
                      <Image
                        src={file.url}
                        alt={file.filename || "attachment"}
                        className="max-w-xs max-h-48 object-cover"
                        width={300}
                        height={192}
                        unoptimized
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={fileKey}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50"
                  >
                    <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {file.filename || "Unknown file"}
                    </span>
                  </div>
                );
              })}
            </div>
          </MessageContent>
          {message.role === "user" && user && (
            <MessageAvatar
              src={user.avatarUrl || ""}
              name={user.fullName || user.email || ""}
            />
          )}
        </Message>
      )}

      {bankAccountRequired && message.role === "assistant" && (
        <Message from={message.role}>
          <MessageContent className="max-w-[80%]">
            <ConnectBankMessage />
          </MessageContent>
        </Message>
      )}

      {textParts.length > 0 && !bankAccountRequired && (
        <Message from={message.role}>
          <MessageContent className="max-w-[80%]">
            <Response className="!space-y-2">{textContent}</Response>
          </MessageContent>
          {message.role === "user" && user && (
            <MessageAvatar
              src={user.avatarUrl || ""}
              name={user.fullName || user.email || ""}
            />
          )}
        </Message>
      )}

      {shouldShowSources && !bankAccountRequired && (
        <div className="max-w-[80%]">
          <FaviconStack sources={uniqueSources} />
        </div>
      )}

      {message.role === "assistant" &&
        isMessageFinished &&
        textContent &&
        !bankAccountRequired && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex items-center gap-1 mt-3">
              <ChatMessageActions
                messageContent={textContent}
                messageId={message.id}
              />
              {artifactType && (
                <ArtifactToggleIcon artifactType={artifactType} />
              )}
            </div>
          </div>
        )}
    </div>
  );
});

export function ChatMessages({
  messages,
  isStreaming = false,
}: ChatMessagesProps) {
  const { data: user } = useUserQuery();

  return (
    <>
      {messages.map(({ parts, ...message }, index) => {
        const isLastMessage = index === messages.length - 1;
        const isMessageFinished = !isLastMessage || !isStreaming;

        return (
          <MemoizedChatMessage
            key={message.id ?? `msg-${index}`}
            message={message}
            parts={parts}
            isMessageFinished={isMessageFinished}
            user={user}
          />
        );
      })}
    </>
  );
}
