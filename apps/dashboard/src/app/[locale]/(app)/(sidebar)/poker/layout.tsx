"use client";

import { usePokerPlayersRealtime } from "@/hooks/use-poker-realtime";
import { useTRPC } from "@/trpc/client";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export default function PokerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  usePokerPlayersRealtime();
  const isFetching = useIsFetching({ queryKey: trpc.poker.queryKey() });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isRefreshing = mounted && isFetching > 0;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: trpc.poker.queryKey() });
  };

  return (
    <div className="relative">
      {children}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          size="sm"
          className="gap-2 shadow-lg"
        >
          <RefreshCw
            className={cn("h-4 w-4", isRefreshing && "animate-spin")}
          />
          Atualizar
        </Button>
      </div>
    </div>
  );
}
