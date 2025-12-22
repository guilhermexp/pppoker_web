"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Wrapper component that only renders children on the client side.
 * Use this for components that depend on context providers (TRPC, QueryClient, nuqs, etc.)
 * that are not available during SSR.
 */
export function ClientOnly({ children, fallback = null }: Props) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return fallback;
  }

  return children;
}
