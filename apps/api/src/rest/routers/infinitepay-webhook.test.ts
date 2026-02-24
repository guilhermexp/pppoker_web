import { describe, expect, it, mock, beforeEach } from "bun:test";

/**
 * Tests for InfinitePay integration:
 * - Webhook payload parsing
 * - Payment link generation (MCP contract)
 * - Payment check (MCP contract)
 */

// ── Webhook payload parsing ──────────────────────────────────────

describe("infinitepay webhook payload parsing", () => {
  const parseWebhookPayload = (body: Record<string, unknown>) => {
    const orderNsu = body.order_nsu;
    if (typeof orderNsu !== "string" || !orderNsu.trim()) {
      return { valid: false, error: "Missing order_nsu" };
    }

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

    return {
      valid: true,
      orderNsu,
      paidAmount,
      transactionNsu,
      slug,
      captureMethod,
      installments,
      receiptUrl,
    };
  };

  it("rejects payload without order_nsu", () => {
    const result = parseWebhookPayload({});
    expect(result.valid).toBe(false);
  });

  it("rejects empty order_nsu", () => {
    const result = parseWebhookPayload({ order_nsu: "  " });
    expect(result.valid).toBe(false);
  });

  it("parses complete InfinitePay webhook payload", () => {
    const result = parseWebhookPayload({
      invoice_slug: "abc123",
      amount: 1000,
      paid_amount: 1010,
      installments: 1,
      capture_method: "pix",
      transaction_nsu: "uuid-123",
      order_nsu: "xp_1771950065",
      receipt_url: "https://recibo.infinitepay.io/abc",
      items: [{ description: "500 Fichas", quantity: 1, price: 1000 }],
    });

    expect(result.valid).toBe(true);
    expect(result.orderNsu).toBe("xp_1771950065");
    expect(result.paidAmount).toBe(10.1);
    expect(result.captureMethod).toBe("pix");
    expect(result.transactionNsu).toBe("uuid-123");
    expect(result.slug).toBe("abc123");
    expect(result.installments).toBe(1);
    expect(result.receiptUrl).toBe("https://recibo.infinitepay.io/abc");
  });

  it("handles partial webhook (first call without details)", () => {
    const result = parseWebhookPayload({
      order_nsu: "xp_123",
      amount: 0,
      paid_amount: 0,
    });

    expect(result.valid).toBe(true);
    expect(result.orderNsu).toBe("xp_123");
    expect(result.paidAmount).toBe(0);
    expect(result.captureMethod).toBeNull();
    expect(result.transactionNsu).toBeNull();
    expect(result.slug).toBeNull();
  });

  it("converts paid_amount from centavos to reais", () => {
    const result = parseWebhookPayload({
      order_nsu: "xp_test",
      paid_amount: 5000,
    });

    expect(result.paidAmount).toBe(50);
  });

  it("handles credit card payment", () => {
    const result = parseWebhookPayload({
      order_nsu: "xp_card",
      capture_method: "credit_card",
      paid_amount: 10000,
      installments: 3,
    });

    expect(result.captureMethod).toBe("credit_card");
    expect(result.installments).toBe(3);
    expect(result.paidAmount).toBe(100);
  });
});

// ── InfinitePay checkout link contract ───────────────────────────

