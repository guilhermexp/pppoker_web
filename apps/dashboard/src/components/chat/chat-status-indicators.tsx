"use client";

import { AnimatedStatus } from "@/components/animated-status";
import {
  getArtifactSectionMessageForStatus,
  getArtifactStageMessageForStatus,
  getStatusMessage,
  getToolMessage,
} from "@/lib/agent-utils";
import {
  type ArtifactStage,
  type ArtifactType,
  TOOL_TO_ARTIFACT_MAP,
  getArtifactTypeFromTool,
} from "@/lib/artifact-config";
import { getToolIcon } from "@/lib/tool-config";
import type { AgentStatus } from "@/types/agents";
import { Loader } from "@midpoker/ui/loader";
import { useEffect, useMemo, useRef, useState } from "react";

interface ChatStatusIndicatorsProps {
  agentStatus: AgentStatus | null;
  agentProgressText?: string | null;
  currentToolCall: string | null;
  status?: string;
  artifactStage?: ArtifactStage | null;
  artifactType?: ArtifactType | null;
  currentSection?: string | null;
  bankAccountRequired?: boolean;
}

export function ChatStatusIndicators({
  agentStatus,
  agentProgressText,
  currentToolCall,
  status,
  artifactStage,
  artifactType,
  currentSection,
  bankAccountRequired = false,
}: ChatStatusIndicatorsProps) {
  const statusMessage = getStatusMessage(agentStatus);
  const toolMessage = getToolMessage(currentToolCall);

  // Determine artifact type from tool name or use provided artifact type
  const resolvedArtifactType =
    artifactType || getArtifactTypeFromTool(currentToolCall);
  const isStreaming = status === "streaming" || status === "submitted";
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [lastActivityAt, setLastActivityAt] = useState<number | null>(null);
  const [sessionProgressText, setSessionProgressText] = useState<string | null>(
    null,
  );
  const wasStreamingRef = useRef(false);
  const lastActivitySignatureRef = useRef("");

  // Show artifact status when:
  // 1. Tool is actively running and maps to an artifact, OR
  // 2. Artifact exists and is still being built (not complete or still streaming)
  const shouldShowArtifactStatus =
    resolvedArtifactType &&
    artifactStage &&
    (currentToolCall || (artifactStage !== "analysis_ready" && isStreaming));

  let displayMessage: string | null = null;
  if (shouldShowArtifactStatus) {
    // Show section message if available, otherwise show stage message
    const sectionMessage = getArtifactSectionMessageForStatus(
      resolvedArtifactType,
      currentSection ?? null,
    );
    const stageMessage = getArtifactStageMessageForStatus(
      resolvedArtifactType,
      artifactStage,
    );
    displayMessage = sectionMessage || stageMessage;
  } else {
    // Default behavior: prioritize tool message over agent status
    displayMessage = toolMessage || statusMessage;
  }

  useEffect(() => {
    if (!isStreaming) {
      setStartedAt(null);
      setLastActivityAt(null);
      setSessionProgressText(null);
      lastActivitySignatureRef.current = "";
      wasStreamingRef.current = false;
      return;
    }

    if (!wasStreamingRef.current) {
      const nowTs = Date.now();
      setStartedAt(nowTs);
      setLastActivityAt(nowTs);
      setSessionProgressText(null);
      lastActivitySignatureRef.current = "";
      wasStreamingRef.current = true;
    }
  }, [isStreaming]);

  useEffect(() => {
    const text = agentProgressText?.trim();
    if (!isStreaming || !text) return;
    setSessionProgressText(text);
  }, [agentProgressText, isStreaming]);

  const activitySignature = useMemo(
    () =>
      JSON.stringify({
        agent: agentStatus?.agent ?? null,
        state: agentStatus?.status ?? null,
        tool: currentToolCall ?? null,
        stage: artifactStage ?? null,
        section: currentSection ?? null,
        progress: sessionProgressText ?? null,
      }),
    [
      agentStatus?.agent,
      agentStatus?.status,
      currentToolCall,
      artifactStage,
      currentSection,
      sessionProgressText,
    ],
  );

  useEffect(() => {
    if (!isStreaming) return;
    if (lastActivitySignatureRef.current === activitySignature) return;
    lastActivitySignatureRef.current = activitySignature;
    setLastActivityAt(Date.now());
  }, [activitySignature, isStreaming]);

  useEffect(() => {
    if (!isStreaming) return;
    setNow(Date.now());
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [isStreaming]);

  // Get icon for current tool - show icon when tool is running or when showing artifact status
  // Find the tool name that maps to the artifact type for icon display
  const getToolNameForArtifact = (type: ArtifactType | null): string | null => {
    if (!type) return null;
    const toolEntry = Object.entries(TOOL_TO_ARTIFACT_MAP).find(
      ([, artifactType]) => artifactType === type,
    );
    return toolEntry ? toolEntry[0] : null;
  };

  const toolIcon = currentToolCall
    ? getToolIcon(currentToolCall)
    : displayMessage &&
        artifactStage &&
        artifactStage !== "analysis_ready" &&
        resolvedArtifactType
      ? getToolIcon(getToolNameForArtifact(resolvedArtifactType) || "")
      : null;

  const primaryMessage =
    sessionProgressText ||
    displayMessage ||
    (isStreaming
      ? status === "submitted"
        ? "Enviando para o Nanobot..."
        : "Nanobot processando sua solicitação..."
      : null);

  const elapsedSeconds =
    startedAt && isStreaming ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const staleSeconds =
    lastActivityAt && isStreaming
      ? Math.max(0, Math.floor((now - lastActivityAt) / 1000))
      : 0;
  const isPossiblyStuck = isStreaming && staleSeconds >= 12;

  if (bankAccountRequired) {
    return null;
  }

  if (!primaryMessage && !isStreaming) {
    return <div className="h-2" />;
  }

  return (
    <div className="mt-3">
      <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          {isStreaming && <Loader />}
          <AnimatedStatus
            text={primaryMessage ?? null}
            shimmerDuration={0.75}
            fadeDuration={0.1}
            variant="slide"
            className="text-xs font-normal leading-4"
            icon={toolIcon}
          />
        </div>

        {isStreaming && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>Processando ha {elapsedSeconds}s</span>
            {currentToolCall && (
              <span className="font-mono">tool: {currentToolCall}</span>
            )}
            {isPossiblyStuck ? (
              <span className="text-amber-600 dark:text-amber-400">
                Sem atualizacao ha {staleSeconds}s
              </span>
            ) : (
              staleSeconds >= 3 && <span>Ultima atualizacao ha {staleSeconds}s</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
