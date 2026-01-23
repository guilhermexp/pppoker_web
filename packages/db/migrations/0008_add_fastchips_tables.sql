-- Migration: Add Fastchips (Chippix) tables for import system
-- Generated: 2024-01-23

-- Enums
CREATE TYPE "fastchips_import_status" AS ENUM ('pending', 'validating', 'validated', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE "fastchips_operation_type" AS ENUM ('entrada', 'saida');
CREATE TYPE "fastchips_purpose" AS ENUM ('recebimento', 'pagamento', 'saque', 'servico');
CREATE TYPE "fastchips_member_status" AS ENUM ('active', 'inactive');
CREATE TYPE "fastchips_restriction" AS ENUM ('auto_withdraw', 'blocked');

-- Table: fastchips_imports
CREATE TABLE "fastchips_imports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid NOT NULL,
  "file_name" text NOT NULL,
  "file_size" integer,
  "status" "fastchips_import_status" DEFAULT 'pending' NOT NULL,
  "period_start" timestamp with time zone,
  "period_end" timestamp with time zone,
  "total_operations" integer DEFAULT 0,
  "total_members" integer DEFAULT 0,
  "new_members" integer DEFAULT 0,
  "validation_passed" boolean DEFAULT false,
  "validation_errors" jsonb,
  "validation_warnings" jsonb,
  "processed_at" timestamp with time zone,
  "processed_by_id" uuid,
  "processing_errors" jsonb,
  "raw_data" jsonb,
  CONSTRAINT "fastchips_imports_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "fastchips_imports_processed_by_id_fkey" FOREIGN KEY ("processed_by_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "fastchips_imports_team_id_idx" ON "fastchips_imports" ("team_id");
CREATE INDEX "fastchips_imports_status_idx" ON "fastchips_imports" ("status");
CREATE INDEX "fastchips_imports_created_at_idx" ON "fastchips_imports" ("created_at");

-- Table: fastchips_members
CREATE TABLE "fastchips_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid NOT NULL,
  "name" text NOT NULL,
  "pppoker_id" text,
  "poker_player_id" uuid,
  "status" "fastchips_member_status" DEFAULT 'active' NOT NULL,
  "restriction" "fastchips_restriction",
  "linked_at" timestamp with time zone,
  "total_linked_accounts" integer DEFAULT 0,
  "note" text,
  "fts" tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce("name", '') || ' ' || coalesce("pppoker_id", ''))) STORED,
  CONSTRAINT "fastchips_members_name_team_id_key" UNIQUE ("name", "team_id"),
  CONSTRAINT "fastchips_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "fastchips_members_poker_player_id_fkey" FOREIGN KEY ("poker_player_id") REFERENCES "poker_players"("id") ON DELETE SET NULL
);

CREATE INDEX "fastchips_members_team_id_idx" ON "fastchips_members" ("team_id");
CREATE INDEX "fastchips_members_status_idx" ON "fastchips_members" ("status");
CREATE INDEX "fastchips_members_pppoker_id_idx" ON "fastchips_members" ("pppoker_id");
CREATE INDEX "fastchips_members_fts_idx" ON "fastchips_members" USING GIN ("fts");

-- Table: fastchips_operations
CREATE TABLE "fastchips_operations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid NOT NULL,
  "import_id" uuid NOT NULL,
  "external_id" text NOT NULL,
  "payment_id" text NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "operation_type" "fastchips_operation_type" NOT NULL,
  "purpose" "fastchips_purpose" NOT NULL,
  "member_id" uuid NOT NULL,
  "member_name" text NOT NULL,
  "pppoker_id" text,
  "gross_amount" numeric(14, 2) NOT NULL,
  "net_amount" numeric(14, 2) NOT NULL,
  "fee_rate" numeric(5, 2) DEFAULT 0 NOT NULL,
  "fee_amount" numeric(14, 2) DEFAULT 0,
  CONSTRAINT "fastchips_operations_external_id_team_id_key" UNIQUE ("external_id", "team_id"),
  CONSTRAINT "fastchips_operations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "fastchips_operations_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "fastchips_imports"("id") ON DELETE CASCADE,
  CONSTRAINT "fastchips_operations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "fastchips_members"("id") ON DELETE CASCADE
);

CREATE INDEX "fastchips_operations_team_id_idx" ON "fastchips_operations" ("team_id");
CREATE INDEX "fastchips_operations_import_id_idx" ON "fastchips_operations" ("import_id");
CREATE INDEX "fastchips_operations_member_id_idx" ON "fastchips_operations" ("member_id");
CREATE INDEX "fastchips_operations_occurred_at_idx" ON "fastchips_operations" ("occurred_at");
CREATE INDEX "fastchips_operations_operation_type_idx" ON "fastchips_operations" ("operation_type");
CREATE INDEX "fastchips_operations_purpose_idx" ON "fastchips_operations" ("purpose");

-- Table: fastchips_linked_accounts
CREATE TABLE "fastchips_linked_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "team_id" uuid NOT NULL,
  "member_id" uuid NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "linked_at" timestamp with time zone,
  "status" "fastchips_member_status" DEFAULT 'active' NOT NULL,
  "restriction" "fastchips_restriction",
  CONSTRAINT "fastchips_linked_accounts_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
  CONSTRAINT "fastchips_linked_accounts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "fastchips_members"("id") ON DELETE CASCADE
);

CREATE INDEX "fastchips_linked_accounts_team_id_idx" ON "fastchips_linked_accounts" ("team_id");
CREATE INDEX "fastchips_linked_accounts_member_id_idx" ON "fastchips_linked_accounts" ("member_id");

-- RLS Policies
ALTER TABLE "fastchips_imports" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fastchips imports can be managed by team members" ON "fastchips_imports" AS PERMISSIVE FOR ALL TO public USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

ALTER TABLE "fastchips_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fastchips members can be managed by team members" ON "fastchips_members" AS PERMISSIVE FOR ALL TO public USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

ALTER TABLE "fastchips_operations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fastchips operations can be managed by team members" ON "fastchips_operations" AS PERMISSIVE FOR ALL TO public USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

ALTER TABLE "fastchips_linked_accounts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fastchips linked accounts can be managed by team members" ON "fastchips_linked_accounts" AS PERMISSIVE FOR ALL TO public USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));
