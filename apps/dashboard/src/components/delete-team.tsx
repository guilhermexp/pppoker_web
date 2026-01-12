"use client";

import { useUserQuery } from "@/hooks/use-user";
import { useScopedI18n } from "@/locales/client";
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
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@midpoker/ui/card";
import { Input } from "@midpoker/ui/input";
import { Label } from "@midpoker/ui/label";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteTeam() {
  const [value, setValue] = useState("");
  const trpc = useTRPC();
  const { data: user } = useUserQuery();
  const router = useRouter();
  const t = useScopedI18n("settings.delete_team");
  const tDialogs = useScopedI18n("dialogs");
  const tActions = useScopedI18n("actions");

  const deleteTeamMutation = useMutation(
    trpc.team.delete.mutationOptions({
      onSuccess: async () => {
        // Revalidate server state and redirect
        router.push("/teams");
      },
    }),
  );

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between">
        <div />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="hover:bg-destructive text-muted"
            >
              {t("button")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tDialogs("are_you_sure")}</AlertDialogTitle>
              <AlertDialogDescription>
                {tDialogs("delete_confirmation")}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex flex-col gap-2 mt-2">
              <Label htmlFor="confirm-delete">
                Type <span className="font-medium">DELETE</span> to confirm.
              </Label>
              <Input
                id="confirm-delete"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>{tActions("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteTeamMutation.mutate({ teamId: user?.teamId! })
                }
                disabled={value !== "DELETE"}
              >
                {deleteTeamMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  tActions("confirm")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
