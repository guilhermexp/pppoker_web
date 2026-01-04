-- Migration: Poker Super Union Management
-- Description: Add tables for Super Union (SU) management - hierarchy SU -> Liga
-- Created: 2024-12-29

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE poker_su_week_period_status AS ENUM ('open', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_su_import_status AS ENUM ('pending', 'validating', 'validated', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_su_settlement_status AS ENUM ('pending', 'partial', 'completed', 'disputed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_su_game_type AS ENUM ('ppst', 'ppsr');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE poker_su_game_variant AS ENUM (
    'nlh', 'plo4', 'plo5', 'plo6', 'ofc', 'short', '6plus',
    'spinup', 'pko', 'mko', 'satellite', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- SU Leagues - Registro de ligas vinculadas a uma SuperUnion
CREATE TABLE IF NOT EXISTS public.poker_su_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- PPPoker Identity
  liga_id INTEGER NOT NULL,           -- ID numérico da liga no PPPoker
  liga_nome TEXT NOT NULL,            -- Nome da liga
  super_union_id INTEGER,             -- ID da SuperUnion (se aplicável)

  -- Configuration
  taxa_cambio TEXT,                   -- Taxa de câmbio de fichas (e.g., "1:5")
  is_active BOOLEAN DEFAULT true,

  -- Notes
  note TEXT,
  metadata JSONB,

  -- Constraints
  UNIQUE(team_id, liga_id)
);

-- SU Week Periods - Períodos semanais da SuperUnion
CREATE TABLE IF NOT EXISTS public.poker_su_week_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Period boundaries
  week_start DATE NOT NULL,           -- Data início do período
  week_end DATE NOT NULL,             -- Data fim do período
  timezone TEXT DEFAULT 'UTC -0500',  -- Timezone do período

  -- Status
  status poker_su_week_period_status NOT NULL DEFAULT 'open',

  -- Closing metadata
  closed_at TIMESTAMPTZ,
  closed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Statistics snapshot (calculated at close time)
  total_leagues INTEGER DEFAULT 0,
  total_games_ppst INTEGER DEFAULT 0,
  total_games_ppsr INTEGER DEFAULT 0,
  total_players_ppst INTEGER DEFAULT 0,
  total_players_ppsr INTEGER DEFAULT 0,
  total_league_earnings NUMERIC(14,2) DEFAULT 0,
  total_gap_guaranteed NUMERIC(14,2) DEFAULT 0,
  total_player_winnings NUMERIC(14,2) DEFAULT 0,
  total_settlements INTEGER DEFAULT 0,
  settlements_gross_amount NUMERIC(14,2) DEFAULT 0,
  settlements_net_amount NUMERIC(14,2) DEFAULT 0,

  -- Notes
  note TEXT,

  -- Constraints
  UNIQUE(team_id, week_start)
);

-- SU Imports - Importações de planilhas SU
CREATE TABLE IF NOT EXISTS public.poker_su_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- File info
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,

  -- Status
  status poker_su_import_status NOT NULL DEFAULT 'pending',

  -- Period covered by import
  period_start DATE,
  period_end DATE,
  timezone TEXT,

  -- Week period reference
  week_period_id UUID REFERENCES public.poker_su_week_periods(id) ON DELETE SET NULL,

  -- Statistics
  total_leagues INTEGER DEFAULT 0,
  total_games_ppst INTEGER DEFAULT 0,
  total_games_ppsr INTEGER DEFAULT 0,
  total_players_ppst INTEGER DEFAULT 0,
  total_players_ppsr INTEGER DEFAULT 0,

  -- Validation results
  validation_passed BOOLEAN DEFAULT false,
  validation_errors JSONB,
  validation_warnings JSONB,
  quality_score INTEGER DEFAULT 0,

  -- Processing
  processed_at TIMESTAMPTZ,
  processed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  processing_errors JSONB,

  -- Raw data snapshot
  raw_data JSONB
);

