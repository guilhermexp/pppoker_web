"use client";

import {
  useCheckTestPaymentQuery,
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
import { Icons } from "@midpoker/ui/icons";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod/v3";

const formSchema = z.object({
  handle: z.string().min(1, "Handle é obrigatório"),
});

const PAYMENT_TIMEOUT_SECONDS = 5 * 60; // 5 minutes

type TestState =
  | { step: "idle" }
  | { step: "testing" }
  | { step: "waiting_payment"; checkoutUrl: string; orderNsu: string; startedAt: number }
  | { step: "approved" }
  | { step: "timeout" }
  | { step: "error"; message: string };

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PaymentPoller({
  orderNsu,
  startedAt,
  checkoutUrl,
  onPaid,
  onTimeout,
  onCancel,
}: {
  orderNsu: string;
  startedAt: number;
  checkoutUrl: string;
  onPaid: () => void;
  onTimeout: () => void;
  onCancel: () => void;
}) {
  const { data } = useCheckTestPaymentQuery(orderNsu);
  const [remaining, setRemaining] = useState(PAYMENT_TIMEOUT_SECONDS);
  const paidHandled = useRef(false);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, PAYMENT_TIMEOUT_SECONDS - elapsed);
      setRemaining(left);
      if (left === 0) {
        onTimeout();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, onTimeout]);

  // Auto-approve when payment detected
  useEffect(() => {
    if (data?.paid && !paidHandled.current) {
      paidHandled.current = true;
      onPaid();
    }
  }, [data?.paid, onPaid]);

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm font-medium">Aguardando pagamento...</p>
      </div>

      <p className="text-sm text-muted-foreground">
        Pague o link de R$1,00 abaixo para confirmar que o webhook está
        funcionando. O valor será recebido na sua conta InfinitePay.
      </p>

      <a
        href={checkoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary underline break-all"
      >
        {checkoutUrl}
      </a>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icons.Time className="h-4 w-4" />
          <span>Tempo restante: {formatCountdown(remaining)}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000"
          style={{
            width: `${(remaining / PAYMENT_TIMEOUT_SECONDS) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

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
            step: "waiting_payment",
            checkoutUrl: result.checkoutUrl,
            orderNsu: result.orderNsu,
            startedAt: Date.now(),
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

  const handlePaymentConfirmed = useCallback(() => {
    // Auto-save settings when webhook confirms payment
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
  }, [saveMutation, form]);

  const handleTimeout = useCallback(() => {
    setTestState({ step: "timeout" });
  }, []);

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
                      disabled={testState.step === "waiting_payment"}
                      onChange={(e) => {
                        field.onChange(e);
                        if (
                          testState.step !== "idle" &&
                          testState.step !== "waiting_payment"
                        ) {
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
              {(testState.step === "idle" || testState.step === "error" || testState.step === "timeout") && (
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
                  {testState.step === "timeout" && (
                    <div className="rounded-lg border border-yellow-500/30 p-3 bg-yellow-500/5">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        Tempo esgotado. O pagamento não foi detectado em 5
                        minutos. Verifique se o webhook está configurado
                        corretamente e tente novamente.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Testing */}
              {testState.step === "testing" && (
                <p className="text-sm text-muted-foreground">
                  Gerando link de teste...
                </p>
              )}

              {/* Step 3: Waiting for payment via webhook */}
              {testState.step === "waiting_payment" && (
                <PaymentPoller
                  orderNsu={testState.orderNsu}
                  startedAt={testState.startedAt}
                  checkoutUrl={testState.checkoutUrl}
                  onPaid={handlePaymentConfirmed}
                  onTimeout={handleTimeout}
                  onCancel={() => setTestState({ step: "idle" })}
                />
              )}

              {/* Step 4: Approved */}
              {testState.step === "approved" && (
                <div className="rounded-lg border border-green-500/30 p-4 bg-green-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Icons.Check className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Pagamento confirmado via webhook!
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    InfinitePay configurado e ativo. Os links de pagamento do
                    seu clube agora usam o handle &ldquo;{handle}&rdquo;.
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
