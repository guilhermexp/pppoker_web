"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@midday/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@midday/ui/form";
import { Input } from "@midday/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@midday/ui/select";
import { SubmitButton } from "@midday/ui/submit-button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseAsBoolean, useQueryState } from "nuqs";
import { z } from "zod/v3";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Account name is required.",
  }),
  currency: z.string().min(1, {
    message: "Currency is required.",
  }),
});

export function CreateBankAccountModal() {
  const t = useI18n();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const [isOpen, setIsOpen] = useQueryState(
    "createAccount",
    parseAsBoolean.withDefault(false),
  );
  const [_, setCreateTransaction] = useQueryState(
    "createTransaction",
    parseAsBoolean.withDefault(false),
  );

  const form = useZodForm(formSchema, {
    defaultValues: {
      name: "",
      currency: "BRL",
    },
  });

  const createAccountMutation = useMutation(
    trpc.bankAccounts.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.bankConnections.get.queryKey(),
        });

        queryClient.invalidateQueries({
          queryKey: trpc.bankAccounts.get.queryKey(),
        });

        setIsOpen(false);
        form.reset();

        // Abrir sheet de criar transação
        setCreateTransaction(true);
      },
      onError: (error) => {
        console.error("Error creating bank account:", error);
        alert(`Erro ao criar conta: ${error.message}`);
      },
    }),
  );

  function onSubmit(values: z.infer<typeof formSchema>) {
    createAccountMutation.mutate({
      name: values.name,
      currency: values.currency,
      manual: true,
    });
  }

  const currencies = [
    { code: "BRL", name: "Real Brasileiro" },
    { code: "USD", name: "US Dollar" },
    { code: "EUR", name: "Euro" },
    { code: "GBP", name: "British Pound" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="max-w-[455px]"
        onOpenAutoFocus={(evt) => evt.preventDefault()}
      >
        <div className="p-4">
          <DialogHeader>
            <DialogTitle>{t("bank_account.create_title")}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bank_account.name_label")}</FormLabel>
                    <FormControl>
                      <Input
                        autoFocus
                        placeholder={t("bank_account.name_placeholder")}
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("bank_account.name_description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>{t("bank_account.currency_label")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("bank_account.currency_placeholder")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("bank_account.currency_description")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-10 w-full">
                <div className="space-y-4 w-full">
                  <SubmitButton
                    isSubmitting={createAccountMutation.isPending}
                    className="w-full"
                    type="submit"
                  >
                    {t("bank_account.create_button")}
                  </SubmitButton>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
