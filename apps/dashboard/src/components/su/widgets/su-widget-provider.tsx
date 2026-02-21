"use client";

import {
  type WidgetStoreState,
  createWidgetStoreFactory,
} from "@/store/create-widget-store";
import { type ReactNode, useRef } from "react";

// SU Widget Types
export type SUWidgetType =
  | "su-total-leagues"
  | "su-total-games-ppst"
  | "su-total-games-ppsr"
  | "su-league-earnings"
  | "su-gap-guaranteed"
  | "su-player-winnings"
  | "su-breakdown-ppst-ppsr"
  | "su-top-leagues";

export interface SUWidgetPreferences {
  primaryWidgets: SUWidgetType[];
  availableWidgets: SUWidgetType[];
}

// Create the SU widget store using the generic factory
const suWidgetFactory = createWidgetStoreFactory<SUWidgetType>({
  storeName: "su-widget-store",
  maxPrimaryWidgets: 8,
});

// Re-export the store creator for external usage
export const createSUWidgetStore = suWidgetFactory.createStore;

// Type for the store API
export type SUWidgetStoreApi = ReturnType<typeof createSUWidgetStore>;

// Use the factory's context
export const SUWidgetStoreContext = suWidgetFactory.StoreContext;

// Provider component
export interface SUWidgetProviderProps {
  children: ReactNode;
  initialPreferences: SUWidgetPreferences;
}

export const SUWidgetProvider = ({
  children,
  initialPreferences,
}: SUWidgetProviderProps) => {
  const storeRef = useRef<SUWidgetStoreApi | null>(null);

  if (storeRef.current === null) {
    storeRef.current = createSUWidgetStore(initialPreferences);
  }

  return (
    <SUWidgetStoreContext.Provider value={storeRef.current}>
      {children}
    </SUWidgetStoreContext.Provider>
  );
};

// Hook to use the store
export const useSUWidgetStore = suWidgetFactory.useStore;

// Selector hooks
export const useSUIsCustomizing = suWidgetFactory.useIsCustomizing;
export const useSUPrimaryWidgets = suWidgetFactory.usePrimaryWidgets;
export const useSUAvailableWidgets = suWidgetFactory.useAvailableWidgets;
export const useSUWidgetActions = suWidgetFactory.useWidgetActions;

// Re-export state type for consumers
export type SUWidgetState = WidgetStoreState<SUWidgetType>;
