-- PPPoker Club Connections: stores credentials for live API sync
CREATE TABLE IF NOT EXISTS pppoker_club_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  club_id integer NOT NULL,
  club_name text,
  pppoker_username text NOT NULL,
  pppoker_password text NOT NULL,
  last_synced_at timestamptz,
  sync_status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, club_id)
);

-- Enable RLS
ALTER TABLE pppoker_club_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own team connections"
  ON pppoker_club_connections FOR SELECT
  USING (team_id IN (SELECT team_id FROM users_on_team WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own team connections"
  ON pppoker_club_connections FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM users_on_team WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own team connections"
  ON pppoker_club_connections FOR UPDATE
  USING (team_id IN (SELECT team_id FROM users_on_team WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own team connections"
  ON pppoker_club_connections FOR DELETE
  USING (team_id IN (SELECT team_id FROM users_on_team WHERE user_id = auth.uid()));

-- Add real-time columns to poker_players
ALTER TABLE poker_players
  ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cashbox_balance numeric(19,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pppoker_role integer,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Index for sync queries
CREATE INDEX IF NOT EXISTS idx_pppoker_club_connections_team_status
  ON pppoker_club_connections(team_id, sync_status);

CREATE INDEX IF NOT EXISTS idx_poker_players_pppoker_id_team
  ON poker_players(team_id, pppoker_id);
