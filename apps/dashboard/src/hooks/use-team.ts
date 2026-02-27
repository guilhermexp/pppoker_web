"use client";

import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

export function useTeamQuery() {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.team.current.queryOptions());
}

export function useTeamMutation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.team.update.mutationOptions({
      onMutate: async (newData) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({
          queryKey: trpc.team.current.queryKey(),
        });

        // Get current data
        const previousData = queryClient.getQueryData(
          trpc.team.current.queryKey(),
        );

        // Optimistically update
        queryClient.setQueryData(trpc.team.current.queryKey(), (old: any) => ({
          ...old,
          ...newData,
        }));

        return { previousData };
      },
      onError: (_, __, context) => {
        // Rollback on error
        queryClient.setQueryData(
          trpc.team.current.queryKey(),
          context?.previousData,
        );
      },
      onSettled: () => {
        // Refetch after error or success
        queryClient.invalidateQueries({
          queryKey: trpc.team.current.queryKey(),
        });
      },
    }),
  );
}

// =============================================================================
// POKER SETTINGS HOOKS
// =============================================================================

export function usePokerSettingsQuery() {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.team.getPokerSettings.queryOptions());
}

export function usePokerSettingsMutation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.team.updatePokerSettings.mutationOptions({
      onMutate: async (newData) => {
        await queryClient.cancelQueries({
          queryKey: trpc.team.getPokerSettings.queryKey(),
        });
        const previous = queryClient.getQueryData(
          trpc.team.getPokerSettings.queryKey(),
        );
        queryClient.setQueryData(
          trpc.team.getPokerSettings.queryKey(),
          (old: any) => {
            if (!old) return old;
            return { ...old, ...newData };
          },
        );
        return { previous };
      },
      onError: (_, __, context) => {
        if (context?.previous) {
          queryClient.setQueryData(
            trpc.team.getPokerSettings.queryKey(),
            context.previous,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.team.getPokerSettings.queryKey(),
        });
      },
    }),
  );
}

export function useLinkedClubsQuery() {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.team.getLinkedClubs.queryOptions());
}

export function useAddLinkedClubMutation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.team.addLinkedClub.mutationOptions({
      onMutate: async (newClub) => {
        await queryClient.cancelQueries({
          queryKey: trpc.team.getLinkedClubs.queryKey(),
        });
        const previous = queryClient.getQueryData(
          trpc.team.getLinkedClubs.queryKey(),
        );
        queryClient.setQueryData(
          trpc.team.getLinkedClubs.queryKey(),
          (old: any) => {
            if (!old) return old;
            const optimisticClub = {
              id: `temp-${Date.now()}`,
              clubId: newClub.clubId,
              clubName: newClub.clubName,
              linkedTeamId: newClub.linkedTeamId ?? null,
              linkedTeamName: null,
              createdAt: new Date().toISOString(),
            };
            return {
              clubs: [...old.clubs, optimisticClub],
              total: old.total + 1,
            };
          },
        );
        return { previous };
      },
      onError: (_, __, context) => {
        if (context?.previous) {
          queryClient.setQueryData(
            trpc.team.getLinkedClubs.queryKey(),
            context.previous,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.team.getLinkedClubs.queryKey(),
        });
      },
    }),
  );
}

export function useRemoveLinkedClubMutation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.team.removeLinkedClub.mutationOptions({
      onMutate: async ({ clubId }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.team.getLinkedClubs.queryKey(),
        });
        const previous = queryClient.getQueryData(
          trpc.team.getLinkedClubs.queryKey(),
        );
        queryClient.setQueryData(
          trpc.team.getLinkedClubs.queryKey(),
          (old: any) => {
            if (!old) return old;
            const filteredClubs = old.clubs.filter(
              (c: any) => c.clubId !== clubId,
            );
            return {
              clubs: filteredClubs,
              total: filteredClubs.length,
            };
          },
        );
        return { previous };
      },
      onError: (_, __, context) => {
        if (context?.previous) {
          queryClient.setQueryData(
            trpc.team.getLinkedClubs.queryKey(),
            context.previous,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.team.getLinkedClubs.queryKey(),
        });
      },
    }),
  );
}

export function useSearchLigasQuery() {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.team.searchLigas.queryOptions());
}

// =============================================================================
// INFINITEPAY SETTINGS HOOKS
// =============================================================================

export function useInfinitePaySettingsQuery() {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.team.getInfinitePaySettings.queryOptions());
}

export function useInfinitePaySettingsMutation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.team.updateInfinitePaySettings.mutationOptions({
      onMutate: async (newData) => {
        await queryClient.cancelQueries({
          queryKey: trpc.team.getInfinitePaySettings.queryKey(),
        });
        const previous = queryClient.getQueryData(
          trpc.team.getInfinitePaySettings.queryKey(),
        );
        queryClient.setQueryData(
          trpc.team.getInfinitePaySettings.queryKey(),
          (old: any) => {
            if (!old) return old;
            return { ...old, ...newData };
          },
        );
        return { previous };
      },
      onError: (_, __, context) => {
        if (context?.previous) {
          queryClient.setQueryData(
            trpc.team.getInfinitePaySettings.queryKey(),
            context.previous,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.team.getInfinitePaySettings.queryKey(),
        });
      },
    }),
  );
}

export function useTestInfinitePayHandleMutation() {
  const trpc = useTRPC();

  return useMutation(trpc.team.testInfinitePayHandle.mutationOptions());
}

export function useCheckTestPaymentQuery(orderNsu: string | null) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.team.checkTestPaymentStatus.queryOptions({ orderNsu: orderNsu! }),
    enabled: !!orderNsu,
    refetchInterval: (query) => {
      // Stop polling once paid
      if (query.state.data?.paid) return false;
      return 5000; // Poll every 5 seconds
    },
  });
}

// =============================================================================
// FASTCHIPS SERVICE HOOKS
// =============================================================================

export function useFastchipsServiceQuery() {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.team.getFastchipsServiceSettings.queryOptions());
}

export function useFastchipsServiceMutation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.team.getFastchipsServiceSettings.queryKey();

  return useMutation(
    trpc.team.updateFastchipsServiceSettings.mutationOptions({
      onMutate: async (newData) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            ...newData,
            ...(newData.setupSteps
              ? { setupSteps: { ...old.setupSteps, ...newData.setupSteps } }
              : {}),
            ...(newData.gateway
              ? { gateway: { ...old.gateway, ...newData.gateway } }
              : {}),
            ...(newData.controlPanel
              ? {
                  controlPanel: {
                    ...old.controlPanel,
                    ...newData.controlPanel,
                  },
                }
              : {}),
          };
        });
        return { previous };
      },
      onError: (_, __, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    }),
  );
}

export function useActivateFastchipsMutation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.team.getFastchipsServiceSettings.queryKey();

  return useMutation(
    trpc.team.activateFastchipsService.mutationOptions({
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            status: "active",
            activatedAt: new Date().toISOString(),
          };
        });
        return { previous };
      },
      onError: (_, __, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    }),
  );
}
