import { UTCDate } from "@date-fns/utc";
import { addDays, differenceInDays, isSameDay, parseISO } from "date-fns";

export function getTrialDaysLeft(createdAt: string): number {
  // Parse dates using UTCDate for consistent timezone handling
  const rawCreatedAt = parseISO(createdAt);
  const today = new UTCDate();

  // Convert to UTCDate for consistent calculation
  const createdAtDate = new UTCDate(rawCreatedAt);

  // Set trial end date 14 days from creation
  const trialEndDate = addDays(createdAtDate, 14);

  return isSameDay(createdAtDate, today)
    ? 14
    : Math.max(0, differenceInDays(trialEndDate, today));
}

export function isTrialExpired(createdAt: string): boolean {
  return getTrialDaysLeft(createdAt) <= 0;
}

const EXCLUDED_PATHS = ["/upgrade", "/settings", "/support"];

export function shouldShowUpgradeContent(
  plan: string | null | undefined,
  createdAt: string | null | undefined,
  pathname: string,
): boolean {
  return false;
}
