"use client";

import { SUDashboardHeader } from "@/components/league/su-dashboard-header";
import { SUWidgetsGrid } from "@/components/league/su-widgets-grid";

export default function PainelSUPage() {
  return (
    <div className="flex flex-col gap-6 mt-6">
      {/* Header */}
      <SUDashboardHeader />

      {/* Widgets Grid */}
      <SUWidgetsGrid />
    </div>
  );
}
