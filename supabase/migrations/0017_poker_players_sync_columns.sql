-- Add sync columns to poker_players for cache-first member loading
ALTER TABLE poker_players
  ADD COLUMN IF NOT EXISTS ganhos numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maos integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stats_period_start text,
  ADD COLUMN IF NOT EXISTS stats_period_end text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS agente_uid integer,
  ADD COLUMN IF NOT EXISTS agente_nome text;

CREATE INDEX IF NOT EXISTS idx_poker_players_ganhos ON poker_players(team_id, ganhos);
CREATE INDEX IF NOT EXISTS idx_poker_players_taxa ON poker_players(team_id, taxa);
