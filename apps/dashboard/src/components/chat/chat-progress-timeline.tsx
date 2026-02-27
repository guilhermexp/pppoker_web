"use client";

import {
  getArtifactSectionMessageForStatus,
  getArtifactStageMessageForStatus,
  getStatusMessage,
  getToolMessage,
} from "@/lib/agent-utils";
import type { ArtifactStage, ArtifactType } from "@/lib/artifact-config";
import type { AgentStatus } from "@/types/agents";
import { cn } from "@midpoker/ui/cn";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TimelineEntry = {
  id: number;
  text: string;
  at: number;
  kind: "status" | "progress" | "tool" | "artifact" | "system";
  fingerprint: string;
};

interface ChatProgressTimelineProps {
  status?: string;
  agentStatus: AgentStatus | null;
  agentProgressText?: string | null;
  currentToolCall: string | null;
  artifactStage?: ArtifactStage | null;
  artifactType?: ArtifactType | null;
  currentSection?: string | null;
  bankAccountRequired?: boolean;
}

const MAX_ENTRIES = 6;

function formatElapsed(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatAge(entryAt: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - entryAt) / 1000));
  return seconds === 0 ? "agora" : `${seconds}s atrás`;
}

export function ChatProgressTimeline({
  status,
  agentStatus,
  agentProgressText,
  currentToolCall,
  artifactStage,
  artifactType,
  currentSection,
  bankAccountRequired = false,
}: ChatProgressTimelineProps) {
  const isStreaming = status === "streaming" || status === "submitted";
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [lastActivityAt, setLastActivityAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const seqRef = useRef(0);
  const wasStreamingRef = useRef(false);
  const lastFingerprintRef = useRef<string>("");

  const appendEntry = useCallback(
    (
      text: string | null | undefined,
      kind: TimelineEntry["kind"],
      fingerprint: string,
    ) => {
      const cleaned = (text ?? "").trim();
      if (!cleaned) return;
      if (lastFingerprintRef.current === fingerprint) return;
      lastFingerprintRef.current = fingerprint;

      const timestamp = Date.now();
      setLastActivityAt(timestamp);
      setEntries((prev) => {
        const next: TimelineEntry[] = [
          ...prev,
          {
            id: ++seqRef.current,
            text: cleaned,
            at: timestamp,
            kind,
            fingerprint,
          },
        ];
        return next.slice(-MAX_ENTRIES);
      });
    },
    [],
  );

  useEffect(() => {
    if (!isStreaming) {
      wasStreamingRef.current = false;
      setStartedAt(null);
      setLastActivityAt(null);
      lastFingerprintRef.current = "";
      setEntries([]);
      return;
    }

    if (!wasStreamingRef.current) {
      wasStreamingRef.current = true;
      const ts = Date.now();
      setStartedAt(ts);
      setLastActivityAt(ts);
      lastFingerprintRef.current = "";
      setEntries([]);
      appendEntry(
        status === "submitted"
          ? "Mensagem enviada para o Nanobot"
          : "Nanobot iniciou o processamento",
        "system",
        `system:start:${status}`,
      );
    }
  }, [appendEntry, isStreaming, status]);

  useEffect(() => {
    if (!isStreaming) return;
    const message = getStatusMessage(agentStatus);
    if (!message) return;
    appendEntry(
      message,
      "status",
      `status:${agentStatus?.agent}:${agentStatus?.status}`,
    );
  }, [agentStatus, appendEntry, isStreaming]);

  useEffect(() => {
    if (!isStreaming || !currentToolCall) return;
    const friendly = getToolMessage(currentToolCall);
    const text = friendly
      ? `Executando ${currentToolCall}: ${friendly.replace(/\.\.\.$/, "")}`
      : `Executando tool: ${currentToolCall}`;
    appendEntry(text, "tool", `tool:${currentToolCall}`);
  }, [appendEntry, currentToolCall, isStreaming]);

  useEffect(() => {
    if (!isStreaming) return;
    const text = agentProgressText?.trim();
    if (!text) return;
    appendEntry(text, "progress", `progress:${text}`);
  }, [agentProgressText, appendEntry, isStreaming]);

  useEffect(() => {
    if (!isStreaming) return;
    const sectionMessage = getArtifactSectionMessageForStatus(
      artifactType ?? null,
      currentSection ?? null,
    );
    if (sectionMessage) {
      appendEntry(
        sectionMessage,
        "artifact",
        `artifact-section:${artifactType}:${currentSection}`,
      );
      return;
    }
    const stageMessage = getArtifactStageMessageForStatus(
      artifactType ?? null,
      artifactStage ?? null,
    );
    if (stageMessage) {
      appendEntry(
        stageMessage,
        "artifact",
        `artifact-stage:${artifactType}:${artifactStage}`,
      );
    }
  }, [appendEntry, artifactStage, artifactType, currentSection, isStreaming]);

  useEffect(() => {
    if (!isStreaming) return;
    setNow(Date.now());
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [isStreaming]);

  const elapsedSeconds =
    startedAt && isStreaming
      ? Math.max(0, Math.floor((now - startedAt) / 1000))
      : 0;
  const staleSeconds =
    lastActivityAt && isStreaming
      ? Math.max(0, Math.floor((now - lastActivityAt) / 1000))
      : 0;
  const showIdleWarning = staleSeconds >= 12;

  const title = useMemo(() => {
    if (status === "submitted") return "Enviando...";
    if (isStreaming) return "Nanobot em execução";
    return "Atividade";
  }, [isStreaming, status]);

  if (bankAccountRequired || !isStreaming) {
    return null;
  }

  return (
    <div className="px-4 pb-2">
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{formatElapsed(elapsedSeconds)}</span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5",
                showIdleWarning
                  ? "border-amber-500/40 text-amber-700 dark:text-amber-300"
                  : "border-border/60",
              )}
            >
              {showIdleWarning
                ? `Sem atualização há ${staleSeconds}s`
                : `Atualizado ${staleSeconds === 0 ? "agora" : `${staleSeconds}s atrás`}`}
            </span>
          </div>
        </div>

        <div className="max-h-28 overflow-y-auto px-3 py-2">
          <ol className="space-y-1.5">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-2 text-xs">
                <span
                  className={cn(
                    "mt-1 block size-1.5 shrink-0 rounded-full",
                    entry.kind === "tool" && "bg-blue-500",
                    entry.kind === "progress" && "bg-emerald-500",
                    entry.kind === "status" && "bg-violet-500",
                    entry.kind === "artifact" && "bg-orange-500",
                    entry.kind === "system" && "bg-muted-foreground",
                  )}
                />
                <span className="min-w-0 flex-1 text-foreground/90 break-words">
                  {entry.text}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatAge(entry.at, now)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
