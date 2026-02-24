import { createAdminClient } from "@api/services/supabase";
import { OpenAPIHono } from "@hono/zod-openapi";

/**
 * Webhook publico para receber confirmacoes de pagamento da InfinitePay.
 * Montado ANTES do middleware protegido (sem auth — InfinitePay chama direto).
 *
 * A InfinitePay pode chamar multiplas vezes (com e sem dados completos).
 * O webhook so faz merge incremental — nunca apaga dados ja salvos.
 *
 * Payload recebido:
 * {
 *   "invoice_slug": "abc123",
 *   "amount": 1000,
 *   "paid_amount": 1010,
 *   "installments": 1,
 *   "capture_method": "credit_card",
 *   "transaction_nsu": "UUID",
 *   "order_nsu": "UUID-do-pedido",
 *   "receipt_url": "https://comprovante.com/123",
 *   "items": [...]
 * }
 */
const app = new OpenAPIHono();

app.post("/", async (c) => {
  // --- Issue #1: Webhook signature verification via shared secret header ---
  // TODO: Replace with IP allowlist once InfinitePay publishes their webhook source IPs.
  const expectedSecret = process.env.INFINITEPAY_WEBHOOK_SECRET;
  if (expectedSecret) {
    const receivedSecret = c.req.header("x-webhook-secret");
    if (receivedSecret !== expectedSecret) {
      console.error(
        "[infinitepay-webhook] Rejected: invalid or missing x-webhook-secret header",
      );
      return c.json({ error: "Unauthorized" }, 401);
    }
  } else {
    console.warn(
      "[infinitepay-webhook] INFINITEPAY_WEBHOOK_SECRET env var is not set — webhook signature verification is DISABLED. Set this variable to secure the endpoint.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const orderNsu = body.order_nsu;
  if (typeof orderNsu !== "string" || !orderNsu.trim()) {
    console.error("[infinitepay-webhook] Missing order_nsu in payload:", body);
    return c.json({ error: "Missing order_nsu" }, 400);
  }

  console.log(
    `[infinitepay-webhook] Payment received: order_nsu=${orderNsu}, capture_method=${body.capture_method ?? "n/a"}, paid_amount=${body.paid_amount ?? "n/a"}`,
  );

  const supabase = await createAdminClient();

  // Find the existing order by order_nsu
  const { data: existing, error: findError } = await supabase
    .from("fastchips_payment_orders")
    .select("id, team_id, status, transaction_nsu, slug, capture_method, paid_amount, metadata")
    .eq("order_nsu", orderNsu)
    .maybeSingle();

  if (findError) {
    console.error("[infinitepay-webhook] DB lookup error:", findError.message);
    return c.json({ error: "DB error" }, 500);
  }

  if (!existing) {
    console.warn(
      `[infinitepay-webhook] Order not found: ${orderNsu}. Webhook data lost.`,
    );
    return c.json({ ok: true, warning: "order_not_found" });
  }

  // --- Issue #4: Guard against overwriting fichas_enviadas back to pago ---
  // If fichas have already been sent, the order is fully processed.
  // Duplicate webhook deliveries must not regress the status.
  if (existing.status === "fichas_enviadas") {
    console.log(
      `[infinitepay-webhook] Order ${orderNsu} already has status 'fichas_enviadas' — skipping update (duplicate delivery).`,
    );
    return c.json({ ok: true, warning: "already_processed" });
  }

  // Incremental merge: only overwrite fields if the webhook provides actual values.
  // This handles InfinitePay sending multiple calls (first without details, then with).
  const now = new Date().toISOString();
  const paidAmountRaw = body.paid_amount;
  const paidAmount =
    typeof paidAmountRaw === "number" ? paidAmountRaw / 100 : null;

  const transactionNsu =
    typeof body.transaction_nsu === "string" ? body.transaction_nsu : null;
  const slug =
    typeof body.invoice_slug === "string" ? body.invoice_slug : null;
  const captureMethod =
    typeof body.capture_method === "string" ? body.capture_method : null;
  const installments =
    typeof body.installments === "number" ? body.installments : null;
  const receiptUrl =
    typeof body.receipt_url === "string" ? body.receipt_url : null;

  // Build update object — keep existing values when webhook doesn't provide new ones
  const existingMeta = (existing.metadata ?? {}) as Record<string, unknown>;

  const update: Record<string, unknown> = {
    status: "pago",
    updated_at: now,
    paid_at: now,
    metadata: {
      ...existingMeta,
      ...(receiptUrl ? { receipt_url: receiptUrl } : {}),
      webhook_received_at: now,
      raw_items: body.items ?? existingMeta.raw_items ?? null,
    },
  };

  if (transactionNsu) update.transaction_nsu = transactionNsu;
  if (slug) update.slug = slug;
  if (captureMethod) update.capture_method = captureMethod;
  if (paidAmount != null) update.paid_amount = paidAmount;
  if (installments != null) update.installments = installments;

  const { error: updateError } = await supabase
    .from("fastchips_payment_orders")
    .update(update)
    .eq("id", existing.id);

  if (updateError) {
    console.error(
      "[infinitepay-webhook] DB update error:",
      updateError.message,
    );
    return c.json({ error: "DB update failed" }, 500);
  }

  console.log(
    `[infinitepay-webhook] Order ${orderNsu} updated to 'pago' (team=${existing.team_id}, capture=${captureMethod ?? "n/a"})`,
  );

  return c.json({ ok: true });
});

export { app as infinitepayWebhookRouter };
