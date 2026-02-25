"use client";

import { useFastchipsServiceMutation } from "@/hooks/use-team";
import { useI18n } from "@/locales/client";
import { Button } from "@midpoker/ui/button";
import { Card, CardContent } from "@midpoker/ui/card";
import { Icons } from "@midpoker/ui/icons";

const features = [
  {
    titleKey: "fastchips.service.feature_payments_title" as const,
    descriptionKey: "fastchips.service.feature_payments_description" as const,
    icon: Icons.Invoice,
  },
  {
    titleKey: "fastchips.service.feature_agent_title" as const,
    descriptionKey: "fastchips.service.feature_agent_description" as const,
    icon: Icons.AI,
  },
  {
    titleKey: "fastchips.service.feature_gateway_title" as const,
    descriptionKey: "fastchips.service.feature_gateway_description" as const,
    icon: Icons.Notifications,
  },
];

export function ActivationLanding() {
  const t = useI18n();
  const mutation = useFastchipsServiceMutation();

  function handleActivate() {
    mutation.mutate({ status: "setup" });
  }

  return (
    <div className="flex flex-col items-center gap-8 mt-12 max-w-3xl mx-auto">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("fastchips.service.landing_title")}
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          {t("fastchips.service.landing_subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 w-full">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.titleKey}>
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">{t(feature.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(feature.descriptionKey)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button
        size="lg"
        onClick={handleActivate}
        disabled={mutation.isPending}
        className="px-8"
      >
        {mutation.isPending
          ? t("fastchips.service.loading")
          : t("fastchips.service.activate_button")}
      </Button>
    </div>
  );
}
