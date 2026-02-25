"use client";

import {
  useActivateFastchipsMutation,
  useFastchipsServiceMutation,
  useFastchipsServiceQuery,
  useInfinitePaySettingsQuery,
} from "@/hooks/use-team";
import { useI18n } from "@/locales/client";
import { InfinitePaySettings } from "@/components/infinitepay-settings";
import { Button } from "@midpoker/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@midpoker/ui/card";
import { Icons } from "@midpoker/ui/icons";
import { Switch } from "@midpoker/ui/switch";
import { cn } from "@midpoker/ui/cn";
import { Suspense, useState } from "react";

const STEPS = ["infinitepay", "nanobot", "gateway"] as const;
type Step = (typeof STEPS)[number];

function StepIndicator({
  steps,
  currentIndex,
  service,
  ipConfigured,
}: {
  steps: readonly Step[];
  currentIndex: number;
  service: { setupSteps: { infinitepayConfigured: boolean; nanobotConfigured: boolean; gatewayConfigured: boolean } };
  ipConfigured: boolean;
}) {
  const t = useI18n();

  const stepLabels: Record<Step, string> = {
    infinitepay: t("fastchips.service.step_infinitepay"),
    nanobot: t("fastchips.service.step_nanobot"),
    gateway: t("fastchips.service.step_gateway"),
  };

  const isStepDone = (step: Step): boolean => {
    if (step === "infinitepay") return ipConfigured;
    if (step === "nanobot") return service.setupSteps.nanobotConfigured;
    if (step === "gateway") return service.setupSteps.gatewayConfigured;
    return false;
  };

  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, i) => {
        const done = isStepDone(step);
        const active = i === currentIndex;

        return (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-8",
                  i <= currentIndex ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  done
                    ? "bg-green-500 text-white"
                    : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <Icons.Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium hidden sm:inline",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {stepLabels[step]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepInfinitePay({ onConfigured }: { onConfigured: boolean }) {
  const t = useI18n();

  return (
    <div className="space-y-4">
      {onConfigured && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
          <Icons.Check className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            {t("fastchips.service.step_configured")}
          </span>
        </div>
      )}
      <InfinitePaySettings />
    </div>
  );
}

function StepNanobot() {
  const t = useI18n();
  const { data: service } = useFastchipsServiceQuery();
  const mutation = useFastchipsServiceMutation();
  const isEnabled = service.setupSteps.nanobotConfigured;

  function handleToggle(checked: boolean) {
    mutation.mutate({
      setupSteps: { nanobotConfigured: checked },
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icons.AI className="h-5 w-5" />
          {t("fastchips.service.step_nanobot")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("fastchips.service.nanobot_description")}
        </p>
        <div className="flex items-center gap-3">
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={mutation.isPending}
          />
          <span className="text-sm font-medium">
            {t("fastchips.service.nanobot_enabled")}
          </span>
          {isEnabled && (
            <Icons.Check className="h-4 w-4 text-green-600" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StepGateway() {
  const t = useI18n();
  const { data: service } = useFastchipsServiceQuery();

  return (
    <div className="space-y-4">
      {/* WhatsApp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icons.QrCode className="h-5 w-5" />
            {t("fastchips.service.gateway_whatsapp_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("fastchips.service.gateway_whatsapp_description")}
          </p>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                service.gateway.whatsappLinked ? "bg-green-500" : "bg-muted-foreground/40",
              )}
            />
            <span className="text-sm">
              {service.gateway.whatsappLinked
                ? t("fastchips.service.gateway_connected")
                : t("fastchips.service.gateway_disconnected")}
            </span>
          </div>
          {/* QR code area - will be connected to server.py gateway endpoint later */}
          {!service.gateway.whatsappLinked && (
            <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30">
              <div className="text-center text-muted-foreground">
                <Icons.QrCode className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t("fastchips.service.gateway_connecting")}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Telegram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icons.Notifications className="h-5 w-5" />
            {t("fastchips.service.gateway_telegram_title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("fastchips.service.gateway_telegram_description")}
          </p>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                service.gateway.telegramLinked ? "bg-green-500" : "bg-muted-foreground/40",
              )}
            />
            <span className="text-sm">
              {service.gateway.telegramLinked
                ? t("fastchips.service.gateway_connected")
                : t("fastchips.service.gateway_disconnected")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SetupWizardInner() {
  const t = useI18n();
  const { data: service } = useFastchipsServiceQuery();
  const { data: ipData } = useInfinitePaySettingsQuery();
  const activateMutation = useActivateFastchipsMutation();
  const [activated, setActivated] = useState(false);

  const ipConfigured = !!(ipData?.enabled && ipData?.handle);

  // Derive initial step from server state so remounts land on the right step
  const initialStep = !ipConfigured
    ? 0
    : !service.setupSteps.nanobotConfigured
      ? 1
      : 2;
  const [currentStep, setCurrentStep] = useState(initialStep);

  const canGoNext =
    currentStep === 0
      ? ipConfigured
      : currentStep === 1
        ? true // nanobot step is optional
        : true; // gateway step is optional

  function handleNext() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }

  function handlePrevious() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  function handleFinish() {
    activateMutation.mutate(undefined, {
      onSuccess: () => setActivated(true),
    });
  }

  function handleSkipGateway() {
    handleFinish();
  }

  if (activated) {
    return (
      <div className="flex flex-col items-center gap-4 mt-12 max-w-md mx-auto text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <Icons.Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">
          {t("fastchips.service.finish_success")}
        </h2>
        <p className="text-muted-foreground">
          {t("fastchips.service.finish_success_description")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {t("fastchips.service.setup_title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("fastchips.service.setup_subtitle")}
        </p>
      </div>

      <StepIndicator
        steps={STEPS}
        currentIndex={currentStep}
        service={service}
        ipConfigured={ipConfigured}
      />

      {/* Step content */}
      <div className="mb-8">
        {currentStep === 0 && <StepInfinitePay onConfigured={ipConfigured} />}
        {currentStep === 1 && <StepNanobot />}
        {currentStep === 2 && <StepGateway />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          {t("fastchips.service.previous")}
        </Button>

        <div className="flex gap-2">
          {currentStep === STEPS.length - 1 && (
            <Button
              variant="outline"
              onClick={handleSkipGateway}
              disabled={activateMutation.isPending}
            >
              {t("fastchips.service.gateway_skip")}
            </Button>
          )}

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canGoNext}>
              {t("fastchips.service.next")}
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={activateMutation.isPending || !ipConfigured}
            >
              {activateMutation.isPending
                ? t("fastchips.service.loading")
                : t("fastchips.service.finish_button")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SetupWizard() {
  const t = useI18n();

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center mt-12">
          <p className="text-muted-foreground">{t("fastchips.service.loading")}</p>
        </div>
      }
    >
      <SetupWizardInner />
    </Suspense>
  );
}
