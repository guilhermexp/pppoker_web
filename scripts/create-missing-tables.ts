import pg from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load env from apps/api/.env manually
const envPath = resolve(process.cwd(), "apps/api/.env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex);
        let value = trimmed.slice(eqIndex + 1);
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
} catch (e) {
  console.log("Could not load .env file:", e);
}

const connectionString = process.env.DATABASE_PRIMARY_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_PRIMARY_URL or DATABASE_URL environment variable is required");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

const sql = `
-- API Keys Table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_encrypted TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ
);

-- API Keys Indexes
CREATE INDEX IF NOT EXISTS api_keys_key_idx ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_team_id_idx ON public.api_keys(team_id);

-- Enable RLS for API Keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy for API Keys (team members can manage)
DROP POLICY IF EXISTS "API keys can be managed by team members" ON public.api_keys;
CREATE POLICY "API keys can be managed by team members"
  ON public.api_keys
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, team_id, notification_type, channel)
);

-- Notification Settings Indexes
CREATE INDEX IF NOT EXISTS notification_settings_user_team_idx ON public.notification_settings(user_id, team_id);
CREATE INDEX IF NOT EXISTS notification_settings_type_channel_idx ON public.notification_settings(notification_type, channel);

-- Enable RLS for Notification Settings
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for Notification Settings (users can manage their own)
DROP POLICY IF EXISTS "Users can manage their own notification settings" ON public.notification_settings;
CREATE POLICY "Users can manage their own notification settings"
  ON public.notification_settings
  FOR ALL
  TO public
  USING (user_id = auth.uid());
`;

async function main() {
  try {
    await client.connect();
    console.log("Connected to database");

    console.log("Creating missing tables...");
    await client.query(sql);
    console.log("Tables created successfully!");

    await client.end();
  } catch (error) {
    console.error("Error creating tables:", error);
    await client.end();
    process.exit(1);
  }
}

main();
