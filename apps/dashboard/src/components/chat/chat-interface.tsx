"use client";

import { Canvas } from "@/components/canvas";
import { ApprovalCard, type ApprovalData } from "@/components/chat/approval-card";
import { ChatProgressTimeline } from "@/components/chat/chat-progress-timeline";
import { useSidebarPinned } from "@/components/sidebar-context";
import { useChatInterface } from "@/hooks/use-chat-interface";
import { useChatStatus } from "@/hooks/use-chat-status";
import { usePaymentWaiter } from "@/hooks/use-payment-waiter";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { useChat, useChatActions, useDataPart } from "@ai-sdk-tools/store";
import type { UIChatMessage } from "@midpoker/api/ai/types";
import { createClient } from "@midpoker/supabase/client";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { Loader2, CheckCircle2, Clock } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@midpoker/ui/conversation";
import type { Geo } from "@vercel/functions";
import { DefaultChatTransport, generateId } from "ai";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const CHAT_REQUEST_TIMEOUT_MS = 130_000;

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
  const { isPinned } = useSidebarPinned();
  const apiBaseUrl = getApiBaseUrl();
  const { chatId: routeChatId, isHome } = useChatInterface();
  const chatId = useMemo(() => routeChatId ?? generateId(), [routeChatId]);
  const { reset, stop, pushMessage } = useChatActions();
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
      setPendingPaymentOrderNsu(null);
    }

    // Update the ref for next comparison
    prevChatIdRef.current = currentChatId;
  }, [routeChatId, reset, clearSuggestions]);

  // Fix 17: Create Supabase client once instead of per-request
  const supabaseClient = useMemo(() => createClient(), []);

  const authenticatedFetch = useMemo(
    () =>
      Object.assign(
        async (url: RequestInfo | URL, requestOptions?: RequestInit) => {
          const controller = new AbortController();
          const timeoutMs = CHAT_REQUEST_TIMEOUT_MS;
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const {
            data: { session },
          } = await supabaseClient.auth.getSession();

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
    [supabaseClient],
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

  // Fix 7: Only recompute approvals when the last assistant message changes
  const lastAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);
  const approvalParts = useMemo(
    () => (lastAssistantMessage ? extractApprovalParts([lastAssistantMessage]) : []),
    [lastAssistantMessage],
  );

  // Payment polling state
  const [pendingPaymentOrderNsu, setPendingPaymentOrderNsu] =
    useState<string | null>(null);

  // When a gerar_link_pagamento is approved, start polling
  const handlePaymentLinkGenerated = useCallback(
    (orderNsu: string) => {
      setPendingPaymentOrderNsu(orderNsu);
    },
    [],
  );

  // Payment polling
  const paymentWaiter = usePaymentWaiter({
    orderNsu: pendingPaymentOrderNsu,
    enabled: !!pendingPaymentOrderNsu,
    apiBaseUrl,
    maxWaitMs: 300_000,
    onConfirmed: async (result) => {
      // Helper: add a local assistant message to the chat (instant, no agent round-trip)
      const addLocalMessage = (text: string) => {
        pushMessage({
          id: generateId(),
          role: "assistant",
          parts: [{ type: "text" as const, text }],
        } as UIChatMessage);
      };

      // Auto-execute enviar_fichas via backend (verified by server, not chat messages)
      if (result.target_player_id && result.fichas && pendingPaymentOrderNsu) {
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();

          const sendResp = await fetch(`${apiBaseUrl}/nanobot/tools/invoke`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token ?? ""}`,
            },
            body: JSON.stringify({
              toolName: "enviar_fichas",
              input: {
                target_id: result.target_player_id,
                amount: result.fichas,
                order_nsu: pendingPaymentOrderNsu,
              },
            }),
          });

          const sendPayload = (await sendResp.json().catch(() => ({}))) as {
            success?: boolean;
            output?: unknown;
            error?: string;
          };

          if (sendResp.ok && sendPayload.success) {
            addLocalMessage(
              `Pagamento confirmado e fichas enviadas!\n\n` +
              `- **Pedido**: ${pendingPaymentOrderNsu}\n` +
              `- **Valor**: R$ ${result.paid_amount} (${result.capture_method})\n` +
              `- **Fichas**: ${result.fichas} enviadas para UID ${result.target_player_id}`,
            );
          } else {
            addLocalMessage(
              `Pagamento confirmado, mas houve erro ao enviar fichas: ${sendPayload.error ?? "erro desconhecido"}.\n\n` +
              `- **Pedido**: ${pendingPaymentOrderNsu}\n` +
              `- **Fichas**: ${result.fichas}, UID: ${result.target_player_id}\n\n` +
              `Envie as fichas manualmente.`,
            );
          }
        } catch (err) {
          console.error("[payment-waiter] Auto-send chips failed:", err);
          addLocalMessage(
            `Pagamento confirmado, mas erro ao enviar fichas automaticamente.\n\n` +
            `- **Pedido**: ${pendingPaymentOrderNsu}\n` +
            `- **Fichas**: ${result.fichas}, UID: ${result.target_player_id}\n\n` +
            `Envie as fichas manualmente.`,
          );
        }
      } else {
        addLocalMessage(
          `Pagamento confirmado!\n\n` +
          `- **Pedido**: ${pendingPaymentOrderNsu}\n` +
          `- **Valor**: R$ ${result.paid_amount} (${result.capture_method})\n` +
          `- **Fichas a entregar**: ${result.fichas}\n\n` +
          `Envie as fichas manualmente.`,
        );
      }

      // Brief delay so user sees "Pagamento confirmado!" before banner disappears
      setTimeout(() => setPendingPaymentOrderNsu(null), 3000);
    },
    onTimeout: () => {
      setTimeout(() => setPendingPaymentOrderNsu(null), 5000);
    },
  });

  const transportError = (chat as { error?: Error | null }).error ?? null;

  const {
    agentStatus,
    agentProgressText,
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
    }, CHAT_REQUEST_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [status, stop]);

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
                    {/* Inline approval cards — rendered inside chat flow */}
                    {approvalParts.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {approvalParts.map((approval) => (
                          <ApprovalCard
                            key={approval.id}
                            approval={approval}
                            isStreaming={status === "streaming" || status === "submitted"}
                            onPaymentLinkGenerated={handlePaymentLinkGenerated}
                          />
                        ))}
                      </div>
                    )}
                    <ChatStatusIndicators
                      agentStatus={agentStatus}
                      agentProgressText={agentProgressText}
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
            "fixed bottom-0 left-0 md:left-[56px]",
            isPinned && "md:left-[240px]",
            hasMessages && "transition-all duration-300 ease-in-out",
            showCanvas ? "right-0 md:right-[600px]" : "right-0",
          )}
        >
          <ChatProgressTimeline
            status={status}
            agentStatus={agentStatus}
            agentProgressText={agentProgressText}
            currentToolCall={currentToolCall}
            artifactStage={artifactStage}
            artifactType={artifactType}
            currentSection={currentSection}
            bankAccountRequired={bankAccountRequired}
          />
          <ChatInput />
        </div>
      </div>

      {/* Floating payment status banner */}
      {pendingPaymentOrderNsu && (
        <div
          className={cn(
            "fixed z-30",
            "left-0 md:left-[56px]",
            isPinned && "md:left-[240px]",
            showCanvas ? "right-0 md:right-[600px]" : "right-0",
          )}
          style={{ bottom: "88px" }}
        >
          <div className="flex justify-center px-4">
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg border",
                paymentWaiter.status === "polling" &&
                  "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:border-amber-800",
                paymentWaiter.status === "confirmed" &&
                  "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/60 dark:text-green-200 dark:border-green-800",
                paymentWaiter.status === "timeout" &&
                  "bg-muted text-muted-foreground border-border",
              )}
            >
              {paymentWaiter.status === "polling" && (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>
                    Aguardando pagamento... (
                    {Math.round(paymentWaiter.elapsedMs / 1000)}s)
                  </span>
                </>
              )}
              {paymentWaiter.status === "confirmed" && (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Pagamento confirmado!</span>
                </>
              )}
              {paymentWaiter.status === "timeout" && (
                <>
                  <Clock className="size-4" />
                  <span>
                    Pagamento nao detectado. Diga &quot;paguei&quot; quando
                    concluir.
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
