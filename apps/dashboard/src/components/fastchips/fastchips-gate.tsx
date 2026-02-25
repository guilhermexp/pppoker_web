"use client";

import { useFastchipsServiceQuery } from "@/hooks/use-team";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function FastchipsGate({ children }: { children: ReactNode }) {
  const { data: service } = useFastchipsServiceQuery();
  const pathname = usePathname();
  const router = useRouter();

  // Extract the path after /fastchips (ignoring locale prefix)
  const fastchipsPath = pathname.match(/\/fastchips(\/.*)?$/)?.[1] ?? "";
  const isMainPage = !fastchipsPath || fastchipsPath === "/";

  useEffect(() => {
    // If service is not active and user tries to access sub-pages, redirect to main
    if (service.status !== "active" && !isMainPage) {
      const localePart = pathname.match(/^\/[a-z]{2}/)?.[0] ?? "";
      router.replace(`${localePart}/fastchips`);
    }
  }, [service.status, isMainPage, pathname, router]);

  // If not active and not on main page, show nothing while redirecting
  if (service.status !== "active" && !isMainPage) {
    return null;
  }

  return <>{children}</>;
}