-- SU League Summary - Resumo por Liga (aba Geral PPST/PPSR)
CREATE TABLE IF NOT EXISTS public.poker_su_league_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Period and Source
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  import_id UUID REFERENCES public.poker_su_imports(id) ON DELETE SET NULL,
  week_period_id UUID REFERENCES public.poker_su_week_periods(id) ON DELETE SET NULL,

  -- League reference
  su_league_id UUID REFERENCES public.poker_su_leagues(id) ON DELETE CASCADE,
  liga_id INTEGER NOT NULL,           -- Original PPPoker liga_id
  liga_nome TEXT NOT NULL,
  super_union_id INTEGER,

  -- Context from spreadsheet
  taxa_cambio TEXT,

  -- PPST Values (from Geral do PPST)
  ppst_ganhos_jogador NUMERIC(14,2) DEFAULT 0,
  ppst_valor_ticket_ganho NUMERIC(14,2) DEFAULT 0,
  ppst_buyin_ticket NUMERIC(14,2) DEFAULT 0,
  ppst_valor_premio_personalizado NUMERIC(14,2) DEFAULT 0,
  ppst_ganhos_liga_geral NUMERIC(14,2) DEFAULT 0,
  ppst_ganhos_liga_taxa NUMERIC(14,2) DEFAULT 0,
  ppst_buyin_spinup NUMERIC(14,2) DEFAULT 0,
  ppst_premiacao_spinup NUMERIC(14,2) DEFAULT 0,
  ppst_valor_ticket_entregue NUMERIC(14,2) DEFAULT 0,
  ppst_buyin_ticket_liga NUMERIC(14,2) DEFAULT 0,
  ppst_gap_garantido NUMERIC(14,2) DEFAULT 0,

  -- PPSR Values (from Geral do PPSR)
  ppsr_ganhos_jogador NUMERIC(14,2) DEFAULT 0,
  ppsr_ganhos_liga_geral NUMERIC(14,2) DEFAULT 0,
  ppsr_ganhos_liga_taxa NUMERIC(14,2) DEFAULT 0,
  ppsr_rake_total NUMERIC(14,2) DEFAULT 0,

  -- Computed totals
  total_ganhos_jogador NUMERIC(14,2) GENERATED ALWAYS AS (ppst_ganhos_jogador + ppsr_ganhos_jogador) STORED,
  total_ganhos_liga_taxa NUMERIC(14,2) GENERATED ALWAYS AS (ppst_ganhos_liga_taxa + ppsr_ganhos_liga_taxa) STORED,

  -- Constraints
  UNIQUE(team_id, liga_id, period_start, period_end)
);

-- SU Games - Jogos individuais PPST e PPSR
CREATE TABLE IF NOT EXISTS public.poker_su_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Period and Source
  import_id UUID REFERENCES public.poker_su_imports(id) ON DELETE SET NULL,
  week_period_id UUID REFERENCES public.poker_su_week_periods(id) ON DELETE SET NULL,

  -- Game Identity (from PPPoker)
  game_type poker_su_game_type NOT NULL,       -- ppst ou ppsr
  game_variant poker_su_game_variant NOT NULL DEFAULT 'nlh',
  game_id TEXT NOT NULL,                       -- ID do jogo no PPPoker
  table_name TEXT,                             -- Nome da mesa

  -- Game Timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,

  -- Creator
  creator_id TEXT,                             -- PPPoker ID do criador
  creator_name TEXT,

  -- Game Configuration (PPST)
  buyin_base NUMERIC(14,2) DEFAULT 0,
  buyin_bounty NUMERIC(14,2) DEFAULT 0,        -- Para PKO/MKO
  buyin_taxa NUMERIC(14,2) DEFAULT 0,
  premiacao_garantida NUMERIC(14,2) DEFAULT 0,
  is_satellite BOOLEAN DEFAULT false,

  -- Game Configuration (PPSR)
  blinds TEXT,
  min_buyin NUMERIC(14,2) DEFAULT 0,
  max_buyin NUMERIC(14,2) DEFAULT 0,

  -- Aggregated Stats
  player_count INTEGER DEFAULT 0,
  total_buyin NUMERIC(14,2) DEFAULT 0,
  total_ganhos_jogador NUMERIC(14,2) DEFAULT 0,
  total_taxa NUMERIC(14,2) DEFAULT 0,
  total_gap_garantido NUMERIC(14,2) DEFAULT 0,
  total_recompensa NUMERIC(14,2) DEFAULT 0,    -- Para PKO/MKO

  -- Raw data
  raw_data JSONB,

  -- Constraints
  UNIQUE(team_id, game_type, game_id)
);

