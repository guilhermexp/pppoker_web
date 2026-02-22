"use client";

import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@midpoker/ui/avatar";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export function PendingMembersList() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    trpc.poker.members.listPendingMembers.queryOptions(),
  );

  const reviewMutation = useMutation(
    trpc.poker.members.reviewMember.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.poker.members.listPendingMembers.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.members.getStats.queryKey(),
        });
      },
    }),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const requests = data?.data ?? [];

  if (requests.length === 0) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex flex-col items-center mt-20">
          <div className="p-4 bg-muted rounded-full mb-6">
            <Icons.Customers className="size-8 text-muted-foreground" />
          </div>
          <div className="text-center mb-6 space-y-2">
            <h2 className="font-medium text-lg">
              Nenhuma solicitacao pendente
            </h2>
            <p className="text-[#606060] text-sm">
              Novos membros do clube aparecerao aqui para aprovacao.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const initials = request.nickname.slice(0, 2).toUpperCase();
        const isReviewing = reviewMutation.isPending && reviewMutation.variables?.id === request.id;

        return (
          <div
            key={request.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{request.nickname}</span>
                <span className="text-sm text-muted-foreground font-mono">
                  ID: {request.ppPokerId}
                </span>
                {request.requestedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(request.requestedAt).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={isReviewing}
                onClick={() =>
                  reviewMutation.mutate({
                    id: request.id,
                    action: "rejected",
                  })
                }
              >
                {isReviewing && reviewMutation.variables?.action === "rejected" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Rejeitar"
                )}
              </Button>
              <Button
                size="sm"
                disabled={isReviewing}
                onClick={() =>
                  reviewMutation.mutate({
                    id: request.id,
                    action: "approved",
                  })
                }
              >
                {isReviewing && reviewMutation.variables?.action === "approved" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Aprovar"
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
