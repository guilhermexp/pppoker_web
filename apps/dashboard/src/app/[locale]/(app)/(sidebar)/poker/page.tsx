import { PokerDashboardHeader } from "@/components/poker/poker-dashboard-header";
import { PokerDashboardDataPanel } from "@/components/poker/poker-dashboard-data-panel";
import { PokerWidgetProvider } from "@/components/widgets/poker/poker-widget-provider";
import { PokerWidgetsGrid } from "@/components/widgets/poker/poker-widgets-grid";
import { HydrateClient } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Poker Club | Midday",
};

const defaultWidgetPreferences = {
  primaryWidgets: [
    "poker-total-members",
    "poker-pending-members",
    "poker-credit-requests",
    "poker-live-tables",
    "poker-online-players",
    "poker-active-agents",
    "poker-fastchips-sold",
  ] as const,
  availableWidgets: [
    "poker-total-sessions",
    "poker-total-players",
    "poker-rake-total",
    "poker-rake-breakdown",
    "poker-total-rakeback",
    "poker-player-results",
    "poker-general-result",
    "poker-game-types",
    "poker-players-by-region",
  ] as const,
};

export default async function PokerPage() {
  return (
    <HydrateClient>
      <PokerWidgetProvider initialPreferences={defaultWidgetPreferences as any}>
        <div className="mt-6 flex flex-col gap-6">
          <PokerDashboardHeader />
          <PokerWidgetsGrid />
          <PokerDashboardDataPanel />
        </div>
      </PokerWidgetProvider>
    </HydrateClient>
  );
}
