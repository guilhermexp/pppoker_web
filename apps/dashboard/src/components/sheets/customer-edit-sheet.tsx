"use client";

import { useCustomerParams } from "@/hooks/use-customer-params";
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
import { CustomerForm } from "../forms/customer-form";

export function CustomerEditSheet() {
  const t = useI18n();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setParams, customerId } = useCustomerParams();

  const isOpen = Boolean(customerId);

  const { data: customer } = useQuery(
    trpc.customers.getById.queryOptions(
      { id: customerId! },
      {
        enabled: isOpen,
        staleTime: 0, // Always consider data stale so it always refetches
        initialData: () => {
          const pages = queryClient
            .getQueriesData({ queryKey: trpc.customers.get.infiniteQueryKey() })
            // @ts-expect-error
            .flatMap(([, data]) => data?.pages ?? [])
            .flatMap((page) => page.data ?? []);

          return pages.find((d) => d.id === customerId);
        },
      },
    ),
  );

  const deleteCustomerMutation = useMutation(
    trpc.customers.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.customers.get.infiniteQueryKey(),
        });
        setParams(null);
      },
    }),
  );

  return (
    <Sheet open={isOpen} onOpenChange={() => setParams(null)}>
      <SheetContent stack>
        <SheetHeader className="mb-6 flex justify-between items-center flex-row">
          <h2 className="text-xl">{t("dialogs.edit_customer")}</h2>

          {customerId && (
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
                        {t("dialogs.are_you_sure")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("dialogs.delete_customer_confirmation")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t("actions.cancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          deleteCustomerMutation.mutate({ id: customerId })
                        }
                      >
                        {t("actions.delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SheetHeader>

        <CustomerForm data={customer} key={customer?.id} />
      </SheetContent>
    </Sheet>
  );
}
