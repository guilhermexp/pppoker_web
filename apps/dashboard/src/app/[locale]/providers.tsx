"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { I18nProviderClient } from "@/locales/client";
import { TRPCReactProvider } from "@/trpc/client";
import type { ReactNode } from "react";

type ProviderProps = {
  locale: string;
  children: ReactNode;
  initialAccessToken?: string | null;
};

export function Providers({
  locale,
  children,
  initialAccessToken,
}: ProviderProps) {
  return (
    <TRPCReactProvider initialAccessToken={initialAccessToken}>
      <I18nProviderClient locale={locale}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </I18nProviderClient>
    </TRPCReactProvider>
  );
}
