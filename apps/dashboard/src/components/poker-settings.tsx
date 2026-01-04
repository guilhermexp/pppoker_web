"use client";

import {
  usePokerSettingsMutation,
  usePokerSettingsQuery,
} from "@/hooks/use-team";
import { useZodForm } from "@/hooks/use-zod-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@midday/ui/card";
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
import { Suspense } from "react";
import { z } from "zod/v3";
import { PokerLinkedClubs } from "./poker-linked-clubs";

const PLATFORMS = [
  { value: "pppoker", label: "PPPoker" },
  { value: "suprema", label: "Suprema Poker" },
  { value: "pokerbros", label: "Poker Bros" },
  { value: "fishpoker", label: "Fish Poker" },
  { value: "xpoker", label: "X Poker" },
  { value: "other", label: "Outro" },
] as const;

const ENTITY_TYPES = [
  {
    value: "clube_privado",
    label: "Clube Privado",
    description: "Clube independente com lobby próprio",
  },
  {
    value: "clube_liga",
    label: "Clube em Liga",
    description: "Clube filiado a uma liga",
  },
  {
    value: "liga",
    label: "Liga",
    description: "Gerencia vários clubes (você é o Clube Master/Botão)",
  },
  {
    value: "ambos",
    label: "Liga + Clube",
    description: "Opera como liga e clube master",
  },
] as const;

const formSchema = z.object({
  pokerPlatform: z
    .enum(["pppoker", "suprema", "pokerbros", "fishpoker", "xpoker", "other"])
    .nullable()
    .optional(),
  pokerEntityType: z
    .enum(["clube_privado", "clube_liga", "liga", "ambos"])
    .nullable()
    .optional(),
  pokerClubId: z.string().nullable().optional(),
  pokerClubName: z.string().nullable().optional(),
  pokerLigaId: z.string().nullable().optional(),
  pokerLigaName: z.string().nullable().optional(),
  pokerSuId: z.string().nullable().optional(),
  pokerSuName: z.string().nullable().optional(),
});

function PokerSettingsForm() {
  const { data } = usePokerSettingsQuery();
  const updateMutation = usePokerSettingsMutation();

  const form = useZodForm(formSchema, {
    defaultValues: {
      pokerPlatform: data?.pokerPlatform ?? undefined,
      pokerEntityType: data?.pokerEntityType ?? undefined,
      pokerClubId: data?.pokerClubId ?? "",
      pokerClubName: data?.pokerClubName ?? "",
      pokerLigaId: data?.pokerLigaId ?? "",
      pokerLigaName: data?.pokerLigaName ?? "",
      pokerSuId: data?.pokerSuId ?? "",
      pokerSuName: data?.pokerSuName ?? "",
    },
  });

  const entityType = form.watch("pokerEntityType");
  const isClube =
    entityType === "clube_privado" ||
    entityType === "clube_liga" ||
    entityType === "ambos";
  const isLiga = entityType === "liga" || entityType === "ambos";
  const isClubeInLiga = entityType === "clube_liga";

  const onSubmit = form.handleSubmit((formData) => {
    updateMutation.mutate({
      pokerPlatform: formData.pokerPlatform || null,
      pokerEntityType: formData.pokerEntityType || null,
      pokerClubId: formData.pokerClubId || null,
      pokerClubName: formData.pokerClubName || null,
      pokerLigaId: formData.pokerLigaId || null,
      pokerLigaName: formData.pokerLigaName || null,
      pokerSuId: formData.pokerSuId || null,
      pokerSuName: formData.pokerSuName || null,
    });
  });

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={onSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Poker</CardTitle>
              <CardDescription>
                Configure sua identidade no ecossistema de poker online
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Platform and Entity Type Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pokerPlatform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plataforma</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a plataforma" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PLATFORMS.map((platform) => (
                            <SelectItem
                              key={platform.value}
                              value={platform.value}
                            >
                              {platform.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pokerEntityType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Entidade</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ENTITY_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <div>{type.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {type.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Club Fields - Show if clube or ambos */}
              {isClube && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Dados do Clube
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pokerClubId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID do Clube</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Ex: 123456"
                            />
                          </FormControl>
                          <FormDescription>
                            ID do clube na plataforma
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pokerClubName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Clube</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Ex: Meu Clube"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Liga vinculada - only for clube_liga */}
                  {isClubeInLiga && (
                    <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                      <h5 className="text-sm font-medium">Liga Vinculada</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="pokerLigaId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ID da Liga</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  placeholder="Ex: 789012"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="pokerLigaName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome da Liga</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  placeholder="Ex: Liga ABC"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Liga Fields - Show if liga or ambos */}
              {isLiga && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Dados da Liga
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pokerLigaId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID da Liga</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Ex: 789012"
                            />
                          </FormControl>
                          <FormDescription>
                            ID da liga na plataforma
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pokerLigaName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Liga</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Ex: Liga ABC"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Super Union (PPST/PPSR) */}
                  <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                    <div>
                      <h5 className="text-sm font-medium">
                        Super Union (opcional)
                      </h5>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        PPST = Torneios Globais | PPSR = Cash Games Globais
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="pokerSuId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ID da Super Union</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                placeholder="Ex: 1765"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pokerSuName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Super Union</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                placeholder="Ex: Super Union Brasil"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex justify-end">
              <SubmitButton
                isSubmitting={updateMutation.isPending}
                disabled={updateMutation.isPending}
              >
                Salvar
              </SubmitButton>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {/* Linked Clubs Section - Only show for Liga */}
      {isLiga && (
        <Suspense
          fallback={
            <div className="p-4 text-center text-muted-foreground">
              Carregando clubes...
            </div>
          }
        >
          <PokerLinkedClubs />
        </Suspense>
      )}
    </div>
  );
}

export function PokerSettings() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Poker</CardTitle>
            <CardDescription>Carregando...</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <PokerSettingsForm />
    </Suspense>
  );
}
