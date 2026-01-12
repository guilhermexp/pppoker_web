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
import { CountrySelector } from "./country-selector";

const formSchema = z.object({
  countryCode: z.string().min(2).max(32),
});

export function CompanyCountry() {
  const { data } = useTeamQuery();
  const updateTeamMutation = useTeamMutation();
  const t = useScopedI18n("settings.company_country");
  const tActions = useScopedI18n("actions");

  const form = useZodForm(formSchema, {
    defaultValues: {
      countryCode: data?.countryCode ?? "",
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
              name="countryCode"
              render={({ field }) => (
                <FormItem className="max-w-[300px]">
                  <FormControl>
                    <CountrySelector
                      defaultValue={field.value ?? ""}
                      onSelect={(code, name) => {
                        field.onChange(name);
                        form.setValue("countryCode", code);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-end">
            <SubmitButton
              isSubmitting={updateTeamMutation.isPending}
              disabled={updateTeamMutation.isPending}
            >
              {tActions("save")}
            </SubmitButton>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
