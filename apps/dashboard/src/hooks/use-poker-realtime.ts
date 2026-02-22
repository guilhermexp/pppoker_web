"use client";

import { useTRPC } from "@/trpc/client";
import { createClient } from "@midpoker/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

/**
 * Hook that subscribes to real-time changes on poker_players table.
 * When data changes (via PPPoker sync), invalidates relevant TRPC queries
 * so the UI auto-updates.
 */
export function usePokerPlayersRealtime() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: trpc.poker.players.get.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.poker.players.getStats.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.poker.pppoker.getSyncStatus.queryKey(),
    });
  }, [queryClient, trpc]);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to all changes on poker_players (RLS handles team filtering)
    const channel = supabase
      .channel("poker-players-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poker_players",
        },
        () => {
          // Debounce: wait a bit for batch updates to finish
          setTimeout(invalidateAll, 500);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidateAll]);
}
