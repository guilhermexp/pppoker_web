import { type ReactNode, createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { devtools } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { createStore } from "zustand/vanilla";

/**
 * Generic widget store factory.
 *
 * Creates a Zustand store, React context, provider, and hooks for managing
 * widget preferences (primary/available widgets, customization mode, saving state).
 *
 * Used by:
 * - WidgetProvider (general dashboard widgets)
 * - PokerWidgetProvider (poker dashboard widgets)
 * - SUWidgetProvider (SuperUnion dashboard widgets)
 */

// ============================================================================
// Types
// ============================================================================

export interface WidgetPreferencesBase<T extends string> {
  primaryWidgets: T[];
  availableWidgets: T[];
}

export interface WidgetStoreState<T extends string> {
  // UI State
  isCustomizing: boolean;

  // Widget State
  primaryWidgets: T[];
  availableWidgets: T[];

  // Loading States
  isSaving: boolean;

  // Actions
  setIsCustomizing: (isCustomizing: boolean) => void;
  setWidgetPreferences: (preferences: WidgetPreferencesBase<T>) => void;

  // Widget Management
  reorderPrimaryWidgets: (newOrder: T[]) => void;
  moveToAvailable: (widgetId: T) => void;
  moveToPrimary: (widgetId: T, newPrimaryOrder: T[]) => void;
  swapWithLastPrimary: (widgetId: T, insertAtIndex: number) => void;

  // Data Actions
  setSaving: (isSaving: boolean) => void;
}

export interface WidgetStoreOptions {
  /** Dev tools name for debugging */
  storeName: string;
  /** Maximum number of primary widgets (default: 8) */
  maxPrimaryWidgets?: number;
}

// ============================================================================
// Store Factory
// ============================================================================

export function createWidgetStoreFactory<T extends string>(
  options: WidgetStoreOptions,
) {
  const { storeName, maxPrimaryWidgets = 8 } = options;

  // Store creator
  const createWidgetStoreInstance = (
    initialPreferences?: WidgetPreferencesBase<T>,
  ) => {
    const initialState = {
      isCustomizing: false,
      primaryWidgets: initialPreferences?.primaryWidgets || ([] as T[]),
      availableWidgets: initialPreferences?.availableWidgets || ([] as T[]),
      isSaving: false,
    };

    return createStore<WidgetStoreState<T>>()(
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
            if (newOrder.length > maxPrimaryWidgets) {
              console.warn(
                `Cannot have more than ${maxPrimaryWidgets} primary widgets`,
              );
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

          moveToPrimary: (widgetId: T, newPrimaryOrder: T[]) => {
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

          swapWithLastPrimary: (widgetId: T, insertAtIndex: number) => {
            const state = get();
            if (state.primaryWidgets.length < maxPrimaryWidgets) {
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
          name: storeName,
          skipHydration: true,
        },
      ),
    );
  };

  // Infer store API type
  type StoreApi = ReturnType<typeof createWidgetStoreInstance>;

  // Context
  const StoreContext = createContext<StoreApi | undefined>(undefined);

  // Hook to access the store (must be used within the provider)
  const useWidgetStoreHook = <R>(
    selector: (store: WidgetStoreState<T>) => R,
  ): R => {
    const storeContext = useContext(StoreContext);
    if (!storeContext) {
      throw new Error(
        `use${storeName.replace(/-/g, "")}Store must be used within its Provider`,
      );
    }
    return useStore(storeContext, selector);
  };

  // Selector hooks
  const useIsCustomizing = () =>
    useWidgetStoreHook((state) => state.isCustomizing);

  const usePrimaryWidgets = () =>
    useWidgetStoreHook((state) => state.primaryWidgets);

  const useAvailableWidgets = () =>
    useWidgetStoreHook((state) => state.availableWidgets);

  const useWidgetActions = () =>
    useWidgetStoreHook(
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

  return {
    createStore: createWidgetStoreInstance,
    StoreContext,
    useStore: useWidgetStoreHook,
    useIsCustomizing,
    usePrimaryWidgets,
    useAvailableWidgets,
    useWidgetActions,
  };
}
