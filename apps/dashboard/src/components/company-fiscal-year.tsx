"use client";

import { useTeamMutation, useTeamQuery } from "@/hooks/use-team";
import { useZodForm } from "@/hooks/use-zod-form";
import { useScopedI18n } from "@/locales/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@midpoker/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@midpoker/ui/form";
import { SubmitButton } from "@midpoker/ui/submit-button";
import { z } from "zod/v3";
import { SelectFiscalMonth } from "./select-fiscal-month";

const formSchema = z.object({
  fiscalYearStartMonth: z.number().int().min(1).max(12).nullable(),
});

export function CompanyFiscalYear() {
  const { data } = useTeamQuery();
  const updateTeamMutation = useTeamMutation();
  const t = useScopedI18n("settings.fiscal_year");
  const tActions = useScopedI18n("actions");

  const form = useZodForm(formSchema, {
    defaultValues: {
      fiscalYearStartMonth: data?.fiscalYearStartMonth ?? null,
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    updateTeamMutation.mutate(data);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>

          <CardContent>
            <FormField
              control={form.control}
              name="fiscalYearStartMonth"
              render={({ field }) => (
                <FormItem className="max-w-[300px]">
                  <FormControl>
                    <SelectFiscalMonth {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-end">
            <SubmitButton
              disabled={updateTeamMutation.isPending || !form.formState.isDirty}
              isSubmitting={updateTeamMutation.isPending}
            >
              {tActions("save")}
            </SubmitButton>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
