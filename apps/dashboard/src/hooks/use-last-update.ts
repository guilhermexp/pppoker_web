"use client";

import { useEffect, useState } from "react";

/**
 * Returns a human-readable relative time string (e.g. "Agora", "15s atrás", "2min atrás")
 * that auto-updates every 5 seconds.
 */
export function useLastUpdate(dataUpdatedAt: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!dataUpdatedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 5_000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  if (!dataUpdatedAt) return null;
  const sec = Math.floor((Date.now() - dataUpdatedAt) / 1000);
  if (sec < 5) return "Agora";
  if (sec < 60) return `${sec}s atrás`;
  return `${Math.floor(sec / 60)}min atrás`;
}
