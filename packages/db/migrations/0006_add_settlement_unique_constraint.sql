-- Migration: Add unique constraint to poker_su_settlements
-- Description: Add unique constraint for team_id, week_period_id, liga_id to enable upsert
-- Created: 2024-12-29

-- Add unique constraint for settlements upsert
ALTER TABLE public.poker_su_settlements
ADD CONSTRAINT poker_su_settlements_team_period_liga_unique
UNIQUE (team_id, week_period_id, liga_id);
