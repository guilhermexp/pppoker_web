"use client";

import { Button } from "@midday/ui/button";
import { useState } from "react";
import { ChoosePlanModal } from "./modals/choose-plan-modal";

export function ChoosePlanButton({
  children,
  initialIsOpen,
  daysLeft,
  hasDiscount,
  discountPrice,
}: {
  children: React.ReactNode;
  initialIsOpen?: boolean;
  daysLeft?: number;
  hasDiscount?: boolean;
  discountPrice?: number;
}) {}
