import { z } from "@hono/zod-openapi";

export const infinitePaySettingsSchema = z.object({
  enabled: z.boolean().default(false),
  handle: z.string().min(1, "Handle é obrigatório").default(""),
});

export type InfinitePaySettings = z.infer<typeof infinitePaySettingsSchema>;

export function normalizeInfinitePaySettings(
  raw: unknown,
): InfinitePaySettings {
  if (!raw || typeof raw !== "object") {
    return { enabled: false, handle: "" };
  }
  const obj = raw as Record<string, unknown>;
  return {
    enabled: typeof obj.enabled === "boolean" ? obj.enabled : false,
    handle: typeof obj.handle === "string" ? obj.handle : "",
  };
}
