-- Migration: Add committed field to SU imports
-- Description: Add committed tracking to poker_su_imports to match poker_imports behavior
-- Created: 2026-01-19

-- Add committed field to poker_su_imports
ALTER TABLE public.poker_su_imports
ADD COLUMN IF NOT EXISTS committed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS committed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS committed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Create index for faster filtering by committed status
CREATE INDEX IF NOT EXISTS idx_poker_su_imports_committed
ON public.poker_su_imports(team_id, committed, period_start, period_end);

-- Create index for committed imports in date range (for historical queries)
CREATE INDEX IF NOT EXISTS idx_poker_su_imports_committed_dates
ON public.poker_su_imports(team_id, committed, period_start, period_end)
WHERE committed = true;

-- Add comment explaining the committed field
COMMENT ON COLUMN public.poker_su_imports.committed IS
'Marks if import data is finalized and visible in historical reports.
Set to false when import is processed, then true when week is closed.
Controls data visibility: false = current week only, true = historical reports.';

COMMENT ON COLUMN public.poker_su_imports.committed_at IS
'Timestamp when the import was committed (week closed).';

COMMENT ON COLUMN public.poker_su_imports.committed_by_id IS
'User who closed the week and committed the import.';
