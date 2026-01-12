"use client";

import { AssignUser } from "@/components/assign-user";
import { SelectAccount } from "@/components/select-account";
import { SelectCategory } from "@/components/select-category";
import { SelectCurrency } from "@/components/select-currency";
import { TransactionAttachments } from "@/components/transaction-attachments";
import { useTeamQuery } from "@/hooks/use-team";
import { useTransactionParams } from "@/hooks/use-transaction-params";
import { useUserQuery } from "@/hooks/use-user";
import { useZodForm } from "@/hooks/use-zod-form";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import { utc } from "@date-fns/utc";
import { uniqueCurrencies } from "@midpoker/location/currencies";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@midpoker/ui/accordion";
import { Button } from "@midpoker/ui/button";
import { Calendar } from "@midpoker/ui/calendar";
import { cn } from "@midpoker/ui/cn";
import { CurrencyInput } from "@midpoker/ui/currency-input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@midpoker/ui/form";
import { Input } from "@midpoker/ui/input";
import { Label } from "@midpoker/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@midpoker/ui/popover";
import { Select } from "@midpoker/ui/select";
import { SubmitButton } from "@midpoker/ui/submit-button";
import { Switch } from "@midpoker/ui/switch";
import { Textarea } from "@midpoker/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatISO } from "date-fns";
import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { z } from "zod/v3";

const formSchema = z.object({
  name: z.string().min(1),
  amount: z.number().refine((val) => Math.abs(val) > 0, {
    message: "Amount must be greater than 0",
  }),
  currency: z.string(),
  date: z.string(),
  bankAccountId: z.string(),
  assignedId: z.string().optional(),
  categorySlug: z.string().optional(),
  note: z.string().optional(),
  internal: z.boolean().optional(),
  transactionType: z.enum(["income", "expense"]),
  attachments: z
    .array(
      z.object({
        path: z.array(z.string()),
        name: z.string(),
        size: z.number(),
        type: z.string(),
      }),
    )
    .optional(),
});

