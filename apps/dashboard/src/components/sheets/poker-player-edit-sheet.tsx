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
} from "@midday/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@midday/ui/dropdown-menu";
import { Icons } from "@midday/ui/icons";
import { Sheet, SheetContent, SheetHeader } from "@midday/ui/sheet";
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
      }
    )
  );

  const deletePlayerMutation = useMutation(
    trpc.poker.players.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.get.infiniteQueryKey(),
        });
        setParams(null);
      },
    })
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
                      <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
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
