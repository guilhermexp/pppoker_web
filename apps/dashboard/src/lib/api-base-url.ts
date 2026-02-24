function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return trimTrailingSlash(configured);

  // Local development fallback to avoid accidental relative /api/* calls.
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3101";
  }

  // Production fallback keeps relative behavior when infra proxies API.
  return "";
}