-- SU Game Players - Jogadores por jogo
CREATE TABLE IF NOT EXISTS public.poker_su_game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Game reference
  game_id UUID NOT NULL REFERENCES public.poker_su_games(id) ON DELETE CASCADE,

  -- League reference
  super_union_id INTEGER,
  liga_id INTEGER NOT NULL,
  clube_id INTEGER NOT NULL,
  clube_nome TEXT,

  -- Player identity (from PPPoker)
  jogador_id INTEGER NOT NULL,
  apelido TEXT NOT NULL,
  nome_memorado TEXT,

  -- Results
  ranking INTEGER,
  buyin_fichas NUMERIC(14,2) DEFAULT 0,
  buyin_ticket NUMERIC(14,2) DEFAULT 0,
  ganhos NUMERIC(14,2) DEFAULT 0,
  taxa NUMERIC(14,2) DEFAULT 0,
  gap_garantido NUMERIC(14,2) DEFAULT 0,

  -- SPINUP specific
  premio NUMERIC(14,2) DEFAULT 0,

  -- PKO/MKO specific
  recompensa NUMERIC(14,2) DEFAULT 0,

  -- Satellite specific
  nome_ticket TEXT,
  valor_ticket NUMERIC(14,2) DEFAULT 0,

  -- PPSR specific
  hands_played INTEGER DEFAULT 0,
  rake_paid NUMERIC(14,2) DEFAULT 0,

  -- Constraints
  UNIQUE(game_id, jogador_id)
);

