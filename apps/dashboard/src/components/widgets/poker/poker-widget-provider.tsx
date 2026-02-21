"use client";

import {
  type WidgetStoreState,
  createWidgetStoreFactory,
} from "@/store/create-widget-store";
import type {
  PokerWidgetPreferences,
  PokerWidgetType,
} from "@midpoker/cache/poker-widget-preferences-cache";
import { type ReactNode, useRef } from "react";

// Create the poker widget store using the generic factory
const pokerWidgetFactory = createWidgetStoreFactory<PokerWidgetType>({
  storeName: "poker-widget-store",
  maxPrimaryWidgets: 8,
});

// Re-export the store creator for external usage
export const createPokerWidgetStore = pokerWidgetFactory.createStore;

// Type for the store API
export type PokerWidgetStoreApi = ReturnType<typeof createPokerWidgetStore>;

// Use the factory's context
export const PokerWidgetStoreContext = pokerWidgetFactory.StoreContext;

// Provider component
export interface PokerWidgetProviderProps {
  children: ReactNode;
  initialPreferences: PokerWidgetPreferences;
}

export const PokerWidgetProvider = ({
  children,
  initialPreferences,
}: PokerWidgetProviderProps) => {
  const storeRef = useRef<PokerWidgetStoreApi | null>(null);

  if (storeRef.current === null) {
    storeRef.current = createPokerWidgetStore(initialPreferences);
  }

  return (
    <PokerWidgetStoreContext.Provider value={storeRef.current}>
      {children}
    </PokerWidgetStoreContext.Provider>
  );
};

// Hook to use the store
export const usePokerWidgetStore = pokerWidgetFactory.useStore;

// Selector hooks
export const usePokerIsCustomizing = pokerWidgetFactory.useIsCustomizing;
export const usePokerPrimaryWidgets = pokerWidgetFactory.usePrimaryWidgets;
export const usePokerAvailableWidgets = pokerWidgetFactory.useAvailableWidgets;
export const usePokerWidgetActions = pokerWidgetFactory.useWidgetActions;

// Re-export state type for consumers
export type PokerWidgetState = WidgetStoreState<PokerWidgetType>;
