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

  return useMutation(
    trpc.team.testInfinitePayHandle.mutationOptions(),
  );
}

export function useCheckTestPaymentQuery(orderNsu: string | null) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.team.checkTestPaymentStatus.queryOptions(
      { orderNsu: orderNsu! },
    ),
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
  return useSuspenseQuery(
    trpc.team.getFastchipsServiceSettings.queryOptions(),
  );
}

export function useFastchipsServiceMutation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.team.updateFastchipsServiceSettings.mutationOptions({
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.team.getFastchipsServiceSettings.queryKey(),
        });
      },
    }),
  );
}

export function useActivateFastchipsMutation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.team.activateFastchipsService.mutationOptions({
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.team.getFastchipsServiceSettings.queryKey(),
        });
      },
    }),
  );
}
