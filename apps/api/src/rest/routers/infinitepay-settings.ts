import { normalizeInfinitePaySettings } from "@api/schemas/infinitepay-settings";
import { createAdminClient } from "@api/services/supabase";
import { OpenAPIHono } from "@hono/zod-openapi";

/**
 * REST endpoint for MCP server to fetch InfinitePay handle per team.
 * Authenticated via x-api-key (same key as payment-orders).
 */
const app = new OpenAPIHono();

function isValidApiKey(req: Request): boolean {
  const expected = process.env.FASTCHIPS_API_KEY?.trim();
  if (!expected) return false;
  const key = req.headers.get("x-api-key") ?? "";
  return key === expected;
}

// GET /api/infinitepay-settings?teamId=xxx
app.get("/", async (c) => {
  if (!isValidApiKey(c.req.raw)) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const teamId = c.req.query("teamId");
  if (!teamId) {
    return c.json({ success: false, error: "teamId is required" }, 400);
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("teams")
    .select("export_settings")
    .eq("id", teamId)
    .single();

  if (error || !data) {
    return c.json({ success: false, error: "Team not found" }, 404);
  }

  const exportSettings = data.export_settings as
    | Record<string, unknown>
    | null;
  const settings = normalizeInfinitePaySettings(exportSettings?.infinitepay);

  return c.json({
    success: true,
    handle: settings.enabled ? settings.handle : "",
    enabled: settings.enabled,
  });
});

export { app as infinitepaySettingsRouter };
