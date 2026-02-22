"use client";

import { cn } from "@midpoker/ui/cn";
import type { ReactNode } from "react";
import { useSidebarPinned } from "./sidebar-context";

export function SidebarContentWrapper({ children }: { children: ReactNode }) {
  const { isPinned } = useSidebarPinned();

  return (
    <div
      className={cn(
        "pb-4 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isPinned ? "md:ml-[240px]" : "md:ml-[56px]",
      )}
    >
      {children}
    </div>
  );
}