-- SU Settlements - Acertos SU -> Liga
CREATE TABLE IF NOT EXISTS public.poker_su_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  week_period_id UUID REFERENCES public.poker_su_week_periods(id) ON DELETE SET NULL,

  -- Liga reference
  su_league_id UUID REFERENCES public.poker_su_leagues(id) ON DELETE SET NULL,
  liga_id INTEGER NOT NULL,
  liga_nome TEXT NOT NULL,

  -- Status
  status poker_su_settlement_status NOT NULL DEFAULT 'pending',

  -- PPST Amounts
  ppst_league_fee NUMERIC(14,2) DEFAULT 0,     -- ganhosLigaTaxa
  ppst_gap_guaranteed NUMERIC(14,2) DEFAULT 0, -- gapGarantido
  ppst_games_count INTEGER DEFAULT 0,

  -- PPSR Amounts
  ppsr_league_fee NUMERIC(14,2) DEFAULT 0,     -- ganhosLigaTaxa
  ppsr_games_count INTEGER DEFAULT 0,

  -- Calculated amounts
  gross_amount NUMERIC(14,2) NOT NULL,         -- ppst_league_fee + ppsr_league_fee
  adjustment_amount NUMERIC(14,2) DEFAULT 0,   -- Ajustes manuais
  net_amount NUMERIC(14,2) NOT NULL,           -- gross_amount + adjustment_amount

  -- Payment tracking
  paid_amount NUMERIC(14,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,

  -- Audit
  created_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note TEXT
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- SU Leagues Indexes
CREATE INDEX IF NOT EXISTS poker_su_leagues_team_id_idx ON public.poker_su_leagues(team_id);
CREATE INDEX IF NOT EXISTS poker_su_leagues_liga_id_idx ON public.poker_su_leagues(liga_id);
CREATE INDEX IF NOT EXISTS poker_su_leagues_super_union_id_idx ON public.poker_su_leagues(super_union_id);

-- SU Week Periods Indexes
CREATE INDEX IF NOT EXISTS poker_su_week_periods_team_id_idx ON public.poker_su_week_periods(team_id);
CREATE INDEX IF NOT EXISTS poker_su_week_periods_status_idx ON public.poker_su_week_periods(status);
CREATE INDEX IF NOT EXISTS poker_su_week_periods_week_start_idx ON public.poker_su_week_periods(week_start DESC);
CREATE INDEX IF NOT EXISTS poker_su_week_periods_team_status_idx ON public.poker_su_week_periods(team_id, status);

-- SU Imports Indexes
CREATE INDEX IF NOT EXISTS poker_su_imports_team_id_idx ON public.poker_su_imports(team_id);
CREATE INDEX IF NOT EXISTS poker_su_imports_status_idx ON public.poker_su_imports(status);
CREATE INDEX IF NOT EXISTS poker_su_imports_week_period_id_idx ON public.poker_su_imports(week_period_id);
CREATE INDEX IF NOT EXISTS poker_su_imports_created_at_idx ON public.poker_su_imports(created_at DESC);

-- SU League Summary Indexes
CREATE INDEX IF NOT EXISTS poker_su_league_summary_team_id_idx ON public.poker_su_league_summary(team_id);
CREATE INDEX IF NOT EXISTS poker_su_league_summary_liga_id_idx ON public.poker_su_league_summary(liga_id);
CREATE INDEX IF NOT EXISTS poker_su_league_summary_period_idx ON public.poker_su_league_summary(period_start, period_end);
CREATE INDEX IF NOT EXISTS poker_su_league_summary_week_period_id_idx ON public.poker_su_league_summary(week_period_id);
CREATE INDEX IF NOT EXISTS poker_su_league_summary_import_id_idx ON public.poker_su_league_summary(import_id);

-- SU Games Indexes
CREATE INDEX IF NOT EXISTS poker_su_games_team_id_idx ON public.poker_su_games(team_id);
CREATE INDEX IF NOT EXISTS poker_su_games_game_type_idx ON public.poker_su_games(game_type);
CREATE INDEX IF NOT EXISTS poker_su_games_started_at_idx ON public.poker_su_games(started_at DESC);
CREATE INDEX IF NOT EXISTS poker_su_games_import_id_idx ON public.poker_su_games(import_id);
CREATE INDEX IF NOT EXISTS poker_su_games_week_period_id_idx ON public.poker_su_games(week_period_id);

-- SU Game Players Indexes
CREATE INDEX IF NOT EXISTS poker_su_game_players_team_id_idx ON public.poker_su_game_players(team_id);
CREATE INDEX IF NOT EXISTS poker_su_game_players_game_id_idx ON public.poker_su_game_players(game_id);
CREATE INDEX IF NOT EXISTS poker_su_game_players_liga_id_idx ON public.poker_su_game_players(liga_id);
CREATE INDEX IF NOT EXISTS poker_su_game_players_jogador_id_idx ON public.poker_su_game_players(jogador_id);

-- SU Settlements Indexes
CREATE INDEX IF NOT EXISTS poker_su_settlements_team_id_idx ON public.poker_su_settlements(team_id);
CREATE INDEX IF NOT EXISTS poker_su_settlements_liga_id_idx ON public.poker_su_settlements(liga_id);
CREATE INDEX IF NOT EXISTS poker_su_settlements_status_idx ON public.poker_su_settlements(status);
CREATE INDEX IF NOT EXISTS poker_su_settlements_period_idx ON public.poker_su_settlements(period_start, period_end);
CREATE INDEX IF NOT EXISTS poker_su_settlements_week_period_id_idx ON public.poker_su_settlements(week_period_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.poker_su_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_su_week_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_su_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_su_league_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_su_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_su_game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poker_su_settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "SU leagues can be managed by team members" ON public.poker_su_leagues;
CREATE POLICY "SU leagues can be managed by team members"
  ON public.poker_su_leagues
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

DROP POLICY IF EXISTS "SU week periods can be managed by team members" ON public.poker_su_week_periods;
CREATE POLICY "SU week periods can be managed by team members"
  ON public.poker_su_week_periods
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

DROP POLICY IF EXISTS "SU imports can be managed by team members" ON public.poker_su_imports;
CREATE POLICY "SU imports can be managed by team members"
  ON public.poker_su_imports
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

DROP POLICY IF EXISTS "SU league summary can be viewed by team members" ON public.poker_su_league_summary;
CREATE POLICY "SU league summary can be viewed by team members"
  ON public.poker_su_league_summary
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

DROP POLICY IF EXISTS "SU games can be managed by team members" ON public.poker_su_games;
CREATE POLICY "SU games can be managed by team members"
  ON public.poker_su_games
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

DROP POLICY IF EXISTS "SU game players can be managed by team members" ON public.poker_su_game_players;
CREATE POLICY "SU game players can be managed by team members"
  ON public.poker_su_game_players
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

DROP POLICY IF EXISTS "SU settlements can be managed by team members" ON public.poker_su_settlements;
CREATE POLICY "SU settlements can be managed by team members"
  ON public.poker_su_settlements
  FOR ALL
  TO public
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update updated_at triggers using existing function
DROP TRIGGER IF EXISTS update_poker_su_leagues_updated_at ON public.poker_su_leagues;
CREATE TRIGGER update_poker_su_leagues_updated_at
  BEFORE UPDATE ON public.poker_su_leagues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();

DROP TRIGGER IF EXISTS update_poker_su_week_periods_updated_at ON public.poker_su_week_periods;
CREATE TRIGGER update_poker_su_week_periods_updated_at
  BEFORE UPDATE ON public.poker_su_week_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();

DROP TRIGGER IF EXISTS update_poker_su_imports_updated_at ON public.poker_su_imports;
CREATE TRIGGER update_poker_su_imports_updated_at
  BEFORE UPDATE ON public.poker_su_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();

DROP TRIGGER IF EXISTS update_poker_su_settlements_updated_at ON public.poker_su_settlements;
CREATE TRIGGER update_poker_su_settlements_updated_at
  BEFORE UPDATE ON public.poker_su_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();
