-- Migration: Poker Club Management
-- Description: Add tables for poker club management (Mid.Poker)
-- Created: 2024-12-20

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE poker_player_status AS ENUM ('active', 'inactive', 'suspended', 'blacklisted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_player_type AS ENUM ('player', 'agent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_game_variant AS ENUM (
    'nlh', 'nlh_6plus', 'nlh_aof',
    'plo4', 'plo5', 'plo6',
    'plo4_hilo', 'plo5_hilo', 'plo6_hilo',
    'ofc', 'mixed', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_session_type AS ENUM ('cash_game', 'mtt', 'sit_n_go', 'spin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_transaction_type AS ENUM (
    'buy_in', 'cash_out', 'credit_given', 'credit_received', 'credit_paid',
    'rake', 'agent_commission', 'rakeback', 'jackpot', 'adjustment',
    'transfer_in', 'transfer_out'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_settlement_status AS ENUM ('pending', 'partial', 'completed', 'disputed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_import_status AS ENUM ('pending', 'validating', 'validated', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_alert_type AS ENUM (
    'liquidity_low', 'liquidity_critical', 'shark_detected',
    'churn_risk', 'high_debt', 'collusion_suspected', 'unusual_activity'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_alert_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Poker Players
CREATE TABLE IF NOT EXISTS public.poker_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- PPPoker Identity
  pppoker_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  memo_name TEXT,
  country TEXT,

  -- Classification
  type poker_player_type NOT NULL DEFAULT 'player',
  status poker_player_status NOT NULL DEFAULT 'active',
  agent_id UUID REFERENCES public.poker_players(id) ON DELETE SET NULL,
  super_agent_id UUID REFERENCES public.poker_players(id) ON DELETE SET NULL,

  -- Contact Information
  phone TEXT,
  whatsapp_number TEXT,
  email TEXT,

  -- Financial
  credit_limit NUMERIC(14,2) DEFAULT 0,
  current_balance NUMERIC(14,2) DEFAULT 0,
  chip_balance NUMERIC(14,2) DEFAULT 0,
  agent_credit_balance NUMERIC(14,2) DEFAULT 0,

  -- Risk Management
  risk_score SMALLINT DEFAULT 50,
  is_vip BOOLEAN DEFAULT false,
  is_shark BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ,

  -- Rakeback Configuration (for agents)
  rakeback_percent NUMERIC(5,2) DEFAULT 0,

  -- Integration Links
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,

  -- Notes and metadata
  note TEXT,
  metadata JSONB,

  -- Full-text search
  fts TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('portuguese',
      coalesce(nickname, '') || ' ' ||
      coalesce(memo_name, '') || ' ' ||
      coalesce(pppoker_id, '') || ' ' ||
      coalesce(email, '')
    )
  ) STORED,

  -- Constraints
  UNIQUE(pppoker_id, team_id)
);

-- Poker Sessions
CREATE TABLE IF NOT EXISTS public.poker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- PPPoker Identity
  external_id TEXT,
  table_name TEXT,

  -- Session Classification
  session_type poker_session_type NOT NULL DEFAULT 'cash_game',
  game_variant poker_game_variant NOT NULL DEFAULT 'nlh',

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,

  -- Game Configuration
  blinds TEXT,
  buy_in_amount NUMERIC(12,2),
  guaranteed_prize NUMERIC(12,2),

  -- Aggregated Stats
  total_rake NUMERIC(14,2) DEFAULT 0,
  total_buy_in NUMERIC(14,2) DEFAULT 0,
  total_cash_out NUMERIC(14,2) DEFAULT 0,
  player_count INTEGER DEFAULT 0,
  hands_played INTEGER DEFAULT 0,

  -- Creator
  created_by_id UUID REFERENCES public.poker_players(id) ON DELETE SET NULL,

  -- Raw data for auditing
  raw_data JSONB,

  -- Constraints
  UNIQUE(external_id, team_id)
);

-- Poker Session Players
CREATE TABLE IF NOT EXISTS public.poker_session_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Relations
  session_id UUID NOT NULL REFERENCES public.poker_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.poker_players(id) ON DELETE CASCADE,

  -- Results
  ranking INTEGER,
  buy_in_chips NUMERIC(14,2) DEFAULT 0,
  buy_in_ticket NUMERIC(14,2) DEFAULT 0,
  cash_out NUMERIC(14,2) DEFAULT 0,
  winnings NUMERIC(14,2) DEFAULT 0,
  rake NUMERIC(14,2) DEFAULT 0,

  -- Additional rake breakdown
  rake_ppst NUMERIC(14,2) DEFAULT 0,
  rake_ppsr NUMERIC(14,2) DEFAULT 0,

  -- Constraints
  UNIQUE(session_id, player_id)
);

