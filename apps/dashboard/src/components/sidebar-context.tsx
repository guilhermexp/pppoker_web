"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type SidebarContextValue = {
  isPinned: boolean;
  setIsPinned: (v: boolean | ((prev: boolean) => boolean)) => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  isPinned: false,
  setIsPinned: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isPinned, setIsPinned] = useState(true);
  return (
    <SidebarContext.Provider value={{ isPinned, setIsPinned }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarPinned() {
  return useContext(SidebarContext);
}
