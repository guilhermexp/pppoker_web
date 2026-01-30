-- Migration: Poker SU Meta Groups & Club Metas
-- Description: Add tables for dynamic meta distribution (replaces hardcoded BR=60%/SA=40%)
-- Created: 2025-01-30

-- =============================================================================
-- TABLES
-- =============================================================================

-- Meta Groups: Named groups with percentage of total GTD
-- Replaces hardcoded BR=60%/SA=40%
CREATE TABLE IF NOT EXISTS public.poker_su_meta_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  meta_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_id UUID REFERENCES auth.users(id),

  UNIQUE(team_id, name)
);

-- Meta Group Members: Which SuperUnions/Leagues belong to each group
CREATE TABLE IF NOT EXISTS public.poker_su_meta_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  meta_group_id UUID NOT NULL REFERENCES public.poker_su_meta_groups(id) ON DELETE CASCADE,
  super_union_id INTEGER NOT NULL,
  su_league_id UUID REFERENCES public.poker_su_leagues(id),
  display_name TEXT,

  UNIQUE(team_id, super_union_id)
);

-- Meta Group Time Slots: Percentage overrides by time range within a group
CREATE TABLE IF NOT EXISTS public.poker_su_meta_group_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  meta_group_id UUID NOT NULL REFERENCES public.poker_su_meta_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hour_start INTEGER NOT NULL CHECK (hour_start >= 0 AND hour_start <= 23),
  hour_end INTEGER NOT NULL CHECK (hour_end >= 0 AND hour_end <= 23),
  meta_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Club Metas: Granular targets per club/week/day/hour
CREATE TABLE IF NOT EXISTS public.poker_su_club_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  super_union_id INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  week_year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hour_start INTEGER CHECK (hour_start >= 0 AND hour_start <= 23),
  hour_end INTEGER CHECK (hour_end >= 0 AND hour_end <= 23),
  target_type TEXT NOT NULL CHECK (target_type IN ('players', 'buyins')),
  target_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  reference_buyin NUMERIC(14,2),
  note TEXT,
  created_by_id UUID REFERENCES auth.users(id),

  UNIQUE(team_id, super_union_id, club_id, week_year, week_number, day_of_week, hour_start, hour_end, target_type)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Meta Groups
CREATE INDEX IF NOT EXISTS idx_poker_su_meta_groups_team_id ON public.poker_su_meta_groups(team_id);
CREATE INDEX IF NOT EXISTS idx_poker_su_meta_groups_active ON public.poker_su_meta_groups(team_id, is_active);

-- Meta Group Members
CREATE INDEX IF NOT EXISTS idx_poker_su_meta_group_members_team_id ON public.poker_su_meta_group_members(team_id);
CREATE INDEX IF NOT EXISTS idx_poker_su_meta_group_members_group ON public.poker_su_meta_group_members(meta_group_id);
CREATE INDEX IF NOT EXISTS idx_poker_su_meta_group_members_su ON public.poker_su_meta_group_members(team_id, super_union_id);

-- Time Slots
CREATE INDEX IF NOT EXISTS idx_poker_su_meta_group_time_slots_team_id ON public.poker_su_meta_group_time_slots(team_id);
CREATE INDEX IF NOT EXISTS idx_poker_su_meta_group_time_slots_group ON public.poker_su_meta_group_time_slots(meta_group_id);

-- Club Metas
CREATE INDEX IF NOT EXISTS idx_poker_su_club_metas_team_id ON public.poker_su_club_metas(team_id);
CREATE INDEX IF NOT EXISTS idx_poker_su_club_metas_week ON public.poker_su_club_metas(team_id, week_year, week_number);
CREATE INDEX IF NOT EXISTS idx_poker_su_club_metas_club ON public.poker_su_club_metas(team_id, super_union_id, club_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.poker_su_meta_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_su_meta_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_su_meta_group_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_su_club_metas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SU meta groups can be managed by team members" ON public.poker_su_meta_groups;
CREATE POLICY "SU meta groups can be managed by team members"
  ON public.poker_su_meta_groups
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

DROP POLICY IF EXISTS "SU meta group members can be managed by team members" ON public.poker_su_meta_group_members;
CREATE POLICY "SU meta group members can be managed by team members"
  ON public.poker_su_meta_group_members
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

DROP POLICY IF EXISTS "SU meta group time slots can be managed by team members" ON public.poker_su_meta_group_time_slots;
CREATE POLICY "SU meta group time slots can be managed by team members"
  ON public.poker_su_meta_group_time_slots
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

DROP POLICY IF EXISTS "SU club metas can be managed by team members" ON public.poker_su_club_metas;
CREATE POLICY "SU club metas can be managed by team members"
  ON public.poker_su_club_metas
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS update_poker_su_meta_groups_updated_at ON public.poker_su_meta_groups;
CREATE TRIGGER update_poker_su_meta_groups_updated_at
  BEFORE UPDATE ON public.poker_su_meta_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();

DROP TRIGGER IF EXISTS update_poker_su_meta_group_time_slots_updated_at ON public.poker_su_meta_group_time_slots;
CREATE TRIGGER update_poker_su_meta_group_time_slots_updated_at
  BEFORE UPDATE ON public.poker_su_meta_group_time_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();

DROP TRIGGER IF EXISTS update_poker_su_club_metas_updated_at ON public.poker_su_club_metas;
CREATE TRIGGER update_poker_su_club_metas_updated_at
  BEFORE UPDATE ON public.poker_su_club_metas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();
