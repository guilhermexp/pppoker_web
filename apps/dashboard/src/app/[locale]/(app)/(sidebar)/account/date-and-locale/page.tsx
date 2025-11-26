import { ChangeTimezone } from "@/components/change-timezone";
import { DateFormatSettings } from "@/components/date-format-settings";
import { LanguageSettings } from "@/components/language-settings";
import { LocaleSettings } from "@/components/locale-settings";
import { TimeFormatSettings } from "@/components/time-format-settings";
import { WeekSettings } from "@/components/week-settings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Date & Locale | Midday",
};

export default async function Page() {
  return (
    <div className="space-y-12">
      <LanguageSettings />
      <LocaleSettings />
      <ChangeTimezone />
      <TimeFormatSettings />
      <DateFormatSettings />
      <WeekSettings />
    </div>
  );
}
