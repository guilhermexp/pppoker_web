"use client";

import { useUserQuery } from "@/hooks/use-user";
import { useI18n } from "@/locales/client";
import { getTrialDaysLeft, isTrialExpired } from "@/utils/trial";
import { Button } from "@midday/ui/button";
import Link from "next/link";
import { FeedbackForm } from "./feedback-form";

export function Trial() {
  const { data: user } = useUserQuery();
  const t = useI18n();

  const team = user?.team;

  if (!team) {
    return null;
  }

  if (team.plan !== "trial") {
    return <FeedbackForm />;
  }

  // Check if trial has expired
  if (isTrialExpired(team.createdAt)) {
    // If trial expired, show feedback form (upgrade content is shown in layout)
    return <FeedbackForm />;
  }

  // Trial badge removed - no longer displaying trial days remaining
  return null;
}
