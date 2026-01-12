"use client";

import { cn } from "@midpoker/ui/cn";
import { Icons } from "@midpoker/ui/icons";
import { Skeleton } from "@midpoker/ui/skeleton";
import Link from "next/link";
import type { ReactNode } from "react";

interface StatBreakdown {
  label: string;
  value: string | number;
  color?: "green" | "red" | "blue" | "orange" | "purple";
}

interface SUStatCardProps {
  title: string;
  icon?: ReactNode;
  description?: string;
  children?: ReactNode;
  action?: string;
  actionHref?: string;
  breakdown?: StatBreakdown[];
  className?: string;
}

export function SUStatCard({
  title,
  icon,
  description,
  children,
  action,
  actionHref,
  breakdown,
  className,
}: SUStatCardProps) {
  const colorClasses: Record<string, string> = {
    green: "text-green-500",
    red: "text-red-500",
    blue: "text-blue-500",
    orange: "text-orange-500",
    purple: "text-purple-500",
  };

  return (
    <div
      className={cn(
        "bg-background border border-border rounded-lg p-5 flex flex-col",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-muted-foreground/70 mb-2">{description}</p>
      )}

      {/* Main Content */}
      {children}

      {/* Breakdown */}
      {breakdown && breakdown.length > 0 && (
        <div className="mt-auto pt-3 border-t border-border/50 space-y-1.5">
          {breakdown.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center text-xs"
            >
              <span className="text-muted-foreground">{item.label}</span>
              <span
                className={cn(
                  "font-mono",
                  item.color ? colorClasses[item.color] : "text-foreground",
                )}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action Link */}
      {action && actionHref && (
        <Link
          href={actionHref}
          className="mt-3 pt-3 border-t border-border/50 text-xs text-primary hover:underline flex items-center gap-1"
        >
          {action}
          <Icons.ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

SUStatCard.Skeleton = function SUStatCardSkeleton() {
  return (
    <div className="bg-background border border-border rounded-lg p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Description */}
      <Skeleton className="h-3 w-32 mb-2" />

      {/* Main Value */}
      <Skeleton className="h-8 w-20 mb-4" />

      {/* Breakdown */}
      <div className="mt-auto pt-3 border-t border-border/50 space-y-1.5">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
};