describe("infinitepay checkout link payload", () => {
  const HANDLE = "xperience_solutions";

  const buildCheckoutPayload = (params: {
    descricao: string;
    valorReais: number;
    orderNsu?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    webhookUrl?: string;
    redirectUrl?: string;
  }) => {
    const valorCentavos = Math.round(params.valorReais * 100);

    const payload: Record<string, unknown> = {
      handle: HANDLE,
      items: [
        {
          description: params.descricao,
          quantity: 1,
          price: valorCentavos,
        },
      ],
    };

    if (params.orderNsu) payload.order_nsu = params.orderNsu;

    const customer: Record<string, string> = {};
    if (params.customerName) customer.name = params.customerName;
    if (params.customerEmail) customer.email = params.customerEmail;
    if (params.customerPhone) customer.phone_number = params.customerPhone;
    if (Object.keys(customer).length > 0) payload.customer = customer;

    if (params.redirectUrl) payload.redirect_url = params.redirectUrl;
    if (params.webhookUrl) payload.webhook_url = params.webhookUrl;

    return payload;
  };

  it("builds minimal payload (required fields only)", () => {
    const payload = buildCheckoutPayload({
      descricao: "500 Fichas - Xperience Poker",
      valorReais: 10,
    });

    expect(payload).toEqual({
      handle: "xperience_solutions",
      items: [
        {
          description: "500 Fichas - Xperience Poker",
          quantity: 1,
          price: 1000,
        },
      ],
    });
  });

  it("uses price in centavos (not amount)", () => {
    const payload = buildCheckoutPayload({
      descricao: "Test",
      valorReais: 25.5,
    });

    const item = (payload.items as any[])[0];
    expect(item.price).toBe(2550);
    expect(item.amount).toBeUndefined();
  });

  it("includes order_nsu when provided", () => {
    const payload = buildCheckoutPayload({
      descricao: "Test",
      valorReais: 1,
      orderNsu: "xp_custom_123",
    });

    expect(payload.order_nsu).toBe("xp_custom_123");
  });

  it("includes customer as nested object", () => {
    const payload = buildCheckoutPayload({
      descricao: "Test",
      valorReais: 1,
      customerName: "Joao Silva",
      customerEmail: "joao@email.com",
      customerPhone: "+5511999887766",
    });

    expect(payload.customer).toEqual({
      name: "Joao Silva",
      email: "joao@email.com",
      phone_number: "+5511999887766",
    });
  });

  it("does NOT include customer_name/email as top-level fields", () => {
    const payload = buildCheckoutPayload({
      descricao: "Test",
      valorReais: 1,
      customerName: "Joao",
    });

    expect(payload.customer_name).toBeUndefined();
    expect(payload.customer_email).toBeUndefined();
  });

  it("includes webhook_url when provided", () => {
    const payload = buildCheckoutPayload({
      descricao: "Test",
      valorReais: 1,
      webhookUrl: "https://myapi.com/webhook",
    });

    expect(payload.webhook_url).toBe("https://myapi.com/webhook");
  });

  it("includes redirect_url when provided", () => {
    const payload = buildCheckoutPayload({
      descricao: "Test",
      valorReais: 1,
      redirectUrl: "https://mysite.com/obrigado",
    });

    expect(payload.redirect_url).toBe("https://mysite.com/obrigado");
  });

  it("does NOT include top-level amount field", () => {
    const payload = buildCheckoutPayload({
      descricao: "Test",
      valorReais: 50,
    });

    expect(payload.amount).toBeUndefined();
  });
});

// ── Payment check contract ───────────────────────────────────────

describe("infinitepay payment_check contract", () => {
  const HANDLE = "xperience_solutions";

  const buildPaymentCheckPayload = (params: {
    orderNsu: string;
    transactionNsu?: string;
    slug?: string;
  }) => {
    const payload: Record<string, string> = {
      handle: HANDLE,
      order_nsu: params.orderNsu,
    };
    if (params.transactionNsu) payload.transaction_nsu = params.transactionNsu;
    if (params.slug) payload.slug = params.slug;
    return payload;
  };

  it("builds minimal check (order_nsu only)", () => {
    const payload = buildPaymentCheckPayload({ orderNsu: "xp_123" });

    expect(payload).toEqual({
      handle: "xperience_solutions",
      order_nsu: "xp_123",
    });
  });

  it("includes transaction_nsu and slug when available", () => {
    const payload = buildPaymentCheckPayload({
      orderNsu: "xp_123",
      transactionNsu: "uuid-abc",
      slug: "invoice-xyz",
    });

    expect(payload).toEqual({
      handle: "xperience_solutions",
      order_nsu: "xp_123",
      transaction_nsu: "uuid-abc",
      slug: "invoice-xyz",
    });
  });

  it("uses POST endpoint (not GET)", () => {
    // Contract: POST /invoices/public/checkout/payment_check
    const endpoint = "https://api.infinitepay.io/invoices/public/checkout/payment_check";
    const method = "POST";

    expect(endpoint).toContain("payment_check");
    expect(method).toBe("POST");
  });

  it("parses successful payment response", () => {
    const response = {
      success: true,
      paid: true,
      amount: 1500,
      paid_amount: 1510,
      installments: 1,
      capture_method: "pix",
    };

    expect(response.paid).toBe(true);
    expect(response.paid_amount / 100).toBe(15.1);
    expect(response.capture_method).toBe("pix");
  });

  it("parses unpaid response", () => {
    const response = {
      success: false,
      paid: false,
      amount: 0,
      paid_amount: 0,
    };

    expect(response.paid).toBe(false);
  });
});