export function TransactionCreateForm() {
  const t = useI18n();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setParams } = useTransactionParams();
  const [isOpen, setIsOpen] = useState(false);
  const { data: user } = useUserQuery();
  const { data: team } = useTeamQuery();
  const { data: accounts } = useQuery(
    trpc.bankAccounts.get.queryOptions({
      enabled: true,
    }),
  );

  const { data: categories } = useQuery(
    trpc.transactionCategories.get.queryOptions(),
  );

  const createTransactionMutation = useMutation(
    trpc.transactions.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.transactions.get.infiniteQueryKey(),
        });

        // Invalidate global search
        queryClient.invalidateQueries({
          queryKey: trpc.search.global.queryKey(),
        });

        setParams(null);
      },
    }),
  );

  const form = useZodForm(formSchema, {
    defaultValues: {
      name: undefined,
      categorySlug: undefined,
      date: formatISO(new Date(), { representation: "date" }),
      bankAccountId: accounts?.at(0)?.id,
      assignedId: user?.id,
      note: undefined,
      currency: team?.baseCurrency ?? undefined,
      attachments: undefined,
      internal: undefined,
      transactionType: "expense" as const,
    },
  });

  const category = form.watch("categorySlug");
  const attachments = form.watch("attachments");
  const bankAccountId = form.watch("bankAccountId");
  const transactionType = form.watch("transactionType");
  const amount = form.watch("amount");

  useEffect(() => {
    if (!bankAccountId && accounts?.length) {
      const firstAccountId = accounts.at(0)?.id;
      if (firstAccountId) {
        form.setValue("bankAccountId", firstAccountId);
      }
    }
  }, [accounts, bankAccountId]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(() => {
          const formValues = form.getValues();
          // Amount is already stored with correct sign (negative for expense, positive for income)
          createTransactionMutation.mutate({
            ...formValues,
          });
        })}
        className="space-y-8"
      >
        <FormField
          control={form.control}
          name="transactionType"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex w-full border border-border bg-muted">
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-6 px-2 flex-1 rounded-none text-xs border-r border-border last:border-r-0",
                      field.value === "expense"
                        ? "bg-transparent"
                        : "bg-background font-medium",
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      field.onChange("expense");
                      // Clear income category if switching to expense
                      if (form.getValues("categorySlug") === "income") {
                        form.setValue("categorySlug", undefined);
                      }
                      // Update amount to negative if there's an amount
                      const currentAmount = form.getValues("amount");
                      if (currentAmount && currentAmount > 0) {
                        form.setValue("amount", -Math.abs(currentAmount));
                      }
                    }}
                  >
                    {t("transaction_create.expense")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-6 px-2 flex-1 rounded-none text-xs border-r border-border last:border-r-0",
                      field.value === "income"
                        ? "bg-transparent"
                        : "bg-background font-medium",
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      field.onChange("income");
                      // Update amount to positive if there's an amount
                      const currentAmount = form.getValues("amount");
                      if (currentAmount) {
                        const positiveAmount = Math.abs(currentAmount);
                        form.setValue("amount", positiveAmount);
                        // Auto-select income category if amount is positive
                        if (positiveAmount > 0) {
                          form.setValue("categorySlug", "income");
                        }
                      }
                    }}
                  >
                    {t("transaction_create.income")}
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                {t("transaction_create.type_description")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("transaction_create.description_label")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t("transaction_create.description_placeholder")}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </FormControl>
              <FormDescription>
                {t("transaction_create.description_helper")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex space-x-4 mt-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{t("transaction_create.amount_label")}</FormLabel>
                <FormControl>
                  <CurrencyInput
                    value={field.value ? Math.abs(field.value) : undefined}
                    placeholder={t("transaction_create.amount_placeholder")}
                    allowNegative={false}
                    onValueChange={(values) => {
                      if (values.floatValue !== undefined) {
                        // Store signed value based on transaction type
                        const positiveValue = Math.abs(values.floatValue);
                        const signedValue =
                          transactionType === "expense"
                            ? -positiveValue
                            : positiveValue;
                        field.onChange(signedValue);
                      }
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {t("transaction_create.amount_helper")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{t("transaction_create.currency_label")}</FormLabel>

                <FormControl>
                  <SelectCurrency
                    className="w-full"
                    currencies={uniqueCurrencies}
                    onChange={field.onChange}
                    value={field.value}
                  />
                </FormControl>
                <FormDescription>
                  {t("transaction_create.currency_helper")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex space-x-4 mt-4">
          <FormField
            control={form.control}
            name="bankAccountId"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{t("transaction_create.account_label")}</FormLabel>
                <FormControl>
                  <SelectAccount
                    onChange={(value) => {
                      field.onChange(value.id);

                      if (value.currency) {
                        form.setValue("currency", value.currency);
                      }
                    }}
                    value={field.value}
                    placeholder={t("transaction_create.account_placeholder")}
                  />
                </FormControl>
                <FormDescription>
                  {t("transaction_create.account_helper")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{t("transaction_create.date_label")}</FormLabel>
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                  <FormControl>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setIsOpen(true)}
                      >
                        {field.value ? (
                          format(utc(field.value), user?.dateFormat ?? "PPP")
                        ) : (
                          <span>
                            {t("transaction_create.date_placeholder")}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                  </FormControl>

                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={field.value ? utc(field.value) : undefined}
                      onSelect={(value) => {
                        if (value) {
                          field.onChange(
                            formatISO(value, { representation: "date" }),
                          );
                          setIsOpen(false);
                        }
                      }}
                      initialFocus
                      toDate={new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  {t("transaction_create.date_helper")}
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <div className="flex space-x-4 mt-4">
          <FormField
            control={form.control}
            name="categorySlug"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{t("transaction_create.category_label")}</FormLabel>
                <FormControl>
                  <SelectCategory
                    onChange={(value) => {
                      field.onChange(value?.slug);
                    }}
                    hideLoading
                    selected={categories
                      ?.map((category) => {
                        if (!category) return undefined;

                        const { id, name, color, slug } = category;
                        return {
                          id,
                          name,
                          color,
                          slug: slug!,
                        };
                      })
                      .filter(
                        (category): category is NonNullable<typeof category> =>
                          category !== undefined,
                      )
                      .find((category) => category.slug === field.value)}
                  />
                </FormControl>
                <FormDescription>
                  {t("transaction_create.category_helper")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assignedId"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{t("transaction_create.assign_label")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <AssignUser
                      selectedId={field.value}
                      onSelect={field.onChange}
                    />
                  </FormControl>
                </Select>
                <FormDescription>
                  {t("transaction_create.assign_helper")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Accordion type="multiple" defaultValue={["attachment"]}>
          <AccordionItem value="attachment">
            <AccordionTrigger>
              {t("transaction_create.attachment")}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {t("transaction_create.attachment_description")}
                </p>
                <TransactionAttachments
                  // NOTE: For manual attachments, we need to generate a unique id
                  id={nanoid()}
                  data={attachments?.map((attachment) => ({
                    ...attachment,
                    id: nanoid(),
                    filename: attachment.name,
                    path: attachment.path.join("/"),
                  }))}
                  onUpload={(files) => {
                    // @ts-expect-error
                    form.setValue("attachments", files);
                  }}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <div className="mt-6 mb-4">
            <Label
              htmlFor="settings"
              className="mb-2 block font-medium text-md"
            >
              {t("transaction_create.exclude_analytics")}
            </Label>
            <div className="flex flex-row items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <p className="text-xs text-muted-foreground">
                  {t("transaction_create.exclude_analytics_description")}
                </p>
              </div>

              <FormField
                control={form.control}
                name="internal"
                render={({ field }) => (
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                    }}
                  />
                )}
              />
            </div>
          </div>

          <AccordionItem value="note">
            <AccordionTrigger>{t("transaction_create.note")}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {t("transaction_create.note_description")}
                </p>
                <Textarea
                  placeholder={t("transaction_create.note_placeholder")}
                  className="min-h-[100px] resize-none"
                  onChange={(e) => {
                    form.setValue("note", e.target.value);
                  }}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="fixed bottom-8 w-full sm:max-w-[455px] right-8">
          <SubmitButton
            isSubmitting={createTransactionMutation.isPending}
            className="w-full"
            disabled={!form.formState.isDirty}
          >
            {t("transaction_create.create_button")}
          </SubmitButton>
        </div>
      </form>
    </Form>
  );
}
