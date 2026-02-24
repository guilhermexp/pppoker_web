"use client";

import { useI18n } from "@/locales/client";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { useChat } from "@ai-sdk-tools/store";
import { createClient } from "@midpoker/supabase/client";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { useToast } from "@midpoker/ui/use-toast";
import {
  Send,
  Wallet,
  Link,
  ShieldCheck,
  ShieldX,
  UserPlus,
  UserMinus,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface ApprovalData {
  id: string;
  action: string;
  params: Record<string, unknown>;
  summary: string;
}

type ApprovalStatus = "pending" | "approved" | "rejected";

const ACTION_CONFIG: Record<
  string,
  { icon: typeof Send; color: string; bgColor: string }
> = {
  enviar_fichas: {
    icon: Send,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
  },
  sacar_fichas: {
    icon: Wallet,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/40",
  },
  gerar_link_pagamento: {
    icon: Link,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/40",
  },
  aprovar_solicitacao: {
    icon: ShieldCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  rejeitar_solicitacao: {
    icon: ShieldX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/40",
  },
  promover_membro: {
    icon: UserPlus,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/40",
  },
  remover_membro: {
    icon: UserMinus,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/40",
  },
};

const DEFAULT_CONFIG = {
  icon: ShieldCheck,
  color: "text-foreground",
  bgColor: "bg-card",
};

interface ApprovalCardProps {
  approval: ApprovalData;
  isStreaming?: boolean;
  onResolved?: (status: ApprovalStatus) => void;
}

export function ApprovalCard({
  approval,
  isStreaming,
  onResolved,
}: ApprovalCardProps) {
  const t = useI18n();
  const { status: chatStatus } = useChat();
  const { toast } = useToast();
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [status, setStatus] = useState<ApprovalStatus>("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const initialAmount =
    typeof approval.params.amount === "number"
      ? String(approval.params.amount)
      : "";
  const [amountInput, setAmountInput] = useState(initialAmount);

  const config = ACTION_CONFIG[approval.action] ?? DEFAULT_CONFIG;
  const Icon = config.icon;

  const actionLabel =
    (t as any)(`approval.action_${approval.action}`) ??
    approval.action.replace(/_/g, " ");

  const formatParamLabel = (key: string): string => {
    const translated = (t as any)(`approval.param_${key}`);
    if (translated && !translated.startsWith("approval.param_")) {
      return translated;
    }
    return key.replace(/_/g, " ");
  };

  const formatParamValue = (value: unknown): string => {
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "Sim" : "Nao";
    return String(value ?? "");
  };

  useEffect(() => {
    setAmountInput(initialAmount);
    setResultText(null);
    setStatus("pending");
  }, [approval.id, initialAmount]);

  const handleApprove = useCallback(async () => {
    if (isSubmitting || status !== "pending") return;

    setIsSubmitting(true);
    setResultText(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const normalizedInput: Record<string, unknown> = { ...approval.params };
      if (typeof approval.params.amount === "number") {
        const parsedAmount = Number.parseInt(amountInput.trim(), 10);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
          throw new Error("Informe um valor valido maior que zero.");
        }
        normalizedInput.amount = parsedAmount;
      }

      const response = await fetch(`${apiBaseUrl}/nanobot/tools/invoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          toolName: approval.action,
          input: normalizedInput,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
        output?: unknown;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Falha ao executar ${approval.action}`);
      }

      setStatus("approved");
      const executionText =
        typeof payload.output === "string"
          ? payload.output
          : "Operacao executada com sucesso.";
      setResultText(executionText);
      onResolved?.("approved");
      toast({
        title: "Enviado",
        description: executionText,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado";
      setResultText(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [apiBaseUrl, approval.action, approval.params, amountInput, isSubmitting, status]);

  const handleReject = useCallback(() => {
    if (isSubmitting || status !== "pending") return;
    setIsSubmitting(true);
    setStatus("rejected");
    setResultText("Operacao cancelada.");
    onResolved?.("rejected");
    setIsSubmitting(false);
  }, [isSubmitting, onResolved, status]);

  const isBusy =
    isStreaming || chatStatus === "streaming" || chatStatus === "submitted";
  const buttonsDisabled = status !== "pending" || isSubmitting || isBusy;

  return (
    <div
      className={cn(
        "w-full border rounded-xl overflow-hidden border-border bg-card text-card-foreground shadow-sm",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div
          className={cn(
            "flex items-center justify-center size-8 rounded-md",
            "text-foreground bg-muted",
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {actionLabel}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {approval.summary}
          </p>
        </div>
        {status !== "pending" && (
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              status === "approved" &&
                "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
              status === "rejected" &&
                "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
            )}
          >
            {status === "approved" ? (
              <CheckCircle2 className="size-3" />
            ) : (
              <XCircle className="size-3" />
            )}
            {status === "approved"
              ? t("approval.approved")
              : t("approval.rejected")}
          </div>
        )}
      </div>

      {/* Params */}
      {Object.keys(approval.params).length > 0 && (
        <div className="px-4 py-2 space-y-1">
          {Object.entries(approval.params).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatParamLabel(key)}
              </span>
              {key === "amount" && typeof value === "number" ? (
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  disabled={buttonsDisabled}
                  className="w-28 rounded-md border border-input bg-background px-2 py-1 text-right font-medium text-foreground"
                />
              ) : (
                <span className="font-medium text-foreground">
                  {formatParamValue(value)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer with buttons */}
      {status === "pending" && (
        <div className="flex gap-2 px-4 py-3 border-t border-border">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={buttonsDisabled}
            className="flex-1"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="size-4 mr-1" />
            )}
            {t("approval.approve")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            disabled={buttonsDisabled}
            className="flex-1"
          >
            <XCircle className="size-4 mr-1" />
            {t("approval.reject")}
          </Button>
        </div>
      )}

      {resultText && (
        <div className="px-4 py-3 border-t border-border text-sm text-muted-foreground">
          {resultText}
        </div>
      )}
    </div>
  );
}