-- Poker Chip Transactions
CREATE TABLE IF NOT EXISTS public.poker_chip_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- When did this transaction occur
  occurred_at TIMESTAMPTZ NOT NULL,

  -- Transaction Type
  type poker_transaction_type NOT NULL,

  -- Sender (can be club or player)
  sender_club_id TEXT,
  sender_player_id UUID REFERENCES public.poker_players(id) ON DELETE SET NULL,

  -- Recipient
  recipient_player_id UUID REFERENCES public.poker_players(id) ON DELETE SET NULL,

  -- Amounts - Credit
  credit_sent NUMERIC(14,2) DEFAULT 0,
  credit_redeemed NUMERIC(14,2) DEFAULT 0,
  credit_left_club NUMERIC(14,2) DEFAULT 0,

  -- Amounts - Chips
  chips_sent NUMERIC(14,2) DEFAULT 0,
  chips_ppsr NUMERIC(14,2) DEFAULT 0,
  chips_ring NUMERIC(14,2) DEFAULT 0,
  chips_custom_ring NUMERIC(14,2) DEFAULT 0,
  chips_mtt NUMERIC(14,2) DEFAULT 0,
  chips_redeemed NUMERIC(14,2) DEFAULT 0,

  -- Calculated total amount
  amount NUMERIC(14,2) DEFAULT 0,

  -- Optional reference to session
  session_id UUID REFERENCES public.poker_sessions(id) ON DELETE SET NULL,

  -- Notes
  note TEXT,
  raw_data JSONB
);

-- Poker Player Summary
CREATE TABLE IF NOT EXISTS public.poker_player_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Player Reference
  player_id UUID NOT NULL REFERENCES public.poker_players(id) ON DELETE CASCADE,

  -- Player Winnings by Game Type
  winnings_total NUMERIC(14,2) DEFAULT 0,
  winnings_general NUMERIC(14,2) DEFAULT 0,
  winnings_ring NUMERIC(14,2) DEFAULT 0,
  winnings_mtt_sitgo NUMERIC(14,2) DEFAULT 0,
  winnings_spinup NUMERIC(14,2) DEFAULT 0,
  winnings_caribbean NUMERIC(14,2) DEFAULT 0,
  winnings_color_game NUMERIC(14,2) DEFAULT 0,
  winnings_crash NUMERIC(14,2) DEFAULT 0,
  winnings_lucky_draw NUMERIC(14,2) DEFAULT 0,
  winnings_jackpot NUMERIC(14,2) DEFAULT 0,
  winnings_ev_split NUMERIC(14,2) DEFAULT 0,

  -- Club Earnings (Rake) by Game Type
  club_earnings_general NUMERIC(14,2) DEFAULT 0,
  rake_total NUMERIC(14,2) DEFAULT 0,
  rake_ppst NUMERIC(14,2) DEFAULT 0,
  rake_non_ppst NUMERIC(14,2) DEFAULT 0,
  rake_ppsr NUMERIC(14,2) DEFAULT 0,
  club_earnings_spinup NUMERIC(14,2) DEFAULT 0,
  club_earnings_caribbean NUMERIC(14,2) DEFAULT 0,
  club_earnings_color_game NUMERIC(14,2) DEFAULT 0,
  club_earnings_crash NUMERIC(14,2) DEFAULT 0,
  club_earnings_lucky_draw NUMERIC(14,2) DEFAULT 0,
  club_earnings_jackpot NUMERIC(14,2) DEFAULT 0,
  club_earnings_other NUMERIC(14,2) DEFAULT 0,

  -- Import reference
  import_id UUID,

  -- Constraints
  UNIQUE(player_id, period_start, period_end)
);

