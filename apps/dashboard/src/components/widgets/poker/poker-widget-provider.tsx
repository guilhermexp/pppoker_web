"use client";

import type {
  PokerWidgetPreferences,
  PokerWidgetType,
} from "@midday/cache/poker-widget-preferences-cache";
import { type ReactNode, createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { devtools } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { createStore } from "zustand/vanilla";

interface PokerWidgetState {
  // UI State
  isCustomizing: boolean;

  // Widget State
  primaryWidgets: PokerWidgetType[];
  availableWidgets: PokerWidgetType[];

  // Loading States
  isSaving: boolean;

  // Actions
  setIsCustomizing: (isCustomizing: boolean) => void;
  setWidgetPreferences: (preferences: PokerWidgetPreferences) => void;

  // Widget Management
  reorderPrimaryWidgets: (newOrder: PokerWidgetType[]) => void;
  moveToAvailable: (widgetId: PokerWidgetType) => void;
  moveToPrimary: (
    widgetId: PokerWidgetType,
    newPrimaryOrder: PokerWidgetType[],
  ) => void;
  swapWithLastPrimary: (
    widgetId: PokerWidgetType,
    insertAtIndex: number,
  ) => void;

  // Data Actions
  setSaving: (isSaving: boolean) => void;
}

const NUMBER_OF_WIDGETS = 8;

// Store factory that accepts initial preferences
export const createPokerWidgetStore = (
  initialPreferences?: PokerWidgetPreferences,
) => {
  const initialState = {
    isCustomizing: false,
    primaryWidgets:
      initialPreferences?.primaryWidgets || ([] as PokerWidgetType[]),
    availableWidgets:
      initialPreferences?.availableWidgets || ([] as PokerWidgetType[]),
    isSaving: false,
  };

  return createStore<PokerWidgetState>()(
    devtools(
      (set, get) => ({
        ...initialState,

        setIsCustomizing: (isCustomizing) =>
          set({ isCustomizing }, false, "setIsCustomizing"),

        setWidgetPreferences: (preferences) =>
          set(
            {
              primaryWidgets: preferences.primaryWidgets,
              availableWidgets: preferences.availableWidgets,
            },
            false,
            "setWidgetPreferences",
          ),

        reorderPrimaryWidgets: (newOrder) => {
          if (newOrder.length > NUMBER_OF_WIDGETS) {
            console.warn("Cannot have more than 8 primary widgets");
            return;
          }
          set({ primaryWidgets: newOrder }, false, "reorderPrimaryWidgets");
        },

        moveToAvailable: (widgetId) => {
          const state = get();
          const newPrimaryWidgets = state.primaryWidgets.filter(
            (w) => w !== widgetId,
          );
          const newAvailableWidgets = [...state.availableWidgets, widgetId];

          set(
            {
              primaryWidgets: newPrimaryWidgets,
              availableWidgets: newAvailableWidgets,
            },
            false,
            "moveToAvailable",
          );
        },

        moveToPrimary: (
          widgetId: PokerWidgetType,
          newPrimaryOrder: PokerWidgetType[],
        ) => {
          const state = get();
          const newAvailableWidgets = state.availableWidgets.filter(
            (w) => w !== widgetId,
          );

          set(
            {
              primaryWidgets: newPrimaryOrder,
              availableWidgets: newAvailableWidgets,
            },
            false,
            "moveToPrimary",
          );
        },

        swapWithLastPrimary: (
          widgetId: PokerWidgetType,
          insertAtIndex: number,
        ) => {
          const state = get();
          if (state.primaryWidgets.length < NUMBER_OF_WIDGETS) {
            console.warn("Swap only needed when primary is full");
            return;
          }

          const lastPrimaryWidget =
            state.primaryWidgets[state.primaryWidgets.length - 1];
          if (!lastPrimaryWidget) {
            console.warn("No last primary widget found");
            return;
          }

          const newPrimaryWidgets = [...state.primaryWidgets.slice(0, -1)];
          const newAvailableWidgets = [
            ...state.availableWidgets.filter((w) => w !== widgetId),
            lastPrimaryWidget,
          ];

          newPrimaryWidgets.splice(insertAtIndex, 0, widgetId);

          set(
            {
              primaryWidgets: newPrimaryWidgets,
              availableWidgets: newAvailableWidgets,
            },
            false,
            "swapWithLastPrimary",
          );
        },

        setSaving: (isSaving) => set({ isSaving }, false, "setSaving"),
      }),
      {
        name: "poker-widget-store",
        skipHydration: true,
      },
    ),
  );
};

// Context for the store
export type PokerWidgetStoreApi = ReturnType<typeof createPokerWidgetStore>;

export const PokerWidgetStoreContext = createContext<
  PokerWidgetStoreApi | undefined
>(undefined);

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
export const usePokerWidgetStore = <T,>(
  selector: (store: PokerWidgetState) => T,
): T => {
  const storeContext = useContext(PokerWidgetStoreContext);

  if (!storeContext) {
    throw new Error(
      "usePokerWidgetStore must be used within PokerWidgetProvider",
    );
  }

  return useStore(storeContext, selector);
};

// Selector hooks
export const usePokerIsCustomizing = () =>
  usePokerWidgetStore((state) => state.isCustomizing);

export const usePokerPrimaryWidgets = () =>
  usePokerWidgetStore((state) => state.primaryWidgets);

export const usePokerAvailableWidgets = () =>
  usePokerWidgetStore((state) => state.availableWidgets);

export const usePokerWidgetActions = () =>
  usePokerWidgetStore(
    useShallow((state) => ({
      setIsCustomizing: state.setIsCustomizing,
      setWidgetPreferences: state.setWidgetPreferences,
      reorderPrimaryWidgets: state.reorderPrimaryWidgets,
      moveToAvailable: state.moveToAvailable,
      moveToPrimary: state.moveToPrimary,
      swapWithLastPrimary: state.swapWithLastPrimary,
      setSaving: state.setSaving,
    })),
  );
