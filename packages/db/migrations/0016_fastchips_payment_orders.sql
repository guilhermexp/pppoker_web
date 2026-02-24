-- Migration: fastchips_payment_orders
-- Tabela para rastrear pedidos de pagamento InfinitePay gerados pelo agente Fastchips

CREATE TYPE "payment_order_status" AS ENUM (
  'link_gerado',
  'pago',
  'fichas_enviadas',
  'cancelado',
  'erro'
);

CREATE TABLE "fastchips_payment_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "order_nsu" text NOT NULL,
  "status" "payment_order_status" DEFAULT 'link_gerado' NOT NULL,
  "player_uid" integer,
  "player_nome" text,
  "player_email" text,
  "player_telefone" text,
  "fichas" integer NOT NULL,
  "valor_reais" numeric(14,2) NOT NULL,
  "checkout_url" text,
  "slug" text,
  "transaction_nsu" text,
  "capture_method" text,
  "paid_amount" numeric(14,2),
  "installments" integer,
  "paid_at" timestamptz,
  "fichas_enviadas_at" timestamptz,
  "error_message" text,
  "metadata" jsonb DEFAULT '{}',
  CONSTRAINT "fpo_order_nsu_team_key" UNIQUE ("order_nsu", "team_id")
);

CREATE INDEX "fpo_team_id_idx" ON "fastchips_payment_orders" ("team_id");
CREATE INDEX "fpo_status_idx" ON "fastchips_payment_orders" ("status");
CREATE INDEX "fpo_created_at_idx" ON "fastchips_payment_orders" ("created_at");
CREATE INDEX "fpo_player_uid_idx" ON "fastchips_payment_orders" ("player_uid");

ALTER TABLE "fastchips_payment_orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payment orders managed by team members"
  ON "fastchips_payment_orders" AS PERMISSIVE FOR ALL TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));
