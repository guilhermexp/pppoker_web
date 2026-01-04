"use client";

import { useProductParams } from "@/hooks/use-product-params";
import { useTeamQuery } from "@/hooks/use-team";
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
import { ProductForm } from "../forms/product-form";

export function ProductEditSheet() {
  const t = useI18n();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setParams, productId } = useProductParams();
  const { data: team } = useTeamQuery();
  const defaultCurrency = team?.baseCurrency || "USD";

  const isOpen = Boolean(productId);

  const { data: product } = useQuery(
    trpc.invoiceProducts.getById.queryOptions(
      { id: productId! },
      {
        enabled: isOpen,
        initialData: () => {
          const pages = queryClient
            .getQueriesData({ queryKey: trpc.invoiceProducts.get.queryKey() })
            // @ts-expect-error
            .flatMap(([, data]) => data?.pages ?? [])
            .flatMap((page) => page.data ?? []);

          return pages.find((d) => d.id === productId);
        },
      },
    ),
  );

  const deleteProductMutation = useMutation(
    trpc.invoiceProducts.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.invoiceProducts.get.queryKey(),
        });
        setParams(null);
      },
    }),
  );

  return (
    <Sheet open={isOpen} onOpenChange={() => setParams(null)}>
      <SheetContent>
        <SheetHeader className="mb-6 flex justify-between items-center flex-row">
          <h2 className="text-xl">{t("dialogs.edit_product")}</h2>

          {productId && (
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
                        {t("dialogs.delete_product_confirmation")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t("actions.cancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          deleteProductMutation.mutate({ id: productId })
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

        <ProductForm
          data={product}
          key={product?.id}
          defaultCurrency={defaultCurrency}
        />
      </SheetContent>
    </Sheet>
  );
}
