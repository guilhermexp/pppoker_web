-- Migration: Add meta players to overlay selections
-- Description: Store per-tournament meta (players) used for forecast calculations
-- Created: 2026-02-04

ALTER TABLE public.poker_su_overlay_selections
  ADD COLUMN IF NOT EXISTS meta_players INTEGER NOT NULL DEFAULT 0;
