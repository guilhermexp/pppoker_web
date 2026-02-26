"use client";

import { CommandMenu } from "@/components/chat/command-menu";
import { RecordButton } from "@/components/chat/record-button";
import { SuggestedPrompts } from "@/components/chat/suggested-prompts";
import { SuggestedActions } from "@/components/suggested-actions";
import { SuggestedActionsButton } from "@/components/suggested-actions-button";
import { WebSearchButton } from "@/components/web-search-button";
import { useChatInterface } from "@/hooks/use-chat-interface";
import type { CommandSuggestion } from "@/lib/chat-commands";
import { useI18n } from "@/locales/client";
import { useChatStore } from "@/store/chat";
import { useArtifacts } from "@ai-sdk-tools/artifacts/client";
import {
  useChatActions,
  useChatId,
  useChatStatus,
  useDataPart,
} from "@ai-sdk-tools/store";
import { useSidebarPinned } from "@/components/sidebar-context";
import { Skeleton } from "@midpoker/ui/skeleton";
import { cn } from "@midpoker/ui/cn";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@midpoker/ui/prompt-input";
import { parseAsString, useQueryState } from "nuqs";
import { Suspense, useRef } from "react";

export interface ChatInputMessage extends PromptInputMessage {
  metadata?: {
    agentChoice?: string;
    toolChoice?: string;
  };
}

export function ChatInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = useI18n();

  const status = useChatStatus();
  const { sendMessage, stop } = useChatActions();
  const chatId = useChatId();
  const { setChatId, startNewSession, isHome } = useChatInterface();

  const [, clearSuggestions] = useDataPart<{ prompts: string[] }>(
    "suggestions",
  );

  const [selectedType] = useQueryState("artifact-type", parseAsString);

  const isCanvasVisible = !!selectedType;

  const { isPinned } = useSidebarPinned();

  const {
    input,
    isWebSearch,
    isUploading,
    isRecording,
    isProcessing,
    showCommands,
    selectedCommandIndex,
    filteredCommands,
    setInput,
    handleInputChange,
    handleKeyDown,
    resetCommandState,
  } = useChatStore();

  const executeCommandSuggestion = (selectedCommand: CommandSuggestion) => {
    if (selectedCommand.executionType === "ui") {
      if (selectedCommand.uiAction === "new_session") {
        startNewSession();
      }
      setInput("");
      resetCommandState();
      return;
    }

    if (selectedCommand.executionType === "insert") {
      useChatStore.getState().handleCommandSelect(selectedCommand);
      return;
    }

    if (!chatId || !selectedCommand.toolName) return;

    clearSuggestions();
    setChatId(chatId);

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: selectedCommand.title }],
      metadata: {
        toolCall: {
          toolName: selectedCommand.toolName,
          toolParams: selectedCommand.toolParams ?? {},
        },
      },
    });

    setInput("");
    resetCommandState();
  };

  const handleSubmit = (message: ChatInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    // If currently streaming, stop the current stream first
    if (status === "streaming" || status === "submitted") {
      stop?.();
      // Continue to send the new message after stopping
    }

    // Clear old suggestions before sending new message
    clearSuggestions();

    // Set chat ID to ensure proper URL routing
    if (chatId) {
      setChatId(chatId);
    }

    sendMessage({
      text: message.text || "Sent with attachments",
      files: message.files,
      metadata: {
        agentChoice: message.metadata?.agentChoice,
        toolChoice: message.metadata?.toolChoice,
      },
    });
    setInput("");
    resetCommandState();
  };

  const handleStopClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission when stopping
    e.preventDefault();
    e.stopPropagation();

    if (status === "streaming" || status === "submitted") {
      stop?.();
    }
  };

  return (
    <>
      {isHome && (
        <div
          className={cn(
            "fixed bottom-[160px] z-30 transition-all duration-300 ease-in-out",
            "left-0 px-4 md:px-6",
            isPinned ? "md:left-[240px]" : "md:left-[56px]",
            isCanvasVisible ? "right-0 md:right-[603px]" : "right-0",
          )}
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center">
                <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                  {["w-28", "w-32", "w-36", "w-28", "w-32", "w-28"].map(
                    (width, index) => (
                      <Skeleton
                        key={`sa-skel-${index}`}
                        className={`${width} h-[34px] border border-[#e6e6e6] dark:border-[#1d1d1d] flex-shrink-0`}
                      />
                    ),
                  )}
                </div>
              </div>
            }
          >
            <SuggestedActions />
          </Suspense>
        </div>
      )}
      <div
        className={cn(
          "fixed bottom-6 z-20 transition-all duration-300 ease-in-out",
          "left-0 px-4 md:px-6",
          isPinned ? "md:left-[240px]" : "md:left-[56px]",
          isCanvasVisible ? "right-0 md:right-[603px]" : "right-0",
        )}
      >
        <div className="mx-auto w-full pt-2 max-w-full md:max-w-[770px] relative">
          <SuggestedPrompts />
          <CommandMenu />

          <PromptInput onSubmit={handleSubmit} globalDrop multiple>
            <PromptInputBody>
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
              <PromptInputTextarea
                ref={textareaRef}
                autoFocus
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  // Handle Enter key for commands
                  if (e.key === "Enter" && showCommands) {
                    e.preventDefault();
                    const selectedCommand =
                      filteredCommands[selectedCommandIndex];
                    if (selectedCommand) {
                      executeCommandSuggestion(selectedCommand);
                    }
                    return;
                  }

                  // Handle Enter key for normal messages - trigger form submission
                  if (e.key === "Enter" && !showCommands && !e.shiftKey) {
                    // Don't submit if IME composition is in progress
                    if (e.nativeEvent.isComposing) {
                      return;
                    }

                    e.preventDefault();
                    const form = e.currentTarget.form;
                    if (form) {
                      form.requestSubmit();
                    }
                    return;
                  }

                  // Handle other keys normally
                  handleKeyDown(e);
                }}
                value={input}
                placeholder={
                  isWebSearch ? t("chat.search_web") : t("chat.ask_anything")
                }
              />
            </PromptInputBody>
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputActionAddAttachments />
                <SuggestedActionsButton />
                <WebSearchButton />
              </PromptInputTools>

              <PromptInputTools>
                <RecordButton size={16} />
                <PromptInputSubmit
                  disabled={
                    // Enable button when streaming so user can stop
                    status === "streaming" || status === "submitted"
                      ? false
                      : (!input && !status) ||
                        isUploading ||
                        isRecording ||
                        isProcessing
                  }
                  status={status}
                  onClick={
                    status === "streaming" || status === "submitted"
                      ? handleStopClick
                      : undefined
                  }
                />
              </PromptInputTools>
            </PromptInputToolbar>
          </PromptInput>
        </div>
      </div>
    </>
  );
}
