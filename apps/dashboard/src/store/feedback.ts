import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FeedbackState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggle: () => void;
}

export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
      toggle: () => set((state) => ({ enabled: !state.enabled })),
    }),
    { name: "feedback-mode" },
  ),
);
