"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@midpoker/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@midpoker/ui/dropdown-menu";
import { Icons } from "@midpoker/ui/icons";
import { Sheet, SheetContent, SheetHeader } from "@midpoker/ui/sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PokerPlayerForm } from "../forms/poker-player-form";

export function PokerPlayerEditSheet() {
  const t = useI18n();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setParams, playerId } = usePokerPlayerParams();

  const isOpen = Boolean(playerId);

  const { data: player } = useQuery(
    trpc.poker.players.getById.queryOptions(
      { id: playerId! },
      {
        enabled: isOpen,
        staleTime: 0,
        initialData: () => {
          const pages = queryClient
            .getQueriesData({
              queryKey: trpc.poker.players.get.infiniteQueryKey(),
            })
            // @ts-expect-error
            .flatMap(([, data]) => data?.pages ?? [])
            .flatMap((page) => page.data ?? []);

          return pages.find((d) => d.id === playerId);
        },
      },
    ),
  );

  const deletePlayerMutation = useMutation(
    trpc.poker.players.delete.mutationOptions({
      onMutate: async ({ id }) => {
        await queryClient.cancelQueries({
          queryKey: trpc.poker.players.get.infiniteQueryKey(),
        });
        const previous = queryClient.getQueriesData({
          queryKey: trpc.poker.players.get.infiniteQueryKey(),
        });
        queryClient.setQueriesData(
          { queryKey: trpc.poker.players.get.infiniteQueryKey() },
          (old: any) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                data: page.data.filter((item: any) => item.id !== id),
              })),
            };
          },
        );
        return { previous };
      },
      onError: (_err, _vars, context) => {
        if (context?.previous) {
          for (const [queryKey, data] of context.previous) {
            queryClient.setQueryData(queryKey, data);
          }
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.get.infiniteQueryKey(),
        });
      },
      onSuccess: () => {
        setParams(null);
      },
    }),
  );

  return (
    <Sheet open={isOpen} onOpenChange={() => setParams(null)}>
      <SheetContent stack>
        <SheetHeader className="mb-6 flex justify-between items-center flex-row">
          <h2 className="text-xl">{t("poker.players.form.title_edit")}</h2>

          {playerId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button">
                  <Icons.MoreVertical className="size-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent sideOffset={10} align="end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      {t("actions.delete")}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("poker.players.form.delete_title")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("poker.players.form.delete_description")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t("actions.cancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          deletePlayerMutation.mutate({ id: playerId })
                        }
                      >
                        {t("poker.players.form.delete_button")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SheetHeader>

        <PokerPlayerForm data={player} key={player?.id} />
      </SheetContent>
    </Sheet>
  );
}
