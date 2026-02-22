-- Club Member Requests: track new member approval requests
CREATE TABLE IF NOT EXISTS club_member_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES poker_players(id) ON DELETE SET NULL,
  pppoker_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  note TEXT
);

CREATE UNIQUE INDEX idx_club_member_requests_team_pppoker ON club_member_requests(team_id, pppoker_id) WHERE status = 'pending';
CREATE INDEX idx_club_member_requests_team_status ON club_member_requests(team_id, status);
CREATE INDEX idx_club_member_requests_player ON club_member_requests(player_id);

-- Club Credit Requests: track credit limit change requests
CREATE TABLE IF NOT EXISTS club_credit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES poker_players(id) ON DELETE SET NULL,
  pppoker_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  requested_amount NUMERIC NOT NULL DEFAULT 0,
  current_credit_limit NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_amount NUMERIC,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  note TEXT
);

CREATE INDEX idx_club_credit_requests_team_status ON club_credit_requests(team_id, status);
CREATE INDEX idx_club_credit_requests_player ON club_credit_requests(player_id);

-- RLS Policies
ALTER TABLE club_member_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_credit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own team member requests"
  ON club_member_requests FOR SELECT
  USING (team_id IN (SELECT team_id FROM users_on_team WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own team member requests"
  ON club_member_requests FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM users_on_team WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own team member requests"
  ON club_member_requests FOR UPDATE
  USING (team_id IN (SELECT team_id FROM users_on_team WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own team credit requests"
  ON club_credit_requests FOR SELECT
  USING (team_id IN (SELECT team_id FROM users_on_team WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own team credit requests"
  ON club_credit_requests FOR INSERT
  WITH CHECK (team_id IN (SELECT team_id FROM users_on_team WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own team credit requests"
  ON club_credit_requests FOR UPDATE
  USING (team_id IN (SELECT team_id FROM users_on_team WHERE user_id = auth.uid()));

-- Updated_at triggers (reusing existing function)
CREATE TRIGGER update_club_member_requests_updated_at
  BEFORE UPDATE ON club_member_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();

CREATE TRIGGER update_club_credit_requests_updated_at
  BEFORE UPDATE ON club_credit_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poker_players_updated_at();
