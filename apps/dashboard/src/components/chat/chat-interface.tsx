"use client";

import { Canvas } from "@/components/canvas";
import { useChatInterface } from "@/hooks/use-chat-interface";
import { useChatStatus } from "@/hooks/use-chat-status";
import { useChat, useChatActions, useDataPart } from "@ai-sdk-tools/store";
import type { UIChatMessage } from "@midpoker/api/ai/types";
import { createClient } from "@midpoker/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@midpoker/ui/alert";
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

export function ChatInterface({ geo }: Props) {
  const { chatId: routeChatId, isHome } = useChatInterface();
  const chatId = useMemo(() => routeChatId ?? generateId(), [routeChatId]);
  const { reset, stop } = useChatActions();
  const prevChatIdRef = useRef<string | null>(routeChatId);
  const lastProgressAtRef = useRef<number>(Date.now());
  const lastProgressSignatureRef = useRef<string>("");
  const [stuckRequestWarning, setStuckRequestWarning] = useState<{
    phase: "submitted" | "streaming";
    secondsWithoutProgress: number;
  } | null>(null);
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
      api: `${process.env.NEXT_PUBLIC_API_URL}/chat`,
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
            agentChoice,
            toolChoice,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        };
      },
    }),
  });
  const { messages, status } = chat;
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

  const progressSignature = useMemo(() => {
    const lastMessage = messages[messages.length - 1];
    const lastAssistant =
      lastMessage?.role === "assistant" ? lastMessage : undefined;
    const textLength =
      lastAssistant?.parts
        ?.filter((part) => part.type === "text")
        .map((part) => (part as { text?: string }).text?.length ?? 0)
        .reduce((sum, len) => sum + len, 0) ?? 0;
    return `${status}:${messages.length}:${lastAssistant?.parts?.length ?? 0}:${textLength}`;
  }, [messages, status]);

  useEffect(() => {
    if (progressSignature !== lastProgressSignatureRef.current) {
      lastProgressSignatureRef.current = progressSignature;
      lastProgressAtRef.current = Date.now();
      setStuckRequestWarning(null);
    }
  }, [progressSignature]);

  useEffect(() => {
    if (status === "ready" || status === "error") {
      setStuckRequestWarning(null);
      return;
    }

    if (status !== "submitted" && status !== "streaming") {
      return;
    }

    const interval = window.setInterval(() => {
      const elapsedMs = Date.now() - lastProgressAtRef.current;
      const thresholdMs = status === "submitted" ? 12_000 : 25_000;

      if (elapsedMs >= thresholdMs) {
        setStuckRequestWarning({
          phase: status,
          secondsWithoutProgress: Math.floor(elapsedMs / 1000),
        });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (transportError?.message) {
      setRequestErrorMessage(transportError.message);
    }
  }, [transportError]);

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
                    {(stuckRequestWarning || requestErrorMessage) && (
                      <div className="mb-4">
                        <Alert variant="warning">
                          <AlertTitle>
                            {requestErrorMessage
                              ? "Falha no processamento do chat"
                              : "Processamento demorando mais que o normal"}
                          </AlertTitle>
                          <AlertDescription>
                            <p>
                              {requestErrorMessage ??
                                `A resposta está sem progresso há ${stuckRequestWarning?.secondsWithoutProgress ?? 0}s (${stuckRequestWarning?.phase === "submitted" ? "enviando" : "streaming"}). Você pode interromper e tentar novamente.`}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(status === "streaming" ||
                                status === "submitted") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    stop?.();
                                    setStuckRequestWarning(null);
                                  }}
                                >
                                  Interromper processamento
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setStuckRequestWarning(null);
                                  setRequestErrorMessage(null);
                                }}
                              >
                                Fechar aviso
                              </Button>
                            </div>
                          </AlertDescription>
                        </Alert>
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
    </div>
  );
}
