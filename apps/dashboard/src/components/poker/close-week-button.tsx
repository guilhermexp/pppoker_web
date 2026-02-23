"use client";

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
import { Button } from "@midpoker/ui/button";
import { Icons } from "@midpoker/ui/icons";
import { useToast } from "@midpoker/ui/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function CloseWeekButton() {
  const trpc = useTRPC();
  const t = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const closeWeekMutation = useMutation(
    trpc.poker.settlements.closeWeek.mutationOptions({
      onSuccess: (data) => {
        toast({
          title: t("poker.closeWeek.success"),
          description: t("poker.closeWeek.successDescription", {
            count: data.settlementsCreated,
          }),
        });
        setOpen(false);
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({
          queryKey: trpc.poker.analytics.getOverview.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.analytics.getGrossRake.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.analytics.getBankResult.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.analytics.getTopPlayers.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.analytics.getDebtors.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.poker.settlements.get.queryKey(),
        });
      },
      onError: (error) => {
        toast({
          title: t("poker.closeWeek.error"),
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icons.CalendarMonth className="h-4 w-4 mr-2" />
          {t("poker.closeWeek.button")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("poker.closeWeek.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("poker.closeWeek.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => closeWeekMutation.mutate({})}
            disabled={closeWeekMutation.isPending}
          >
            {closeWeekMutation.isPending ? (
              <>
                <Icons.Refresh className="h-4 w-4 mr-2 animate-spin" />
                {t("poker.closeWeek.processing")}
              </>
            ) : (
              t("poker.closeWeek.confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
