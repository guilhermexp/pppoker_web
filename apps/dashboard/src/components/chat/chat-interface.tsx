"use client";

import { Canvas } from "@/components/canvas";
import { ApprovalCard, type ApprovalData } from "@/components/chat/approval-card";
import { useChatInterface } from "@/hooks/use-chat-interface";
import { useChatStatus } from "@/hooks/use-chat-status";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { useChat, useChatActions, useDataPart } from "@ai-sdk-tools/store";
import type { UIChatMessage } from "@midpoker/api/ai/types";
import { createClient } from "@midpoker/supabase/client";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@midpoker/ui/conversation";
import type { Geo } from "@vercel/functions";
import { DefaultChatTransport, generateId } from "ai";
import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChatHeader,
  ChatInput,
  type ChatInputMessage,
  ChatMessages,
  ChatStatusIndicators,
} from "./";

type Props = {
  geo?: Geo;
};

function extractApprovalParts(messages: UIChatMessage[]): ApprovalData[] {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;

    const approvals = new Map<string, ApprovalData>();
    for (const part of message.parts ?? []) {
      if ((part.type as string) !== "tool-pppokerApproval") continue;

      const output = (part as { output?: Record<string, unknown> }).output;
      if (!output?.id || !output?.action || !output?.summary) continue;

      const id = String(output.id);
      approvals.set(id, {
        id,
        action: String(output.action),
        params: (output.params as Record<string, unknown>) ?? {},
        summary: String(output.summary),
      });
    }

    if (approvals.size > 0) {
      return [...approvals.values()];
    }
  }

  return [];
}

