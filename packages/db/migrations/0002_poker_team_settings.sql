-- Migration: Poker Team Settings
-- Description: Add poker organization configuration to teams table and create poker_team_clubs table

-- =============================================================================
-- CREATE ENUMS
-- =============================================================================

CREATE TYPE poker_platform AS ENUM (
  'pppoker',
  'suprema',
  'pokerbros',
  'fishpoker',
  'xpoker',
  'other'
);

CREATE TYPE poker_entity_type AS ENUM (
  'clube_privado',
  'clube_liga',
  'liga',
  'ambos'
);

-- =============================================================================
-- ALTER TEAMS TABLE - Add poker organization fields
-- =============================================================================

ALTER TABLE teams ADD COLUMN IF NOT EXISTS poker_platform poker_platform;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS poker_entity_type poker_entity_type;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS poker_club_id TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS poker_club_name TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS poker_liga_id TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS poker_liga_name TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS poker_su_id TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS poker_su_name TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS poker_parent_liga_team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Index for finding clubs under a liga
CREATE INDEX IF NOT EXISTS teams_poker_parent_liga_team_id_idx ON teams(poker_parent_liga_team_id);

-- =============================================================================
-- CREATE POKER_TEAM_CLUBS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS poker_team_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Liga that owns this club entry
  liga_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Club identification (from platform)
  club_id TEXT NOT NULL,
  club_name TEXT,

  -- Optional link to team in system (if club also has an account)
  linked_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Unique constraint: one club ID per liga
  UNIQUE(liga_team_id, club_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS poker_team_clubs_liga_team_id_idx ON poker_team_clubs(liga_team_id);
CREATE INDEX IF NOT EXISTS poker_team_clubs_club_id_idx ON poker_team_clubs(club_id);
CREATE INDEX IF NOT EXISTS poker_team_clubs_linked_team_id_idx ON poker_team_clubs(linked_team_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE poker_team_clubs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage clubs for teams they belong to
CREATE POLICY "Poker team clubs can be managed by liga team members" ON poker_team_clubs
  FOR ALL
  USING (liga_team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE poker_team_clubs IS 'Tracks clubs affiliated with a Liga in the poker ecosystem';
COMMENT ON COLUMN poker_team_clubs.liga_team_id IS 'The Liga team that manages this club';
COMMENT ON COLUMN poker_team_clubs.club_id IS 'Club ID from the poker platform (e.g., PPPoker club ID)';
COMMENT ON COLUMN poker_team_clubs.club_name IS 'Human-readable club name';
COMMENT ON COLUMN poker_team_clubs.linked_team_id IS 'If the club also has an account in the system, link to their team';

COMMENT ON COLUMN teams.poker_platform IS 'Poker platform being used (pppoker, suprema, etc.)';
COMMENT ON COLUMN teams.poker_entity_type IS 'Type of poker entity (clube_privado, clube_liga, liga, ambos)';
COMMENT ON COLUMN teams.poker_club_id IS 'Club ID on the poker platform';
COMMENT ON COLUMN teams.poker_club_name IS 'Club name';
COMMENT ON COLUMN teams.poker_liga_id IS 'Liga ID on the poker platform (if this team is a Liga)';
COMMENT ON COLUMN teams.poker_liga_name IS 'Liga name';
COMMENT ON COLUMN teams.poker_su_id IS 'Super Liga ID (if affiliated)';
COMMENT ON COLUMN teams.poker_su_name IS 'Super Liga name';
COMMENT ON COLUMN teams.poker_parent_liga_team_id IS 'If this is a club in a liga, reference to the Liga team in the system';
