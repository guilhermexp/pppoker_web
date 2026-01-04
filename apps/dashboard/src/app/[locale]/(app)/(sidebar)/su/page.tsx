"use client";

import { SUDashboardHeader } from "@/components/su/su-dashboard-header";
import {
  SUWidgetProvider,
  type SUWidgetType,
} from "@/components/su/widgets/su-widget-provider";
import { SUWidgetsGrid } from "@/components/su/widgets/su-widgets-grid";

// Default widgets configuration
const DEFAULT_PRIMARY_WIDGETS: SUWidgetType[] = [
  "su-total-leagues",
  "su-total-games-ppst",
  "su-total-games-ppsr",
  "su-league-earnings",
  "su-gap-guaranteed",
  "su-player-winnings",
  "su-breakdown-ppst-ppsr",
  "su-top-leagues",
];

export default function SuperUnionPage() {
  return (
    <SUWidgetProvider
      initialPreferences={{
        primaryWidgets: DEFAULT_PRIMARY_WIDGETS,
        availableWidgets: [],
      }}
    >
      <div className="flex flex-col gap-6 mt-6">
        {/* Header */}
        <SUDashboardHeader />

        {/* Widgets Grid */}
        <SUWidgetsGrid />
      </div>
    </SUWidgetProvider>
  );
}
