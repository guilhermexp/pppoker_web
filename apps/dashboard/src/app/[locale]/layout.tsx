import "@/styles/globals.css";
import { cn } from "@midpoker/ui/cn";
import "@midpoker/ui/globals.css";
import { isDesktopApp } from "@/utils/desktop";
import { Toaster } from "@midpoker/ui/toaster";
import type { Metadata } from "next";
import { Hedvig_Letters_Sans, Hedvig_Letters_Serif } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactElement } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.mid.poker"),
  title: "Mid Poker | Gestão Financeira",
  description:
    "Automatize tarefas financeiras, mantenha-se organizado e tome decisões informadas.",
  twitter: {
    title: "Mid Poker | Gestão Financeira",
    description:
      "Automatize tarefas financeiras, mantenha-se organizado e tome decisões informadas.",
  },
  openGraph: {
    title: "Mid Poker | Gestão Financeira",
    description:
      "Automatize tarefas financeiras, mantenha-se organizado e tome decisões informadas.",
    url: "https://app.mid.poker",
    siteName: "Mid Poker",
    locale: "pt_BR",
    type: "website",
  },
};

const hedvigSans = Hedvig_Letters_Sans({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hedvig-sans",
});

const hedvigSerif = Hedvig_Letters_Serif({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hedvig-serif",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)" },
    { media: "(prefers-color-scheme: dark)" },
  ],
};

export default async function Layout({
  children,
  params,
}: {
  children: ReactElement;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isDesktop = await isDesktopApp();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(isDesktop && "desktop")}
    >
      <body
        className={cn(
          `${hedvigSans.variable} ${hedvigSerif.variable} font-sans`,
          "whitespace-pre-line overscroll-none antialiased",
        )}
      >
        <NuqsAdapter>
          <Providers locale={locale}>{children}</Providers>
          <Toaster />
        </NuqsAdapter>
      </body>
    </html>
  );
}
