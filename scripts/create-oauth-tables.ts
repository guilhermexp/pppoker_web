import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

const sql = `
-- OAuth Applications Table
CREATE TABLE IF NOT EXISTS public.oauth_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  overview TEXT,
  developer_name TEXT,
  logo_url TEXT,
  website TEXT,
  install_url TEXT,
  screenshots TEXT[] DEFAULT '{}',
  redirect_uris TEXT[] NOT NULL,
  client_id TEXT NOT NULL UNIQUE,
  client_secret TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_public BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected'))
);

-- OAuth Applications Indexes
CREATE INDEX IF NOT EXISTS oauth_applications_team_id_idx ON public.oauth_applications(team_id);
CREATE INDEX IF NOT EXISTS oauth_applications_client_id_idx ON public.oauth_applications(client_id);
CREATE INDEX IF NOT EXISTS oauth_applications_slug_idx ON public.oauth_applications(slug);

-- OAuth Authorization Codes Table
CREATE TABLE IF NOT EXISTS public.oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  application_id UUID NOT NULL REFERENCES public.oauth_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used BOOLEAN DEFAULT false,
  code_challenge TEXT,
  code_challenge_method TEXT
);

-- OAuth Authorization Codes Indexes
CREATE INDEX IF NOT EXISTS oauth_authorization_codes_code_idx ON public.oauth_authorization_codes(code);
CREATE INDEX IF NOT EXISTS oauth_authorization_codes_application_id_idx ON public.oauth_authorization_codes(application_id);
CREATE INDEX IF NOT EXISTS oauth_authorization_codes_user_id_idx ON public.oauth_authorization_codes(user_id);

-- OAuth Access Tokens Table
CREATE TABLE IF NOT EXISTS public.oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  refresh_token TEXT UNIQUE,
  application_id UUID NOT NULL REFERENCES public.oauth_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ
);

-- OAuth Access Tokens Indexes
CREATE INDEX IF NOT EXISTS oauth_access_tokens_token_idx ON public.oauth_access_tokens(token);
CREATE INDEX IF NOT EXISTS oauth_access_tokens_refresh_token_idx ON public.oauth_access_tokens(refresh_token);
CREATE INDEX IF NOT EXISTS oauth_access_tokens_application_id_idx ON public.oauth_access_tokens(application_id);
CREATE INDEX IF NOT EXISTS oauth_access_tokens_user_id_idx ON public.oauth_access_tokens(user_id);

-- Enable RLS
ALTER TABLE public.oauth_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_access_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for OAuth Applications
DROP POLICY IF EXISTS "OAuth applications can be managed by team members" ON public.oauth_applications;
CREATE POLICY "OAuth applications can be managed by team members"
  ON public.oauth_applications
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- RLS Policies for OAuth Authorization Codes
DROP POLICY IF EXISTS "OAuth auth codes can be managed by users" ON public.oauth_authorization_codes;
CREATE POLICY "OAuth auth codes can be managed by users"
  ON public.oauth_authorization_codes
  FOR ALL
  TO public
  USING (user_id = auth.uid());

-- RLS Policies for OAuth Access Tokens
DROP POLICY IF EXISTS "OAuth tokens can be managed by users" ON public.oauth_access_tokens;
CREATE POLICY "OAuth tokens can be managed by users"
  ON public.oauth_access_tokens
  FOR ALL
  TO public
  USING (user_id = auth.uid());
`;

async function main() {
  try {
    await client.connect();
    console.log("Connected to database");

    console.log("Creating OAuth tables...");
    await client.query(sql);
    console.log("OAuth tables created successfully!");

    await client.end();
  } catch (error) {
    console.error("Error creating OAuth tables:", error);
    await client.end();
    process.exit(1);
  }
}

main();
