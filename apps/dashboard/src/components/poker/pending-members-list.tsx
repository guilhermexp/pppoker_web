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
      <div className="flex flex-col items-center py-16 text-center">
        <Icons.Customers className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Nenhuma solicitação pendente</p>
        <p className="text-sm text-muted-foreground mt-1">
          Novos membros do clube aparecerão aqui para aprovação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const initials = request.nickname.slice(0, 2).toUpperCase();
        const isReviewing =
          reviewMutation.isPending &&
          reviewMutation.variables?.id === request.id;

        return (
          <div
            key={request.id}
            className="flex items-center justify-between border-b border-border py-3 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
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
                {isReviewing &&
                reviewMutation.variables?.action === "rejected" ? (
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
                {isReviewing &&
                reviewMutation.variables?.action === "approved" ? (
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
