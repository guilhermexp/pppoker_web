"use client";

import type { ViewMode } from "@/hooks/use-poker-dashboard-params";
import { Icons } from "@midday/ui/icons";
import { Tabs, TabsList, TabsTrigger } from "@midday/ui/tabs";

interface WeekViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  disabled?: boolean;
}

export function WeekViewToggle({
  value,
  onChange,
  disabled,
}: WeekViewToggleProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as ViewMode)}
      className="w-auto"
    >
      <TabsList className="h-8">
        <TabsTrigger
          value="current_week"
          disabled={disabled}
          className="text-xs px-3 h-7"
        >
          <Icons.CalendarMonth className="mr-1.5 h-3.5 w-3.5" />
          Semana Atual
        </TabsTrigger>
        <TabsTrigger
          value="historical"
          disabled={disabled}
          className="text-xs px-3 h-7"
        >
          <Icons.History className="mr-1.5 h-3.5 w-3.5" />
          Histórico
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
