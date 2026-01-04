"use client";

import { type ReactNode, createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { devtools } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { createStore } from "zustand/vanilla";

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

interface SUWidgetState {
  // UI State
  isCustomizing: boolean;

  // Widget State
  primaryWidgets: SUWidgetType[];
  availableWidgets: SUWidgetType[];

  // Loading States
  isSaving: boolean;

  // Actions
  setIsCustomizing: (isCustomizing: boolean) => void;
  setWidgetPreferences: (preferences: SUWidgetPreferences) => void;

  // Widget Management
  reorderPrimaryWidgets: (newOrder: SUWidgetType[]) => void;
  moveToAvailable: (widgetId: SUWidgetType) => void;
  moveToPrimary: (
    widgetId: SUWidgetType,
    newPrimaryOrder: SUWidgetType[],
  ) => void;
  swapWithLastPrimary: (widgetId: SUWidgetType, insertAtIndex: number) => void;

  // Data Actions
  setSaving: (isSaving: boolean) => void;
}

const NUMBER_OF_WIDGETS = 8;

// Store factory that accepts initial preferences
export const createSUWidgetStore = (
  initialPreferences?: SUWidgetPreferences,
) => {
  const initialState = {
    isCustomizing: false,
    primaryWidgets:
      initialPreferences?.primaryWidgets || ([] as SUWidgetType[]),
    availableWidgets:
      initialPreferences?.availableWidgets || ([] as SUWidgetType[]),
    isSaving: false,
  };

  return createStore<SUWidgetState>()(
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
          widgetId: SUWidgetType,
          newPrimaryOrder: SUWidgetType[],
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
          widgetId: SUWidgetType,
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
        name: "su-widget-store",
        skipHydration: true,
      },
    ),
  );
};

// Context for the store
export type SUWidgetStoreApi = ReturnType<typeof createSUWidgetStore>;

export const SUWidgetStoreContext = createContext<SUWidgetStoreApi | undefined>(
  undefined,
);

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
export const useSUWidgetStore = <T,>(
  selector: (store: SUWidgetState) => T,
): T => {
  const storeContext = useContext(SUWidgetStoreContext);

  if (!storeContext) {
    throw new Error("useSUWidgetStore must be used within SUWidgetProvider");
  }

  return useStore(storeContext, selector);
};

// Selector hooks
export const useSUIsCustomizing = () =>
  useSUWidgetStore((state) => state.isCustomizing);

export const useSUPrimaryWidgets = () =>
  useSUWidgetStore((state) => state.primaryWidgets);

export const useSUAvailableWidgets = () =>
  useSUWidgetStore((state) => state.availableWidgets);

export const useSUWidgetActions = () =>
  useSUWidgetStore(
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