export function ChatInterface({ geo }: Props) {
  const apiBaseUrl = getApiBaseUrl();
  const { chatId: routeChatId, isHome } = useChatInterface();
  const chatId = useMemo(() => routeChatId ?? generateId(), [routeChatId]);
  const { reset, stop } = useChatActions();
  const prevChatIdRef = useRef<string | null>(routeChatId);
  const [requestErrorMessage, setRequestErrorMessage] = useState<string | null>(
    null,
  );
  const [, clearSuggestions] = useDataPart<{ prompts: string[] }>(
    "suggestions",
  );

  // Reset chat state when navigating away from a chat (sidebar, browser back, etc.)
  useEffect(() => {
    const prevChatId = prevChatIdRef.current;
    const currentChatId = routeChatId;

    // If we had a chatId before and now we don't (navigated away), reset
    // Or if we're switching to a different chatId, reset
    if (prevChatId && prevChatId !== currentChatId) {
      reset();
      clearSuggestions();
    }

    // Update the ref for next comparison
    prevChatIdRef.current = currentChatId;
  }, [routeChatId, reset, clearSuggestions]);

  const authenticatedFetch = useMemo(
    () =>
      Object.assign(
        async (url: RequestInfo | URL, requestOptions?: RequestInit) => {
          const controller = new AbortController();
          const timeoutMs = 45_000;
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          try {
            const response = await fetch(url, {
              ...requestOptions,
              signal: requestOptions?.signal ?? controller.signal,
              headers: {
                ...requestOptions?.headers,
                Authorization: `Bearer ${session?.access_token}`,
                "Content-Type": "application/json",
              },
            });

            if (!response.ok) {
              setRequestErrorMessage(
                `Falha no backend do chat (${response.status}). Verifique API, banco e runtime do agente.`,
              );
            } else {
              setRequestErrorMessage(null);
            }

            return response;
          } catch (error) {
            const message =
              error instanceof DOMException && error.name === "AbortError"
                ? "Tempo limite da requisição do chat. O backend pode estar lento ou travado."
                : "Falha de conexão com o backend do chat.";

            setRequestErrorMessage(message);

            // Return a synthetic error response so the chat transport can settle
            // instead of leaving the UI stuck in a processing state.
            return new Response(JSON.stringify({ error: message }), {
              status:
                error instanceof DOMException && error.name === "AbortError"
                  ? 504
                  : 503,
              headers: {
                "content-type": "application/json",
              },
            });
          } finally {
            clearTimeout(timeoutId);
          }
        },
      ),
    [],
  );

  const chat = useChat<UIChatMessage>({
    id: chatId,
    transport: new DefaultChatTransport({
      api: `${apiBaseUrl}/chat`,
      fetch: authenticatedFetch,
      prepareSendMessagesRequest({ messages, id }) {
        const lastMessage = messages[messages.length - 1] as ChatInputMessage;

        const agentChoice = lastMessage.metadata?.agentChoice;
        const toolChoice = lastMessage.metadata?.toolChoice;

        return {
          body: {
            id,
            country: geo?.country,
            city: geo?.city,
            message: lastMessage,
            messages,
            agentChoice,
            toolChoice,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        };
      },
    }),
  });
  const { messages, status } = chat;
  const approvalParts = useMemo(() => extractApprovalParts(messages), [messages]);
  const approvalBatchKey = useMemo(
    () => approvalParts.map((approval) => approval.id).join("|"),
    [approvalParts],
  );
  const [approvalOverlayDismissed, setApprovalOverlayDismissed] =
    useState(false);
  const transportError = (chat as { error?: Error | null }).error ?? null;

  const {
    agentStatus,
    currentToolCall,
    artifactStage,
    artifactType,
    currentSection,
    bankAccountRequired,
  } = useChatStatus(messages, status);

  const [selectedType, setSelectedType] = useQueryState(
    "artifact-type",
    parseAsString,
  );

  const hasMessages = messages.length > 0;

  const [suggestions] = useDataPart<{ prompts: string[] }>("suggestions");
  const hasSuggestions = suggestions?.prompts && suggestions.prompts.length > 0;
  const showCanvas = Boolean(selectedType);

  useEffect(() => {
    if (transportError?.message) {
      setRequestErrorMessage(transportError.message);
    }
  }, [transportError]);

  useEffect(() => {
    if (status !== "streaming" && status !== "submitted") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      stop?.();
      setRequestErrorMessage(
        "O chat demorou demais e foi interrompido automaticamente. Tente novamente.",
      );
    }, 60_000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [status, stop]);

  useEffect(() => {
    setApprovalOverlayDismissed(false);
  }, [approvalBatchKey]);

  return (
    <div
      className={cn(
        "relative flex size-full overflow-hidden",
        isHome && "h-[calc(100vh-764px)]",
        !isHome && "h-[calc(100vh-88px)]",
      )}
    >
      {/* Canvas slides in from right when artifacts are present */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 z-20",
          showCanvas ? "translate-x-0" : "translate-x-full",
          hasMessages && "transition-transform duration-300 ease-in-out",
          "md:z-20 z-40",
        )}
      >
        <Canvas />
      </div>

      {/* Main chat area - container that slides left when canvas opens */}
      <div
        className={cn(
          "relative flex-1",
          hasMessages && "transition-all duration-300 ease-in-out",
          showCanvas && "mr-0 md:mr-[600px]",
          !hasMessages && "flex items-center justify-center",
        )}
      >
        {hasMessages && (
          <>
            {/* Conversation view - messages with absolute positioning for proper height */}
            <div className="absolute inset-0 flex flex-col">
              <div
                className={cn(
                  "sticky top-0 left-0 z-10 shrink-0",
                  hasMessages && "transition-all duration-300 ease-in-out",
                  showCanvas ? "right-0 md:right-[600px]" : "right-0",
                )}
              >
                <div className="bg-background/80 dark:bg-background/50 backdrop-blur-sm pt-6">
                  <ChatHeader />
                </div>
              </div>
              <Conversation>
                <ConversationContent className="pb-48 pt-14">
                  <div className="max-w-2xl mx-auto w-full">
                    {requestErrorMessage && (
                      <div className="mb-4">
                        <div className="rounded-lg border border-[#5E2F2F] bg-[#2B1616] p-4 text-[#F5D8D8]">
                          <p className="font-medium">
                            Falha no processamento do chat
                          </p>
                          <p className="mt-1 text-sm opacity-90">
                            {requestErrorMessage}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(status === "streaming" || status === "submitted") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  stop?.();
                                }}
                              >
                                Interromper processamento
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRequestErrorMessage(null)}
                            >
                              Fechar aviso
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    <ChatMessages
                      messages={messages}
                      isStreaming={
                        status === "streaming" || status === "submitted"
                      }
                    />
                    <ChatStatusIndicators
                      agentStatus={agentStatus}
                      currentToolCall={currentToolCall}
                      status={status}
                      artifactStage={artifactStage}
                      artifactType={artifactType}
                      currentSection={currentSection}
                      bankAccountRequired={bankAccountRequired}
                    />
                  </div>
                </ConversationContent>
                <ConversationScrollButton
                  className={cn(hasSuggestions ? "bottom-40" : "bottom-32")}
                />
              </Conversation>
            </div>
          </>
        )}

        <div
          className={cn(
            "fixed bottom-0 left-0",
            hasMessages && "transition-all duration-300 ease-in-out",
            showCanvas ? "right-0 md:right-[600px]" : "right-0",
          )}
        >
          <ChatInput />
        </div>
      </div>

      {approvalParts.length > 0 && !approvalOverlayDismissed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-4"
          onClick={() => setApprovalOverlayDismissed(true)}
        >
          <div
            className="w-full max-w-xl space-y-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setApprovalOverlayDismissed(true)}
              >
                Fechar
              </Button>
            </div>
            {approvalParts.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                isStreaming={status === "streaming" || status === "submitted"}
                onResolved={() => setApprovalOverlayDismissed(true)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
