"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@midpoker/supabase/client";

export interface PaymentResult {
  paid: boolean;
  status: string;
  fichas: number | null;
  capture_method: string | null;
  paid_amount: number | null;
  target_player_id: number | null;
}

export interface UsePaymentWaiterOptions {
  orderNsu: string | null;
  enabled: boolean;
  apiBaseUrl: string;
  pollIntervalMs?: number;
  maxWaitMs?: number;
  onConfirmed: (result: PaymentResult) => void;
  onTimeout: () => void;
}

type WaiterStatus = "idle" | "polling" | "confirmed" | "timeout";

export interface UsePaymentWaiterReturn {
  isWaiting: boolean;
  elapsedMs: number;
  status: WaiterStatus;
}

export function usePaymentWaiter({
  orderNsu,
  enabled,
  apiBaseUrl,
  pollIntervalMs = 5000,
  maxWaitMs = 90000,
  onConfirmed,
  onTimeout,
}: UsePaymentWaiterOptions): UsePaymentWaiterReturn {
  const [status, setStatus] = useState<WaiterStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmedRef = useRef(false);

  // Keep callback refs stable to avoid re-triggering effect
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Track which orderNsu we started polling for to avoid double-start
  const startedForNsuRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !orderNsu) {
      cleanup();
      startedForNsuRef.current = null;
      setStatus("idle");
      return;
    }

    // Don't restart if already polling for this NSU
    if (startedForNsuRef.current === orderNsu) return;
    startedForNsuRef.current = orderNsu;

    confirmedRef.current = false;
    startRef.current = Date.now();
    setStatus("polling");
    setElapsedMs(0);

    const poll = async () => {
      if (confirmedRef.current) return;

      const elapsed = Date.now() - startRef.current;
      setElapsedMs(elapsed);

      if (elapsed >= maxWaitMs) {
        cleanup();
        setStatus("timeout");
        onTimeoutRef.current();
        return;
      }

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const resp = await fetch(
          `${apiBaseUrl}/nanobot/payment-status?order_nsu=${encodeURIComponent(orderNsu)}`,
          {
            headers: {
              Authorization: `Bearer ${session?.access_token ?? ""}`,
            },
          },
        );

        if (!resp.ok) return;

        const data = (await resp.json()) as PaymentResult;

        if (data.paid) {
          confirmedRef.current = true;
          cleanup();
          setStatus("confirmed");
          onConfirmedRef.current(data);
        }
      } catch {
        // Silently ignore network errors — will retry next interval
      }
    };

    // Initial poll
    poll();

    intervalRef.current = setInterval(poll, pollIntervalMs);

    return cleanup;
  }, [enabled, orderNsu, apiBaseUrl, pollIntervalMs, maxWaitMs, cleanup]);

  return {
    isWaiting: status === "polling",
    elapsedMs,
    status,
  };
}
