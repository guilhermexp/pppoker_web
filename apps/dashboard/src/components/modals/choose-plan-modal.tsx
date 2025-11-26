"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@midday/ui/dialog";
import Link from "next/link";

export function ChoosePlanModal({
  isOpen,
  onOpenChange,
  daysLeft,
  hasDiscount,
  discountPrice,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  daysLeft?: number;
  hasDiscount?: boolean;
  discountPrice?: number;
}) {
  // Choose plan modal disabled - billing removed
  return null;
}
