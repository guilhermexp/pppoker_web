-- Migration: Poker SU Club Deals
-- Description: Persistent volume agreements per club (deals).
--   Identical to poker_su_club_metas but without week_year/week_number.
--   A deal represents the default/permanent agreement; a weekly meta overrides it.
-- Created: 2025-02-04

-- =============================================================================
-- TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.poker_su_club_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  super_union_id INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour_start INTEGER CHECK (hour_start >= 0 AND hour_start <= 23),
  hour_end INTEGER CHECK (hour_end >= 0 AND hour_end <= 23),
  target_type TEXT NOT NULL CHECK (target_type IN ('players', 'buyins')),
  target_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  reference_buyin NUMERIC(14,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_by_id UUID REFERENCES auth.users(id),

  UNIQUE(team_id, super_union_id, club_id, day_of_week, hour_start, hour_end, target_type)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_poker_su_club_deals_team
  ON public.poker_su_club_deals(team_id);

CREATE INDEX IF NOT EXISTS idx_poker_su_club_deals_club
  ON public.poker_su_club_deals(team_id, super_union_id, club_id);

CREATE INDEX IF NOT EXISTS idx_poker_su_club_deals_active
  ON public.poker_su_club_deals(team_id, is_active);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.poker_su_club_deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SU club deals can be managed by team members" ON public.poker_su_club_deals;
CREATE POLICY "SU club deals can be managed by team members"
  ON public.poker_su_club_deals
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS update_poker_su_club_deals_updated_at ON public.poker_su_club_deals;
CREATE TRIGGER update_poker_su_club_deals_updated_at
  BEFORE UPDATE ON public.poker_su_club_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();
