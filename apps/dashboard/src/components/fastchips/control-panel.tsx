"use client";

import {
  useFastchipsServiceMutation,
  useFastchipsServiceQuery,
} from "@/hooks/use-team";
import { useI18n } from "@/locales/client";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { createClient } from "@midpoker/supabase/client";
import { Button } from "@midpoker/ui/button";
import { Card, CardContent } from "@midpoker/ui/card";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@midpoker/ui/select";
import { Switch } from "@midpoker/ui/switch";
import { useToast } from "@midpoker/ui/use-toast";
import { cn } from "@midpoker/ui/cn";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Gateway status hook (polls nanobot gateway)
// ---------------------------------------------------------------------------
type GatewayData = {
  whatsapp: { status: string; has_qr: boolean };
  telegram: { status: string; has_token: boolean };
} | null;

function useGatewayStatus() {
  const [data, setData] = useState<GatewayData>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const apiBase = getApiBaseUrl();
      const resp = await fetch(`${apiBase}/nanobot/gateway/status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (resp.ok) {
        const json = await resp.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { data, loading, refetch: fetchStatus };
}

// ---------------------------------------------------------------------------
// WhatsApp reconnect (inline QR modal)
// ---------------------------------------------------------------------------
type ReconnectStatus =
  | { step: "idle" }
  | { step: "connecting" }
  | { step: "creating_sandbox" }
  | { step: "waiting_qr"; qrData: string }
  | { step: "connected" }
  | { step: "error"; message: string };

function WhatsAppReconnect({
  onConnected,
  onCancel,
}: {
  onConnected: () => void;
  onCancel: () => void;
}) {
  const t = useI18n();
  const serviceMutation = useFastchipsServiceMutation();
  const [status, setStatus] = useState<ReconnectStatus>({ step: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const cleanup = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    startConnect();
    return cleanup;
  }, []);

  async function startConnect() {
    cleanup();
    setStatus({ step: "connecting" });

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setStatus({
        step: "error",
        message: "Sessao expirada. Recarregue a pagina.",
      });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const apiBase = getApiBaseUrl();
      const resp = await fetch(`${apiBase}/nanobot/gateway/whatsapp/qr`, {
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${session.access_token}`,
        },
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const text = await resp.text().catch(() => "");
        setStatus({
          step: "error",
          message: text || `Erro do servidor (${resp.status})`,
        });
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const raw = line.slice(5).trim();
            if (raw === "[DONE]") continue;

            try {
              const data = JSON.parse(raw);

              if (
                currentEvent === "status" &&
                data.status === "creating_sandbox"
              ) {
                setStatus({ step: "creating_sandbox" });
              } else if (currentEvent === "qr" && data.qr_data) {
                setStatus({ step: "waiting_qr", qrData: data.qr_data });
              } else if (currentEvent === "connected") {
                setStatus({ step: "connected" });
                serviceMutation.mutate({
                  gateway: {
                    whatsappLinked: true,
                    whatsappLinkedAt: new Date().toISOString(),
                  },
                });
                onConnected();
                return;
              } else if (currentEvent === "error") {
                setStatus({
                  step: "error",
                  message: data.error || "Erro desconhecido",
                });
                return;
              }
            } catch {
              // ignore parse errors
            }
            currentEvent = "";
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus({
        step: "error",
        message: err instanceof Error ? err.message : "Falha na conexao",
      });
    }
  }

  return (
    <div className="space-y-4">
      {(status.step === "connecting" || status.step === "creating_sandbox") && (
        <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
          <div className="text-center text-muted-foreground">
            <div className="h-6 w-6 mx-auto mb-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">
              {status.step === "creating_sandbox"
                ? t("fastchips.service.gateway_creating_sandbox")
                : t("fastchips.service.gateway_connecting")}
            </p>
          </div>
        </div>
      )}

      {status.step === "waiting_qr" && (
        <div className="space-y-3">
          <div className="flex justify-center rounded-lg border bg-white p-4">
            <QRCodeSVG value={status.qrData} size={200} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {t("fastchips.service.gateway_scan_qr")}
          </p>
        </div>
      )}

      {status.step === "error" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{status.message}</p>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          {t("fastchips.service.gateway_cancel")}
        </Button>
        {status.step === "error" && (
          <Button type="button" size="sm" onClick={startConnect}>
            {t("fastchips.service.gateway_retry")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status section
// ---------------------------------------------------------------------------
function StatusIndicator({
  label,
  active,
  detail,
}: {
  label: string;
  active: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            active ? "bg-green-500" : "bg-muted-foreground/40",
          )}
        />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {detail && (
        <span className="text-xs text-muted-foreground">{detail}</span>
      )}
    </div>
  );
}

function ServiceStatusSection() {
  const t = useI18n();
  const { data: service } = useFastchipsServiceQuery();
  const { data: gw, loading: gwLoading, refetch: refetchGw } = useGatewayStatus();
  const [showReconnect, setShowReconnect] = useState(false);

  const whatsappActive =
    service.gateway.whatsappLinked || gw?.whatsapp?.status === "connected";
  const telegramActive =
    service.gateway.telegramLinked || gw?.telegram?.status === "connected";

  return (
    <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div>
        <h2 className="text-lg font-semibold">
          {t("fastchips.controle.status_title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {t("fastchips.controle.status_description")}
        </p>
      </div>
      <Card>
        <CardContent className="p-5 space-y-1">
          <StatusIndicator
            label={t("fastchips.controle.status_service")}
            active={service.status === "active"}
            detail={
              service.activatedAt
                ? new Date(service.activatedAt).toLocaleDateString("pt-BR")
                : undefined
            }
          />
          <StatusIndicator
            label={t("fastchips.controle.status_agent")}
            active={service.setupSteps.nanobotConfigured}
          />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  whatsappActive
                    ? "bg-green-500"
                    : "bg-muted-foreground/40",
                )}
              />
              <span className="text-sm font-medium">
                {t("fastchips.controle.status_whatsapp")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {gwLoading ? (
                <span className="text-xs text-muted-foreground">...</span>
              ) : whatsappActive ? (
                <span className="text-xs text-green-600">
                  {t("fastchips.service.gateway_connected")}
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowReconnect(true)}
                >
                  {t("fastchips.controle.reconnect_whatsapp")}
                </Button>
              )}
            </div>
          </div>
          <StatusIndicator
            label={t("fastchips.controle.status_telegram")}
            active={telegramActive}
          />

          {showReconnect && (
            <div className="mt-4 pt-4 border-t">
              <WhatsAppReconnect
                onConnected={() => {
                  setShowReconnect(false);
                  refetchGw();
                }}
                onCancel={() => setShowReconnect(false)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Control panel (player settings + status)
// ---------------------------------------------------------------------------
export function FastChipsControlPanel() {
  const t = useI18n();
  const { data: service } = useFastchipsServiceQuery();
  const mutation = useFastchipsServiceMutation();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  // Local state initialized from server data
  const cp = service.controlPanel;
  const [minPurchase, setMinPurchase] = useState(cp.minPurchaseReais);
  const [minWithdraw, setMinWithdraw] = useState(cp.minWithdrawReais);
  const [dailyLimit, setDailyLimit] = useState(cp.dailyLimit);
  const [notifications, setNotifications] = useState(cp.notificationsEnabled);
  const [withdrawType, setWithdrawType] = useState(cp.withdrawType);
  const [maxWithdraw, setMaxWithdraw] = useState(cp.maxWithdrawReais);
  const [leagueId, setLeagueId] = useState(cp.leagueId);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync when server data changes (e.g. after save)
  useEffect(() => {
    setMinPurchase(cp.minPurchaseReais);
    setMinWithdraw(cp.minWithdrawReais);
    setDailyLimit(cp.dailyLimit);
    setNotifications(cp.notificationsEnabled);
    setWithdrawType(cp.withdrawType);
    setMaxWithdraw(cp.maxWithdrawReais);
    setLeagueId(cp.leagueId);
  }, [
    cp.minPurchaseReais,
    cp.minWithdrawReais,
    cp.dailyLimit,
    cp.notificationsEnabled,
    cp.withdrawType,
    cp.maxWithdrawReais,
    cp.leagueId,
  ]);

  function handleSave() {
    mutation.mutate(
      {
        controlPanel: {
          minPurchaseReais: minPurchase,
          minWithdrawReais: minWithdraw,
          dailyLimit,
          notificationsEnabled: notifications,
          withdrawType,
          maxWithdrawReais: maxWithdraw,
          leagueId,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: t("fastchips.controle.saved"),
            duration: 3000,
          });
        },
      },
    );
  }

  return (
    <div className="space-y-8">
      {/* Service status */}
      <ServiceStatusSection />

      {/* Player controls */}
      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          <h2 className="text-lg font-semibold">
            {t("fastchips.controle.players_title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {t("fastchips.controle.players_description")}
          </p>
        </div>
        <Card>
          <CardContent className="space-y-5 p-5">
            <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
              <span className="text-sm font-medium">
                {t("fastchips.controle.min_purchase")}
              </span>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-10 items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  className="max-w-[160px]"
                  type="number"
                  min={1}
                  value={minPurchase}
                  onChange={(e) =>
                    setMinPurchase(Number(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
              <span className="text-sm font-medium">
                {t("fastchips.controle.min_withdraw")}
              </span>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-10 items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  className="max-w-[160px]"
                  type="number"
                  min={1}
                  value={minWithdraw}
                  onChange={(e) =>
                    setMinWithdraw(Number(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
              <span className="text-sm font-medium">
                {t("fastchips.controle.daily_limit")}
              </span>
              <Input
                className="max-w-[120px]"
                type="number"
                min={1}
                value={dailyLimit}
                onChange={(e) =>
                  setDailyLimit(Number(e.target.value) || 0)
                }
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
              <span className="text-sm font-medium">
                {t("fastchips.controle.notifications")}
              </span>
              <div className="flex items-center gap-3">
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
                <span className="text-sm text-muted-foreground">
                  {t("fastchips.controle.notifications_enabled")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Withdraw settings */}
      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          <h2 className="text-lg font-semibold">
            {t("fastchips.controle.withdraw_title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {t("fastchips.controle.withdraw_description")}
          </p>
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
                <span className="text-sm font-medium">
                  {t("fastchips.controle.withdraw_type")}
                </span>
                {mounted ? (
                  <Select
                    value={withdrawType}
                    onValueChange={(v: "auto" | "manual") =>
                      setWithdrawType(v)
                    }
                  >
                    <SelectTrigger className="max-w-[240px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        {t("fastchips.controle.withdraw_auto")}
                      </SelectItem>
                      <SelectItem value="manual">
                        {t("fastchips.controle.withdraw_manual")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-9 max-w-[240px] rounded-md border border-border bg-muted/30" />
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
                <span className="text-sm font-medium">
                  {t("fastchips.controle.max_value")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-10 items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    className="max-w-[160px]"
                    type="number"
                    min={1}
                    value={maxWithdraw}
                    onChange={(e) =>
                      setMaxWithdraw(Number(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <Icons.InfoOutline className="h-4 w-4 mt-0.5" />
            <span>{t("fastchips.controle.withdraw_notice")}</span>
          </div>
        </div>
      </section>

      {/* League ID */}
      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          <h2 className="text-lg font-semibold">
            {t("fastchips.controle.league_title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {t("fastchips.controle.league_description")}
          </p>
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
                <span className="text-sm font-medium">
                  {t("fastchips.controle.league_id")}
                </span>
                <Input
                  className="max-w-[240px]"
                  value={leagueId}
                  onChange={(e) => setLeagueId(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <Icons.InfoOutline className="h-4 w-4 mt-0.5" />
            <span>{t("fastchips.controle.league_notice")}</span>
          </div>
        </div>
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending
            ? t("fastchips.controle.saving")
            : t("fastchips.controle.save")}
        </Button>
      </div>
    </div>
  );
}
