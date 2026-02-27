"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function useBridgeStatus() {
  const trpc = useTRPC();
  const { data, isError } = useQuery(
    trpc.poker.bridgeHealth.queryOptions(undefined, {
      refetchInterval: 30_000,
      retry: false,
      staleTime: 15_000,
    }),
  );

  const isDown =
    isError || data?.ok === false || data?.circuit?.state === "open";

  return {
    isDown,
    detail:
      data?.detail ??
      (isError ? "Nao foi possivel verificar o bridge" : undefined),
    circuit: data?.circuit,
  };
}
