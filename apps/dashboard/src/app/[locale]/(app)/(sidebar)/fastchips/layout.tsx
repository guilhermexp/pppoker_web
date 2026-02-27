import { ErrorBoundary } from "@/components/error-boundary";
import { FastchipsGate } from "@/components/fastchips/fastchips-gate";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Fastchips",
};

export default function FastchipsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex items-center justify-center mt-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }
      >
        <FastchipsGate>{children}</FastchipsGate>
      </Suspense>
    </ErrorBoundary>
  );
}
