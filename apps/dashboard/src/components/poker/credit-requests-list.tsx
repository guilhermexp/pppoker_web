"use client";

import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@midpoker/ui/avatar";
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { Input } from "@midpoker/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";

function CreditRequestCard({
  request,
}: {
  request: {
    id: string;
    playerId: string | null;
    ppPokerId: string;
    nickname: string;
    requestedAmount: number;
    currentCreditLimit: number;
    status: string;
    createdAt: string;
    note: string | null;
  };
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [approvedAmount, setApprovedAmount] = useState(
    String(request.requestedAmount),
  );

  const reviewMutation = useMutation(
    trpc.poker.members.reviewCredit.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.poker.members.listCreditRequests.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.members.getStats.queryKey(),
        });
      },
    }),
  );

  const initials = request.nickname.slice(0, 2).toUpperCase();
  const isReviewing = reviewMutation.isPending;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-medium">{request.nickname}</span>
          <span className="text-sm text-muted-foreground font-mono">
            ID: {request.ppPokerId}
          </span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span>
              Atual:{" "}
              {request.currentCreditLimit.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </span>
            <span>
              Pedido:{" "}
              <span className="font-medium text-foreground">
                {request.requestedAmount.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={approvedAmount}
          onChange={(e) => setApprovedAmount(e.target.value)}
          className="w-28 text-right"
          placeholder="Valor"
          min={0}
          step={100}
        />
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
              approvedAmount: Number(approvedAmount),
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
}

export function CreditRequestsList() {
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.poker.members.listCreditRequests.queryOptions({ status: "pending" }),
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
            <Icons.Invoice className="size-8 text-muted-foreground" />
          </div>
          <div className="text-center mb-6 space-y-2">
            <h2 className="font-medium text-lg">
              Nenhuma solicitacao de credito
            </h2>
            <p className="text-[#606060] text-sm">
              Solicitacoes de credito dos jogadores aparecerao aqui.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <CreditRequestCard key={request.id} request={request} />
      ))}
    </div>
  );
}
