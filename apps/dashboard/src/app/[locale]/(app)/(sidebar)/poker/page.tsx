import { PokerDashboardHeader } from "@/components/poker/poker-dashboard-header";
import { PokerDashboardDataPanel } from "@/components/poker/poker-dashboard-data-panel";
import { PokerWidgetProvider } from "@/components/widgets/poker/poker-widget-provider";
import { HydrateClient } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Poker Club | Midday",
};

const defaultWidgetPreferences = {
  primaryWidgets: [
    "poker-total-sessions",
    "poker-total-players",
    "poker-active-agents",
    "poker-rake-total",
    "poker-rake-breakdown",
    "poker-total-rakeback",
    "poker-player-results",
    "poker-general-result",
  ] as const,
  availableWidgets: ["poker-game-types", "poker-players-by-region"] as const,
};

export default async function PokerPage() {
  return (
    <HydrateClient>
      <PokerWidgetProvider initialPreferences={defaultWidgetPreferences as any}>
        <div className="mt-6 flex flex-col gap-6">
          <PokerDashboardHeader />

          <div className="min-h-[680px]">
            <section className="hidden xl:flex min-h-[680px] items-center justify-center rounded-xl border border-dashed bg-muted/20">
              <div className="max-w-sm px-6 text-center">
                <p className="text-sm font-medium">Área central vazia (temporário)</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Os widgets do dashboard de poker foram removidos por enquanto.
                </p>
              </div>
            </section>
          </div>

          <PokerDashboardDataPanel />
        </div>
      </PokerWidgetProvider>
    </HydrateClient>
  );
}
