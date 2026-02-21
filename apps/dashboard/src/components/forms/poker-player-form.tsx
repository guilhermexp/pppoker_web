"use client";

import { usePokerPlayerParams } from "@/hooks/use-poker-player-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useI18n } from "@/locales/client";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@midpoker/ui/accordion";
import { Button } from "@midpoker/ui/button";
import { Checkbox } from "@midpoker/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@midpoker/ui/select";
import { SubmitButton } from "@midpoker/ui/submit-button";
import { Textarea } from "@midpoker/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod/v3";

const formSchema = z.object({
  id: z.string().uuid().optional(),
  ppPokerId: z.string().min(1, {
    message: "PPPoker ID is required.",
  }),
  nickname: z.string().min(1, {
    message: "Nickname is required.",
  }),
  memoName: z.string().optional().nullable(),
  type: z.enum(["player", "agent"]).default("player"),
  status: z
    .enum(["active", "inactive", "suspended", "blacklisted"])
    .default("active"),
  agentId: z.string().uuid().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  creditLimit: z.coerce.number().min(0).default(0),
  isVip: z.boolean().default(false),
  isShark: z.boolean().default(false),
  note: z.string().optional().nullable(),
});

type Props = {
  data?: RouterOutputs["poker"]["players"]["getById"];
};

export function PokerPlayerForm({ data }: Props) {
  const t = useI18n();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isEdit = !!data;

  const { setParams } = usePokerPlayerParams();

  // Fetch agents for the dropdown
  const { data: agentsData } = useQuery(
    trpc.poker.players.getAgents.queryOptions(),
  );
  const agents = agentsData ?? [];

  const upsertPlayerMutation = useMutation(
    trpc.poker.players.upsert.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.get.infiniteQueryKey(),
        });

        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.getById.queryKey(),
        });

        queryClient.invalidateQueries({
          queryKey: trpc.poker.players.getAgents.queryKey(),
        });

        // Close the form
        setParams(null);
      },
    }),
  );

  const form = useZodForm(formSchema, {
    defaultValues: {
      id: data?.id,
      ppPokerId: data?.ppPokerId ?? "",
      nickname: data?.nickname ?? "",
      memoName: data?.memoName ?? null,
      type: data?.type ?? "player",
      status: data?.status ?? "active",
      agentId: data?.agentId ?? null,
      email: data?.email ?? null,
      phone: data?.phone ?? null,
      creditLimit: data?.creditLimit ?? 0,
      isVip: data?.isVip ?? false,
      isShark: data?.isShark ?? false,
      note: data?.note ?? null,
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const formattedData = {
      ...values,
      id: values.id || undefined,
      memoName: values.memoName || null,
      agentId: values.agentId || null,
      email: values.email?.trim() ? values.email.trim() : null,
      phone: values.phone || null,
      note: values.note || null,
    };

    upsertPlayerMutation.mutate(formattedData);
  };

  const watchType = form.watch("type");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="h-[calc(100vh-180px)] scrollbar-hide overflow-auto">
          <div>
            <Accordion
              type="multiple"
              defaultValue={["general", "financial"]}
              className="space-y-6"
            >
              <AccordionItem value="general">
                <AccordionTrigger>
                  {t("forms.sections.general")}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="ppPokerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-[#878787] font-normal">
                            {t("poker.players.form.pppoker_id")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              autoFocus
                              placeholder={t(
                                "poker.players.form.pppoker_id_placeholder",
                              )}
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("poker.players.form.pppoker_id_description")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nickname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-[#878787] font-normal">
                            {t("poker.players.form.nickname")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder={t(
                                "poker.players.form.nickname_placeholder",
                              )}
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("poker.players.form.nickname_description")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="memoName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-[#878787] font-normal">
                            {t("poker.players.form.memo_name")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder={t(
                                "poker.players.form.memo_name_placeholder",
                              )}
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("poker.players.form.memo_name_description")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-[#878787] font-normal">
                              {t("poker.players.form.type")}
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="player">
                                  {t("poker.players.type.player")}
                                </SelectItem>
                                <SelectItem value="agent">
                                  {t("poker.players.type.agent")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t("poker.players.form.type_description")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-[#878787] font-normal">
                              {t("poker.players.form.status")}
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">
                                  {t("poker.players.status.active")}
                                </SelectItem>
                                <SelectItem value="inactive">
                                  {t("poker.players.status.inactive")}
                                </SelectItem>
                                <SelectItem value="suspended">
                                  {t("poker.players.status.suspended")}
                                </SelectItem>
                                <SelectItem value="blacklisted">
                                  {t("poker.players.status.blacklisted")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t("poker.players.form.status_description")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {watchType === "player" && agents.length > 0 && (
                      <FormField
                        control={form.control}
                        name="agentId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-[#878787] font-normal">
                              {t("poker.players.form.agent")}
                            </FormLabel>
                            <Select
                              onValueChange={(value) =>
                                field.onChange(value === "none" ? null : value)
                              }
                              defaultValue={field.value ?? "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t(
                                      "poker.players.form.agent_placeholder",
                                    )}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">
                                  {t("poker.players.filter.all_agents")}
                                </SelectItem>
                                {agents.map((agent) => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    {agent.nickname}
                                    {agent.memoName && ` (${agent.memoName})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {t("poker.players.form.agent_description")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contact">
                <AccordionTrigger>Contact</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-[#878787] font-normal">
                            {t("poker.players.form.email")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder={t(
                                "poker.players.form.email_placeholder",
                              )}
                              type="email"
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-[#878787] font-normal">
                            {t("poker.players.form.phone")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder={t(
                                "poker.players.form.phone_placeholder",
                              )}
                              type="tel"
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="financial">
                <AccordionTrigger>Financial</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="creditLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-[#878787] font-normal">
                            {t("poker.players.form.credit_limit")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder={t(
                                "poker.players.form.credit_limit_placeholder",
                              )}
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormDescription>
                            {t("poker.players.form.credit_limit_description")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4 pt-2">
                      <FormField
                        control={form.control}
                        name="isVip"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-normal">
                                {t("poker.players.form.is_vip")}
                              </FormLabel>
                              <FormDescription>
                                {t("poker.players.form.is_vip_description")}
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isShark"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="font-normal">
                                {t("poker.players.form.is_shark")}
                              </FormLabel>
                              <FormDescription>
                                {t("poker.players.form.is_shark_description")}
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="notes">
                <AccordionTrigger>Notes</AccordionTrigger>
                <AccordionContent>
                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-[#878787] font-normal">
                          {t("poker.players.form.note")}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value ?? ""}
                            className="flex min-h-[80px] resize-none"
                            placeholder={t(
                              "poker.players.form.note_placeholder",
                            )}
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex justify-end mt-auto space-x-4">
            <Button
              variant="outline"
              onClick={() => setParams(null)}
              type="button"
            >
              {t("forms.buttons.cancel")}
            </Button>

            <SubmitButton
              isSubmitting={upsertPlayerMutation.isPending}
              disabled={
                upsertPlayerMutation.isPending || !form.formState.isDirty
              }
            >
              {isEdit
                ? t("poker.players.form.update_button")
                : t("poker.players.form.create_button")}
            </SubmitButton>
          </div>
        </div>
      </form>
    </Form>
  );
}
