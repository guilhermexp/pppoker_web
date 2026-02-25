/**
 * PPPoker Sync Worker
 * Periodically syncs club member data from PPPoker API (via bridge) into Supabase.
 * Frontend receives updates via Supabase real-time (postgres_changes).
 */

import { createAdminClient } from "@api/services/supabase";
import { logger } from "@midpoker/logger";

const PPPOKER_BRIDGE_URL =
  process.env.PPPOKER_BRIDGE_URL || "http://localhost:3102";

const SYNC_INTERVAL_MS = 60_000; // 60 seconds

// PPPoker role mapping
const ROLE_TO_TYPE: Record<number, "player" | "agent" | "super_agent"> = {
  1: "super_agent", // Dono
  2: "super_agent", // Gestor
  4: "super_agent", // Super Agente
  5: "agent", // Agente
  10: "player", // Membro
};

interface PPPokerMember {
  uid: number;
  nome: string;
  papel_num: number;
  papel: string;
  online: boolean;
  saldo_caixa: number | null;
  credito_linha: number;
  agente_uid: number | null;
  agente_nome: string;
  super_agente_uid: number | null;
  super_agente_nome: string;
  titulo: string;
  avatar_url: string;
  join_ts: number | null;
  last_active_ts: number | null;
  ganhos?: number | null;
  taxa?: number | null;
  maos?: number | null;
}

interface ClubConnection {
  id: string;
  team_id: string;
  club_id: number;
  club_name: string | null;
  pppoker_username: string;
  pppoker_password: string;
  sync_status: string;
}

