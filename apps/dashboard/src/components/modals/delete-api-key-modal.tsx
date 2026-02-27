"use client";

import { useTokenModalStore } from "@/store/token-modal";
import { useTRPC } from "@/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@midpoker/ui/dialog";
import { SubmitButton } from "@midpoker/ui/submit-button";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function DeleteApiKeyModal() {
  const { setData, type, data } = useTokenModalStore();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteApiKeyMutation = useMutation(
    trpc.apiKeys.delete.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.apiKeys.get.queryKey(),
        });
        const previous = queryClient.getQueryData(trpc.apiKeys.get.queryKey());
        queryClient.setQueriesData(
          { queryKey: trpc.apiKeys.get.queryKey() },
          (old: any) => {
            if (!old || !Array.isArray(old)) return old;
            return old.filter((item: any) => item.id !== id);
          },
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueriesData(
            { queryKey: trpc.apiKeys.get.queryKey() },
            context.previous,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.apiKeys.get.queryKey(),
        });
      },
      onSuccess: () => {
        setData(undefined);
      },
    }),
  );

  return (
    <Dialog open={type === "delete"} onOpenChange={() => setData(undefined)}>
      <DialogContent
        className="max-w-[455px]"
        onOpenAutoFocus={(evt) => evt.preventDefault()}
      >
        <div className="p-4 space-y-4">
          <DialogHeader>
            <DialogTitle>Delete API Key</DialogTitle>
            <DialogDescription>
              This will permanently delete the API key{" "}
              <span className="text-primary">{data?.name}</span> for and revoke
              all access to your account. Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>

          <SubmitButton
            className="w-full mt-4"
            onClick={() => deleteApiKeyMutation.mutate({ id: data?.id! })}
            isSubmitting={deleteApiKeyMutation.isPending}
          >
            Delete
          </SubmitButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