-- Poker Settlements
CREATE TABLE IF NOT EXISTS public.poker_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Status
  status poker_settlement_status NOT NULL DEFAULT 'pending',

  -- Who is this settlement for
  player_id UUID REFERENCES public.poker_players(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.poker_players(id) ON DELETE SET NULL,

  -- Amounts
  gross_amount NUMERIC(14,2) NOT NULL,
  rakeback_amount NUMERIC(14,2) DEFAULT 0,
  commission_amount NUMERIC(14,2) DEFAULT 0,
  adjustment_amount NUMERIC(14,2) DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL,

  -- Payment tracking
  paid_amount NUMERIC(14,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,

  -- Integration with existing system
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,

  -- Audit
  created_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note TEXT
);

-- Poker Imports
CREATE TABLE IF NOT EXISTS public.poker_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- File info
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,

  -- Status
  status poker_import_status NOT NULL DEFAULT 'pending',

  -- Period covered by import
  period_start DATE,
  period_end DATE,

  -- Statistics
  total_players INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  new_players INTEGER DEFAULT 0,
  updated_players INTEGER DEFAULT 0,

  -- Validation results
  validation_passed BOOLEAN DEFAULT false,
  validation_errors JSONB,
  validation_warnings JSONB,

  -- Processing
  processed_at TIMESTAMPTZ,
  processed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  processing_errors JSONB,

  -- Raw data snapshot
  raw_data JSONB
);

-- Poker Alerts
CREATE TABLE IF NOT EXISTS public.poker_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Alert Classification
  type poker_alert_type NOT NULL,
  severity poker_alert_severity NOT NULL DEFAULT 'info',

  -- Alert Content
  title TEXT NOT NULL,
  message TEXT,

  -- Related entities
  player_id UUID REFERENCES public.poker_players(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.poker_sessions(id) ON DELETE CASCADE,

  -- Alert state
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  dismissed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Additional data
  metadata JSONB
);

-- Add foreign key for poker_player_summary.import_id after poker_imports is created
ALTER TABLE public.poker_player_summary
  ADD CONSTRAINT poker_player_summary_import_id_fkey
  FOREIGN KEY (import_id) REFERENCES public.poker_imports(id) ON DELETE SET NULL;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Poker Players Indexes
CREATE INDEX IF NOT EXISTS poker_players_team_id_idx ON public.poker_players(team_id);
CREATE INDEX IF NOT EXISTS poker_players_agent_id_idx ON public.poker_players(agent_id);
CREATE INDEX IF NOT EXISTS poker_players_super_agent_id_idx ON public.poker_players(super_agent_id);
CREATE INDEX IF NOT EXISTS poker_players_status_idx ON public.poker_players(status);
CREATE INDEX IF NOT EXISTS poker_players_type_idx ON public.poker_players(type);
CREATE INDEX IF NOT EXISTS poker_players_last_active_at_idx ON public.poker_players(last_active_at);
CREATE INDEX IF NOT EXISTS poker_players_fts_idx ON public.poker_players USING gin(fts);

-- Poker Sessions Indexes
CREATE INDEX IF NOT EXISTS poker_sessions_team_id_idx ON public.poker_sessions(team_id);
CREATE INDEX IF NOT EXISTS poker_sessions_started_at_idx ON public.poker_sessions(started_at);
CREATE INDEX IF NOT EXISTS poker_sessions_session_type_idx ON public.poker_sessions(session_type);
CREATE INDEX IF NOT EXISTS poker_sessions_game_variant_idx ON public.poker_sessions(game_variant);
CREATE INDEX IF NOT EXISTS poker_sessions_team_started_at_idx ON public.poker_sessions(team_id, started_at);

-- Poker Session Players Indexes
CREATE INDEX IF NOT EXISTS poker_session_players_team_id_idx ON public.poker_session_players(team_id);
CREATE INDEX IF NOT EXISTS poker_session_players_session_id_idx ON public.poker_session_players(session_id);
CREATE INDEX IF NOT EXISTS poker_session_players_player_id_idx ON public.poker_session_players(player_id);

-- Poker Chip Transactions Indexes
CREATE INDEX IF NOT EXISTS poker_chip_transactions_team_id_idx ON public.poker_chip_transactions(team_id);
CREATE INDEX IF NOT EXISTS poker_chip_transactions_occurred_at_idx ON public.poker_chip_transactions(occurred_at);
CREATE INDEX IF NOT EXISTS poker_chip_transactions_type_idx ON public.poker_chip_transactions(type);
CREATE INDEX IF NOT EXISTS poker_chip_transactions_sender_player_id_idx ON public.poker_chip_transactions(sender_player_id);
CREATE INDEX IF NOT EXISTS poker_chip_transactions_recipient_player_id_idx ON public.poker_chip_transactions(recipient_player_id);
CREATE INDEX IF NOT EXISTS poker_chip_transactions_team_occurred_at_idx ON public.poker_chip_transactions(team_id, occurred_at);