async function fetchClubMembers(
  connection: ClubConnection,
  ligaId?: number | null,
): Promise<PPPokerMember[]> {
  const url = new URL(
    `${PPPOKER_BRIDGE_URL}/clubs/${connection.club_id}/members`,
  );

  // Pass liga_id + date range so bridge returns ganhos/taxa/maos
  if (ligaId) {
    url.searchParams.set("liga_id", String(ligaId));
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    url.searchParams.set("date_start", fmt(start));
    url.searchParams.set("date_end", fmt(now));
  }

  const resp = await fetch(url.toString(), {
    headers: {
      "X-PPPoker-Username": connection.pppoker_username,
      "X-PPPoker-Password": connection.pppoker_password,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Bridge returned ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return data.members ?? [];
}

async function syncClub(connection: ClubConnection): Promise<number> {
  const supabase = await createAdminClient();

  // Fetch liga_id from team settings so bridge returns ganhos/taxa/maos
  const { data: team } = await supabase
    .from("teams")
    .select("poker_liga_id")
    .eq("id", connection.team_id)
    .single();
  const ligaId = team?.poker_liga_id ? Number(team.poker_liga_id) : null;

  const members = await fetchClubMembers(connection, ligaId);

  if (members.length === 0) {
    logger.warn(
      { clubId: connection.club_id },
      "No members returned from PPPoker",
    );
    return 0;
  }

  // First pass: upsert all members to create DB records
  // We need to do this first so agent_id references can be resolved
  const memberUids = members.map((m) => String(m.uid));

  // Get existing players for this team
  const { data: existingPlayers } = await supabase
    .from("poker_players")
    .select("id, pppoker_id")
    .eq("team_id", connection.team_id)
    .in("pppoker_id", memberUids);

  const pppokerIdToDbId = new Map<string, string>();
  for (const p of existingPlayers ?? []) {
    pppokerIdToDbId.set(p.pppoker_id, p.id);
  }

  // Upsert members in batches
  const now = new Date().toISOString();
  let synced = 0;

  for (let i = 0; i < members.length; i += 100) {
    const batch = members.slice(i, i + 100);

    const rows = batch.map((m) => ({
      team_id: connection.team_id,
      pppoker_id: String(m.uid),
      nickname: m.nome || `Player ${m.uid}`,
      type: ROLE_TO_TYPE[m.papel_num] ?? "player",
      status: "active" as const,
      is_online: m.online,
      cashbox_balance: m.saldo_caixa ?? 0,
      pppoker_role: m.papel_num,
      credit_limit: m.credito_linha >= 0 ? m.credito_linha : 0,
      ganhos: m.ganhos ?? 0,
      taxa: m.taxa ?? 0,
      maos: m.maos ?? 0,
      avatar_url: m.avatar_url ?? "",
      agente_uid: m.agente_uid ?? null,
      agente_nome: m.agente_nome ?? "",
      super_agente_uid: m.super_agente_uid ?? null,
      super_agente_nome: m.super_agente_nome ?? "",
      last_synced_at: now,
      updated_at: now,
    }));

    const { error } = await supabase.from("poker_players").upsert(rows, {
      onConflict: "team_id,pppoker_id",
      ignoreDuplicates: false,
    });

    if (error) {
      logger.error(
        { error: error.message, clubId: connection.club_id },
        "Batch upsert failed",
      );
    } else {
      synced += batch.length;
    }
  }

  // Auto-create member requests for new members (joined in last 7 days and not previously in DB)
  const existingPppokerIds = new Set(
    (existingPlayers ?? []).map((p) => p.pppoker_id),
  );
  const sevenDaysAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;
  const newMemberRows = members
    .filter((m) => {
      const isNew = !existingPppokerIds.has(String(m.uid));
      const isRecent = m.join_ts != null && m.join_ts > sevenDaysAgo;
      const isRegularMember = m.papel_num === 10; // Only regular members
      return isNew && isRecent && isRegularMember;
    })
    .map((m) => ({
      team_id: connection.team_id,
      pppoker_id: String(m.uid),
      nickname: m.nome || `Player ${m.uid}`,
      status: "pending" as const,
    }));

  if (newMemberRows.length > 0) {
    // Insert ignoring conflicts (partial unique index on pending status prevents duplicates)
    const { error: memberReqError } = await supabase
      .from("club_member_requests")
      .insert(newMemberRows);

    if (memberReqError) {
      // Non-critical: may fail due to unique constraint if request already pending
      logger.warn(
        { error: memberReqError.message },
        "Failed to create member requests for new members",
      );
    } else {
      logger.info(
        { count: newMemberRows.length, clubId: connection.club_id },
        "Created member requests for new members",
      );
    }
  }

  // Second pass: resolve agent relationships
  // Refresh the ID map after upserts
  const { data: allPlayers } = await supabase
    .from("poker_players")
    .select("id, pppoker_id")
    .eq("team_id", connection.team_id);

  const idMap = new Map<string, string>();
  for (const p of allPlayers ?? []) {
    idMap.set(p.pppoker_id, p.id);
  }

  // Update agent_id and super_agent_id
  for (const m of members) {
    const playerId = idMap.get(String(m.uid));
    if (!playerId) continue;

    const updates: Record<string, unknown> = {};

    if (m.agente_uid && m.agente_uid !== m.uid) {
      const agentDbId = idMap.get(String(m.agente_uid));
      if (agentDbId) {
        updates.agent_id = agentDbId;
      }
    }

    if (m.super_agente_uid && m.super_agente_uid !== m.uid) {
      const superAgentDbId = idMap.get(String(m.super_agente_uid));
      if (superAgentDbId) {
        updates.super_agent_id = superAgentDbId;
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("poker_players")
        .update(updates)
        .eq("id", playerId)
        .eq("team_id", connection.team_id);
    }
  }

  // Update connection last_synced_at
  await supabase
    .from("pppoker_club_connections")
    .update({ last_synced_at: now })
    .eq("id", connection.id);

  return synced;
}

async function runSyncCycle() {
  const supabase = await createAdminClient();

  // Get all active club connections
  const { data: connections, error } = await supabase
    .from("pppoker_club_connections")
    .select("*")
    .eq("sync_status", "active");

  if (error) {
    logger.error({ error: error.message }, "Failed to fetch club connections");
    return;
  }

  if (!connections || connections.length === 0) {
    return;
  }

  for (const conn of connections) {
    try {
      const count = await syncClub(conn as ClubConnection);
      logger.info(
        { clubId: conn.club_id, synced: count },
        "Club sync completed",
      );
    } catch (err) {
      logger.error(
        { error: err instanceof Error ? err.message : String(err), clubId: conn.club_id },
        "Club sync failed",
      );

      // Mark connection as errored (but don't disable)
      await supabase
        .from("pppoker_club_connections")
        .update({ sync_status: "error" })
        .eq("id", conn.id);
    }
  }
}

/**
 * Trigger a sync for a specific team immediately.
 * Called from TRPC endpoint pppoker.syncNow
 */
export async function triggerSyncForTeam(teamId: string): Promise<number> {
  const supabase = await createAdminClient();

  const { data: connections } = await supabase
    .from("pppoker_club_connections")
    .select("*")
    .eq("team_id", teamId)
    .in("sync_status", ["active", "error"]);

  if (!connections || connections.length === 0) {
    return 0;
  }

  let totalSynced = 0;
  for (const conn of connections) {
    try {
      const count = await syncClub(conn as ClubConnection);
      totalSynced += count;

      // Reset status to active if it was in error
      if (conn.sync_status === "error") {
        await supabase
          .from("pppoker_club_connections")
          .update({ sync_status: "active" })
          .eq("id", conn.id);
      }
    } catch (err) {
      logger.error(
        { error: err instanceof Error ? err.message : String(err), clubId: conn.club_id },
        "Manual sync failed",
      );
      throw err;
    }
  }

  return totalSynced;
}

/**
 * Start the background sync loop.
 * Call this from the API server startup.
 */
export function startSyncWorker() {
  logger.info("PPPoker sync worker started");

  // Run immediately, then at interval
  runSyncCycle().catch((err) =>
    logger.error({ error: String(err) }, "Initial sync cycle failed"),
  );

  setInterval(() => {
    runSyncCycle().catch((err) =>
      logger.error({ error: String(err) }, "Sync cycle failed"),
    );
  }, SYNC_INTERVAL_MS);
}
