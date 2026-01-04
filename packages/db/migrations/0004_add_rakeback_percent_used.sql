-- Migration: Add rakeback_percent_used to poker_settlements
-- Description: Track the rakeback percentage that was actually used in each settlement
-- This allows historical tracking when a different % was applied temporarily

-- Add rakeback_percent_used column
ALTER TABLE public.poker_settlements
  ADD COLUMN IF NOT EXISTS rakeback_percent_used NUMERIC(5,2) DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.poker_settlements.rakeback_percent_used IS
  'Percentual de rakeback aplicado neste settlement (para rastreamento histórico). NULL para settlements antigos.';

-- Index for filtering settlements by rakeback percent
CREATE INDEX IF NOT EXISTS poker_settlements_rakeback_percent_used_idx
  ON public.poker_settlements(rakeback_percent_used)
  WHERE rakeback_percent_used IS NOT NULL;
