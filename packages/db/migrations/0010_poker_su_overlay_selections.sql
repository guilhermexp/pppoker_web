-- Migration: Poker SU Overlay Selections
-- Description: Track which overlay tournaments are selected for club distribution
-- Created: 2025-02-03

-- =============================================================================
-- TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.poker_su_overlay_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  week_year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  is_selected BOOLEAN NOT NULL DEFAULT true,
  created_by_id UUID REFERENCES auth.users(id),

  UNIQUE(team_id, week_year, week_number, game_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_poker_su_overlay_selections_team_id
  ON public.poker_su_overlay_selections(team_id);

CREATE INDEX IF NOT EXISTS idx_poker_su_overlay_selections_week
  ON public.poker_su_overlay_selections(team_id, week_year, week_number);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.poker_su_overlay_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SU overlay selections can be managed by team members"
  ON public.poker_su_overlay_selections;

CREATE POLICY "SU overlay selections can be managed by team members"
  ON public.poker_su_overlay_selections
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS update_poker_su_overlay_selections_updated_at
  ON public.poker_su_overlay_selections;

CREATE TRIGGER update_poker_su_overlay_selections_updated_at
  BEFORE UPDATE ON public.poker_su_overlay_selections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();
