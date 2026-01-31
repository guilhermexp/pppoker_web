"use client";

import type { SUViewMode } from "@/hooks/use-su-dashboard-params";
import { Icons } from "@midpoker/ui/icons";
import { Tabs, TabsList, TabsTrigger } from "@midpoker/ui/tabs";

interface SUWeekViewToggleProps {
  value: SUViewMode;
  onChange: (value: SUViewMode) => void;
  disabled?: boolean;
}

export function SUWeekViewToggle({
  value,
  onChange,
  disabled,
}: SUWeekViewToggleProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as SUViewMode)}
      className="w-auto"
      id="su-week-view"
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
