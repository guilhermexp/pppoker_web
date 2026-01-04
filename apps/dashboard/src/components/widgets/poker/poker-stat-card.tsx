"use client";

import { cn } from "@midday/ui/cn";
import Link from "next/link";
import type React from "react";

export interface BreakdownItem {
  label: string;
  value: number | string;
  color?: "default" | "green" | "red" | "orange" | "blue" | "purple";
}

interface PokerStatCardProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: string;
  actionHref?: string;
  className?: string;
  breakdown?: BreakdownItem[];
}

export function PokerStatCard({
  title,
  description,
  icon,
  children,
  action,
  actionHref,
  className,
  breakdown,
}: PokerStatCardProps) {
  const content = (
    <div
      className={cn(
        "dark:bg-[#0c0c0c] border dark:border-[#1d1d1d] p-4 h-[210px] flex flex-col justify-between transition-all duration-300 dark:hover:bg-[#0f0f0f] dark:hover:border-[#222222] group",
        actionHref && "cursor-pointer",
        className,
      )}
    >
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[#666666]">{icon}</span>
          <h3 className="text-xs text-[#666666] font-medium">{title}</h3>
        </div>
        {description && <p className="text-sm text-[#666666]">{description}</p>}
      </div>

      <div>
        {children}
        {breakdown && breakdown.length > 0 && (
          <div className="mt-2 space-y-1">
            {breakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-[#666666]">{item.label}</span>
                <span
                  className={cn(
                    "font-medium",
                    item.color === "green" && "text-green-500",
                    item.color === "red" && "text-red-500",
                    item.color === "orange" && "text-orange-500",
                    item.color === "blue" && "text-blue-500",
                    item.color === "purple" && "text-purple-500",
                    (!item.color || item.color === "default") &&
                      "text-foreground",
                  )}
                >
                  {typeof item.value === "number"
                    ? item.value.toLocaleString()
                    : item.value}
                </span>
              </div>
            ))}
          </div>
        )}
        {action && (
          <span className="text-xs text-[#666666] group-hover:text-primary transition-colors duration-300 mt-2 block">
            {action}
          </span>
        )}
      </div>
    </div>
  );

  if (actionHref) {
    return <Link href={actionHref}>{content}</Link>;
  }

  return content;
}

PokerStatCard.Skeleton = function PokerStatCardSkeleton() {
  return (
    <div className="dark:bg-[#0c0c0c] border dark:border-[#1d1d1d] p-4 h-[210px] flex flex-col justify-between animate-pulse">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-4 w-4 bg-[#1d1d1d] rounded" />
          <div className="h-3 w-20 bg-[#1d1d1d] rounded" />
        </div>
        <div className="h-3 w-32 bg-[#1d1d1d] rounded" />
      </div>
      <div>
        <div className="h-8 w-24 bg-[#1d1d1d] rounded mb-2" />
        <div className="h-3 w-16 bg-[#1d1d1d] rounded" />
      </div>
    </div>
  );
};
