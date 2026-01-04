-- Migration: Poker Week Periods
-- Description: Add table for week period management (open/closed weeks)

-- Create status enum for week periods
DO $$ BEGIN
  CREATE TYPE poker_week_period_status AS ENUM ('open', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create poker_week_periods table
CREATE TABLE IF NOT EXISTS public.poker_week_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Period boundaries (Monday 00:00 to Sunday 23:59)
  week_start DATE NOT NULL,  -- Always a Monday
  week_end DATE NOT NULL,    -- Always a Sunday

  -- Status
  status poker_week_period_status NOT NULL DEFAULT 'open',

  -- Closing metadata
  closed_at TIMESTAMPTZ,
  closed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Statistics snapshot (calculated at close time for historical reference)
  total_sessions INTEGER DEFAULT 0,
  total_players INTEGER DEFAULT 0,
  total_rake NUMERIC(14,2) DEFAULT 0,
  total_settlements INTEGER DEFAULT 0,
  settlements_gross_amount NUMERIC(14,2) DEFAULT 0,
  settlements_net_amount NUMERIC(14,2) DEFAULT 0,

  -- Notes
  note TEXT,

  -- Constraints
  UNIQUE(team_id, week_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS poker_week_periods_team_id_idx
  ON public.poker_week_periods(team_id);
CREATE INDEX IF NOT EXISTS poker_week_periods_status_idx
  ON public.poker_week_periods(status);
CREATE INDEX IF NOT EXISTS poker_week_periods_week_start_idx
  ON public.poker_week_periods(week_start DESC);
CREATE INDEX IF NOT EXISTS poker_week_periods_team_status_idx
  ON public.poker_week_periods(team_id, status);

-- Enable RLS
ALTER TABLE public.poker_week_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policy
DROP POLICY IF EXISTS "Poker week periods can be managed by team members"
  ON public.poker_week_periods;
CREATE POLICY "Poker week periods can be managed by team members"
  ON public.poker_week_periods
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_poker_week_periods_updated_at ON public.poker_week_periods;
CREATE TRIGGER update_poker_week_periods_updated_at
  BEFORE UPDATE ON public.poker_week_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();

-- Add week_period_id to poker_settlements for linking settlements to their source week
ALTER TABLE public.poker_settlements
  ADD COLUMN IF NOT EXISTS week_period_id UUID
  REFERENCES public.poker_week_periods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS poker_settlements_week_period_id_idx
  ON public.poker_settlements(week_period_id);
