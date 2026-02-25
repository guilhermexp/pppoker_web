"use client";

import {
  useInfinitePaySettingsQuery,
  useInfinitePaySettingsMutation,
  useTestInfinitePayHandleMutation,
} from "@/hooks/use-team";
import { useZodForm } from "@/hooks/use-zod-form";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@midpoker/ui/form";
import { Input } from "@midpoker/ui/input";
import { Button } from "@midpoker/ui/button";
import { Suspense, useState } from "react";
import { z } from "zod/v3";

const formSchema = z.object({
  handle: z.string().min(1, "Handle é obrigatório"),
});

type TestState =
  | { step: "idle" }
  | { step: "testing" }
  | { step: "link_generated"; checkoutUrl: string }
  | { step: "approved" }
  | { step: "error"; message: string };

function InfinitePaySettingsForm() {
  const { data } = useInfinitePaySettingsQuery();
  const saveMutation = useInfinitePaySettingsMutation();
  const testMutation = useTestInfinitePayHandleMutation();
  const [testState, setTestState] = useState<TestState>({ step: "idle" });

  const form = useZodForm(formSchema, {
    defaultValues: {
      handle: data?.handle ?? "",
    },
  });

  const handle = form.watch("handle");
  const isAlreadyConfigured = data?.enabled && data?.handle;

  async function handleTest() {
    const valid = await form.trigger("handle");
    if (!valid) return;

    setTestState({ step: "testing" });
    testMutation.mutate(
      { handle: form.getValues("handle").trim() },
      {
        onSuccess: (result) => {
          setTestState({
            step: "link_generated",
            checkoutUrl: result.checkoutUrl,
          });
        },
        onError: (err) => {
          setTestState({
            step: "error",
            message: err.message,
          });
        },
      },
    );
  }

  function handleApproveAndSave() {
    saveMutation.mutate(
      {
        enabled: true,
        handle: form.getValues("handle").trim(),
      },
      {
        onSuccess: () => {
          setTestState({ step: "approved" });
        },
      },
    );
  }

  function handleDisable() {
    saveMutation.mutate(
      {
        enabled: false,
        handle: form.getValues("handle").trim(),
      },
      {
        onSuccess: () => {
          setTestState({ step: "idle" });
        },
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos - InfinitePay</CardTitle>
            <CardDescription>
              Configure a conta InfinitePay do seu clube para gerar links de
              pagamento (Pix/Cartão)
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="handle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handle InfinitePay</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: meu_clube_poker"
                      onChange={(e) => {
                        field.onChange(e);
                        if (testState.step !== "idle") {
                          setTestState({ step: "idle" });
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Identificador da sua conta na InfinitePay. Encontre no
                    painel InfinitePay em Configurações.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Test Flow */}
            <div className="space-y-3">
              {/* Step 1: Test button */}
              {(testState.step === "idle" || testState.step === "error") && (
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTest}
                    disabled={!handle?.trim() || testMutation.isPending}
                  >
                    {testMutation.isPending
                      ? "Gerando link de teste..."
                      : "Testar Handle (gera link de R$1,00)"}
                  </Button>
                  {testState.step === "error" && (
                    <p className="text-sm text-destructive">
                      {testState.message}
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: Testing */}
              {testState.step === "testing" && (
                <p className="text-sm text-muted-foreground">
                  Gerando link de teste...
                </p>
              )}

              {/* Step 3: Link generated - user verifies */}
              {testState.step === "link_generated" && (
                <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                  <p className="text-sm font-medium">
                    Link de teste gerado com sucesso!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Clique no link abaixo para verificar se abre corretamente.
                    Não precisa pagar.
                  </p>
                  <a
                    href={testState.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline break-all"
                  >
                    {testState.checkoutUrl}
                  </a>
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={handleApproveAndSave}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending
                        ? "Salvando..."
                        : "Link funcionou - Aprovar e Salvar"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTestState({ step: "idle" })}
                    >
                      Testar novamente
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Approved */}
              {testState.step === "approved" && (
                <div className="rounded-lg border border-green-500/30 p-4 bg-green-500/5">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    InfinitePay configurado e ativo!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Os links de pagamento do seu clube agora usam o handle "{handle}".
                  </p>
                </div>
              )}
            </div>

            {/* Show current status if already configured */}
            {isAlreadyConfigured &&
              testState.step === "idle" && (
                <div className="rounded-lg border border-green-500/30 p-4 bg-green-500/5">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Ativo - Handle: {data.handle}
                  </p>
                </div>
              )}
          </CardContent>

          <CardFooter className="flex justify-between">
            {isAlreadyConfigured && testState.step === "idle" && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDisable}
                disabled={saveMutation.isPending}
              >
                Desativar
              </Button>
            )}
            <div />
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

export function InfinitePaySettings() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader>
            <CardTitle>Pagamentos - InfinitePay</CardTitle>
            <CardDescription>Carregando...</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <InfinitePaySettingsForm />
    </Suspense>
  );
}
