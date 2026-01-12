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
import { Input } from "@midpoker/ui/input";
import { SubmitButton } from "@midpoker/ui/submit-button";
import { z } from "zod/v3";

const formSchema = z.object({
  email: z.string().email(),
});

export function CompanyEmail() {
  const { data } = useTeamQuery();
  const updateTeamMutation = useTeamMutation();
  const t = useScopedI18n("settings.company_email");
  const tActions = useScopedI18n("actions");
  const tPlaceholders = useScopedI18n("placeholders");

  const form = useZodForm(formSchema, {
    defaultValues: {
      email: data?.email ?? "",
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
              name="email"
              render={({ field }) => (
                <FormItem className="max-w-[300px]">
                  <FormControl>
                    <Input {...field} placeholder={tPlaceholders("email")} />
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
