"use client";

import dynamic from "next/dynamic";

// Dynamic import with SSR disabled for AIDevtools (contains CSS imports that fail during SSR)
const AIDevtools = dynamic(
  () => import("@ai-sdk-tools/devtools").then((mod) => mod.AIDevtools),
  { ssr: false }
);

interface AIDevtoolsWrapperProps {
  config?: {
    streamCapture?: {
      enabled?: boolean;
      endpoint?: string;
      autoConnect?: boolean;
    };
  };
}

export function AIDevtoolsWrapper({ config }: AIDevtoolsWrapperProps) {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <AIDevtools config={config} />;
}
