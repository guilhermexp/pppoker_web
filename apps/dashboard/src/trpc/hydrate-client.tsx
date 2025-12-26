"use client";

import {
  HydrationBoundary,
  type DehydratedState,
  isServer,
} from "@tanstack/react-query";
import type { ReactNode } from "react";

type Props = {
  state: DehydratedState;
  children: ReactNode;
};

export function HydrateClientBoundary({ state, children }: Props) {
  // On the server, QueryClientProvider is not available yet
  // Just render children and let the client hydrate properly
  if (isServer) {
    return <>{children}</>;
  }

  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