-- Poker Player Summary Indexes
CREATE INDEX IF NOT EXISTS poker_player_summary_team_id_idx ON public.poker_player_summary(team_id);
CREATE INDEX IF NOT EXISTS poker_player_summary_player_id_idx ON public.poker_player_summary(player_id);
CREATE INDEX IF NOT EXISTS poker_player_summary_period_idx ON public.poker_player_summary(period_start, period_end);

-- Poker Settlements Indexes
CREATE INDEX IF NOT EXISTS poker_settlements_team_id_idx ON public.poker_settlements(team_id);
CREATE INDEX IF NOT EXISTS poker_settlements_player_id_idx ON public.poker_settlements(player_id);
CREATE INDEX IF NOT EXISTS poker_settlements_agent_id_idx ON public.poker_settlements(agent_id);
CREATE INDEX IF NOT EXISTS poker_settlements_status_idx ON public.poker_settlements(status);
CREATE INDEX IF NOT EXISTS poker_settlements_period_idx ON public.poker_settlements(period_start, period_end);

-- Poker Imports Indexes
CREATE INDEX IF NOT EXISTS poker_imports_team_id_idx ON public.poker_imports(team_id);
CREATE INDEX IF NOT EXISTS poker_imports_status_idx ON public.poker_imports(status);
CREATE INDEX IF NOT EXISTS poker_imports_created_at_idx ON public.poker_imports(created_at);

-- Poker Alerts Indexes
CREATE INDEX IF NOT EXISTS poker_alerts_team_id_idx ON public.poker_alerts(team_id);
CREATE INDEX IF NOT EXISTS poker_alerts_type_idx ON public.poker_alerts(type);
CREATE INDEX IF NOT EXISTS poker_alerts_severity_idx ON public.poker_alerts(severity);
CREATE INDEX IF NOT EXISTS poker_alerts_created_at_idx ON public.poker_alerts(created_at);
CREATE INDEX IF NOT EXISTS poker_alerts_is_read_idx ON public.poker_alerts(is_read);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.poker_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_chip_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_player_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_alerts ENABLE ROW LEVEL SECURITY;

-- Poker Players RLS
DROP POLICY IF EXISTS "Poker players can be managed by team members" ON public.poker_players;
CREATE POLICY "Poker players can be managed by team members"
  ON public.poker_players
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- Poker Sessions RLS
DROP POLICY IF EXISTS "Poker sessions can be managed by team members" ON public.poker_sessions;
CREATE POLICY "Poker sessions can be managed by team members"
  ON public.poker_sessions
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- Poker Session Players RLS
DROP POLICY IF EXISTS "Poker session players can be managed by team members" ON public.poker_session_players;
CREATE POLICY "Poker session players can be managed by team members"
  ON public.poker_session_players
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- Poker Chip Transactions RLS
DROP POLICY IF EXISTS "Poker chip transactions can be managed by team members" ON public.poker_chip_transactions;
CREATE POLICY "Poker chip transactions can be managed by team members"
  ON public.poker_chip_transactions
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- Poker Player Summary RLS
DROP POLICY IF EXISTS "Poker player summary can be viewed by team members" ON public.poker_player_summary;
CREATE POLICY "Poker player summary can be viewed by team members"
  ON public.poker_player_summary
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- Poker Settlements RLS
DROP POLICY IF EXISTS "Poker settlements can be managed by team members" ON public.poker_settlements;
CREATE POLICY "Poker settlements can be managed by team members"
  ON public.poker_settlements
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- Poker Imports RLS
DROP POLICY IF EXISTS "Poker imports can be managed by team members" ON public.poker_imports;
CREATE POLICY "Poker imports can be managed by team members"
  ON public.poker_imports
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- Poker Alerts RLS
DROP POLICY IF EXISTS "Poker alerts can be managed by team members" ON public.poker_alerts;
CREATE POLICY "Poker alerts can be managed by team members"
  ON public.poker_alerts
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update updated_at on poker_players
CREATE OR REPLACE FUNCTION public.update_poker_players_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_poker_players_updated_at ON public.poker_players;
CREATE TRIGGER update_poker_players_updated_at
  BEFORE UPDATE ON public.poker_players
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();

-- Update updated_at on poker_settlements
DROP TRIGGER IF EXISTS update_poker_settlements_updated_at ON public.poker_settlements;
CREATE TRIGGER update_poker_settlements_updated_at
  BEFORE UPDATE ON public.poker_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();

-- Update updated_at on poker_imports
DROP TRIGGER IF EXISTS update_poker_imports_updated_at ON public.poker_imports;
CREATE TRIGGER update_poker_imports_updated_at
  BEFORE UPDATE ON public.poker_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();
