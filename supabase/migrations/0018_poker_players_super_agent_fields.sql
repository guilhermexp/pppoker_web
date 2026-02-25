-- Add super_agente_uid and super_agente_nome to poker_players
-- These store the PPPoker UID of the super-agent for direct lookups
ALTER TABLE poker_players
  ADD COLUMN IF NOT EXISTS super_agente_uid integer,
  ADD COLUMN IF NOT EXISTS super_agente_nome text DEFAULT '';
