import { createAdminClient } from "@api/services/supabase";
import { upsertPaymentOrderSchema } from "@api/schemas/fastchips/payment-orders";
import { OpenAPIHono } from "@hono/zod-openapi";

/**
 * REST endpoint interno para o MCP server InfinitePay sincronizar pedidos de pagamento.
 * Autenticado via header x-api-key (sem sessão de usuário).
 * Montado ANTES do middleware protegido no index.ts.
 */
const app = new OpenAPIHono();

function isValidApiKey(req: Request): boolean {
  const expected = process.env.FASTCHIPS_API_KEY?.trim();
  if (!expected) return false;
  const key = req.headers.get("x-api-key") ?? "";
  return key === expected;
}

// POST /api/payment-orders — criar ou atualizar pedido
app.post("/", async (c) => {
  if (!isValidApiKey(c.req.raw)) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const parsed = upsertPaymentOrderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { success: false, error: "Validation error", details: parsed.error.flatten() },
      400,
    );
  }

  const input = parsed.data;
  const supabase = await createAdminClient();

  // Map camelCase → snake_case
  const row: Record<string, unknown> = {
    team_id: input.teamId,
    order_nsu: input.orderNsu,
    updated_at: new Date().toISOString(),
  };

  if (input.status) row.status = input.status;
  if (input.fichas != null) row.fichas = input.fichas;
  if (input.valorReais != null) row.valor_reais = input.valorReais;
  if (input.checkoutUrl !== undefined) row.checkout_url = input.checkoutUrl;
  if (input.slug !== undefined) row.slug = input.slug;
  if (input.playerUid !== undefined) row.player_uid = input.playerUid;
  if (input.playerNome !== undefined) row.player_nome = input.playerNome;
  if (input.playerEmail !== undefined) row.player_email = input.playerEmail;
  if (input.playerTelefone !== undefined) row.player_telefone = input.playerTelefone;
  if (input.transactionNsu !== undefined) row.transaction_nsu = input.transactionNsu;
  if (input.captureMethod !== undefined) row.capture_method = input.captureMethod;
  if (input.paidAmount !== undefined) row.paid_amount = input.paidAmount;
  if (input.installments !== undefined) row.installments = input.installments;
  if (input.paidAt !== undefined) row.paid_at = input.paidAt;
  if (input.errorMessage !== undefined) row.error_message = input.errorMessage;
  if (input.metadata) row.metadata = input.metadata;

  // Upsert by order_nsu + team_id
  const { data, error } = await supabase
    .from("fastchips_payment_orders")
    .upsert(row, { onConflict: "order_nsu,team_id" })
    .select("id, order_nsu, status")
    .single();

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

// GET /api/payment-orders — listar pedidos (uso interno)
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
    .from("fastchips_payment_orders")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return c.json({ success: false, error: error.message }, 500);
  }

  return c.json({ success: true, data });
});

export { app as paymentOrdersRouter };
