"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@midpoker/ui/button";
import { cn } from "@midpoker/ui/cn";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

export default function PokerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: trpc.poker.queryKey() });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: trpc.poker.queryKey() });
  };

  return (
    <div className="relative">
      {children}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleRefresh}
          disabled={isFetching > 0}
          size="sm"
          className="gap-2 shadow-lg"
        >
          <RefreshCw
            className={cn("h-4 w-4", isFetching > 0 && "animate-spin")}
          />
          Atualizar
        </Button>
      </div>
    </div>
  );
}
