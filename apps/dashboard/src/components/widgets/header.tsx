"use client";

import { ChatHistory } from "@/components/chat/chat-history";
import { Customize } from "@/components/widgets/customize";
import { useUserQuery } from "@/hooks/use-user";
import { useI18n } from "@/locales/client";
import { TZDate } from "@date-fns/tz";
import { useEffect, useState } from "react";
import { useIsCustomizing } from "./widget-provider";

function getTimeBasedGreetingKey(
  timezone?: string,
): "morning" | "afternoon" | "evening" | "night" {
  const userTimezone =
    timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new TZDate(new Date(), userTimezone);
  const hour = now.getHours();

  if (hour >= 5 && hour < 12) {
    return "morning";
  }
  if (hour >= 12 && hour < 17) {
    return "afternoon";
  }
  if (hour >= 17 && hour < 21) {
    return "evening";
  }

  return "night";
}

export function WidgetsHeader() {
  const { data: user } = useUserQuery();
  const isCustomizing = useIsCustomizing();
  const t = useI18n();
  const [greetingKey, setGreetingKey] = useState(() =>
    getTimeBasedGreetingKey(user?.timezone ?? undefined),
  );

  useEffect(() => {
    // Update greeting immediately when user timezone changes
    setGreetingKey(getTimeBasedGreetingKey(user?.timezone ?? undefined));

    // Set up interval to update greeting every 5 minutes
    // This ensures the greeting changes naturally as time passes
    const interval = setInterval(
      () => {
        const newGreetingKey = getTimeBasedGreetingKey(
          user?.timezone ?? undefined,
        );
        setGreetingKey(newGreetingKey);
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [user?.timezone]);

  return (
    <div className="flex justify-between items-start mb-8">
      <div>
        <h1 className="text-[30px] font-serif leading-normal mb-1">
          <span>{t(`dashboard.greeting.${greetingKey}`)} </span>
          <span className="text-[#666666]">
            {user?.fullName?.split(" ")[0]},
          </span>
        </h1>
        <p className="text-[#666666] text-[14px]">
          {isCustomizing ? t("dashboard.drag_drop") : t("dashboard.quick_look")}
        </p>
      </div>

      <div className="flex items-center space-x-4" data-no-close>
        <div className="hidden md:block">
          <Customize />
        </div>
        <ChatHistory />
      </div>
    </div>
  );
}
