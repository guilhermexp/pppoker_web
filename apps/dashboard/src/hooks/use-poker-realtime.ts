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
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateAll = useCallback(() => {
    // Invalidate only queries that reflect poker_players table state
    queryClient.invalidateQueries({
      queryKey: trpc.poker.players.get.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.poker.players.getStats.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.poker.pppoker.getSyncStatus.queryKey(),
    });
    // Membros queries (synced from poker_players)
    queryClient.invalidateQueries({
      queryKey: trpc.poker.members.list.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.poker.members.getStats.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.poker.members.getLive.queryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.poker.members.listPendingMembers.queryKey(),
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
          // Debounce: wait for batch updates to finish before invalidating
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(invalidateAll, 500);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [invalidateAll]);
}
