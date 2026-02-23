"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SyncStatusBanner() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: syncStatus, isLoading } = useQuery(
    trpc.poker.pppoker.getSyncStatus.queryOptions(),
  );

  const syncNowMutation = useMutation(
    trpc.poker.pppoker.syncNow.mutationOptions({
      onSuccess: () => {
        // Invalidate sync status and players data
        queryClient.invalidateQueries({
          queryKey: trpc.poker.pppoker.getSyncStatus.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.get.queryKey(),
        });
      },
    }),
  );

  if (isLoading) {
    return <div className="h-16 animate-pulse rounded bg-muted" />;
  }

  if (!syncStatus || syncStatus.connections.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          Nenhuma conexão PPPoker encontrada. Faça login novamente para ativar a sincronização.
        </p>
      </div>
    );
  }

  const connection = syncStatus.connections[0];
  const lastSynced = connection?.lastSyncedAt
    ? formatDistanceToNow(new Date(connection.lastSyncedAt), {
        addSuffix: true,
        locale: ptBR,
      })
    : "nunca";

  const isError = connection?.syncStatus === "error";

  return (
    <div
      className={`rounded-lg border p-4 ${
        isError
          ? "border-red-500/20 bg-red-500/5"
          : "border-green-500/20 bg-green-500/5"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isError ? "bg-red-500" : "bg-green-500 animate-pulse"
            }`}
          />
          <div>
            <p className="text-sm font-medium">
              Clube {connection?.clubId}
              {syncStatus.onlineCount > 0 && (
                <span className="ml-2 text-green-600 dark:text-green-400">
                  {syncStatus.onlineCount} online agora
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Última sync: {lastSynced}
              {isError && " (erro na última sincronização)"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => syncNowMutation.mutate()}
          disabled={syncNowMutation.isPending}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {syncNowMutation.isPending ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      </div>
    </div>
  );
}
