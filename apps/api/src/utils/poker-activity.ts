import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityMetrics = {
  lastSessionAt: string | null;
  sessionsLast4Weeks: number;
  weeksActiveLast4: number;
  daysSinceLastSession: number | null;
  daysSinceLastAppActivity: number | null;
  sessionFrequency: "daily" | "weekly" | "biweekly" | "monthly" | "sporadic" | "unknown";
  activityScore: number;
  activityStatus: "active" | "at_risk" | "inactive" | "new";
};

/**
 * Calculate activity metrics for a single player
 */
export async function calculatePlayerActivityMetrics(
  supabase: SupabaseClient,
  teamId: string,
  playerId: string,
  lastActiveAt: string | null
): Promise<ActivityMetrics> {
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  // Get all sessions for this player in the last 4 weeks
  const { data: sessions } = await supabase
    .from("poker_session_players")
    .select(`
      session_id,
      poker_sessions!inner (
        started_at
      )
    `)
    .eq("team_id", teamId)
    .eq("player_id", playerId)
    .gte("poker_sessions.started_at", fourWeeksAgo.toISOString());

  // Get last session ever
  const { data: lastSessionData } = await supabase
    .from("poker_session_players")
    .select(`
      session_id,
      poker_sessions!inner (
        started_at
      )
    `)
    .eq("team_id", teamId)
    .eq("player_id", playerId)
    .order("poker_sessions(started_at)", { ascending: false })
    .limit(1);

  // Calculate metrics
  const sessionsLast4Weeks = sessions?.length ?? 0;

  // Calculate weeks with activity
  const weekSet = new Set<string>();
  for (const session of sessions ?? []) {
    const sessionDate = new Date((session.poker_sessions as any).started_at);
    const weekNum = getWeekNumber(sessionDate);
    weekSet.add(`${sessionDate.getFullYear()}-${weekNum}`);
  }
  const weeksActiveLast4 = weekSet.size;

  // Last session date
  const lastSessionAt = lastSessionData?.[0]
    ? (lastSessionData[0].poker_sessions as any).started_at
    : null;

  // Days since last session
  let daysSinceLastSession: number | null = null;
  if (lastSessionAt) {
    const lastSessionDate = new Date(lastSessionAt);
    daysSinceLastSession = Math.floor(
      (now.getTime() - lastSessionDate.getTime()) / (24 * 60 * 60 * 1000)
    );
  }

  // Days since last app activity
  let daysSinceLastAppActivity: number | null = null;
  if (lastActiveAt) {
    const lastActiveDate = new Date(lastActiveAt);
    daysSinceLastAppActivity = Math.floor(
      (now.getTime() - lastActiveDate.getTime()) / (24 * 60 * 60 * 1000)
    );
  }

  // Calculate session frequency
  const sessionFrequency = calculateFrequency(sessionsLast4Weeks, weeksActiveLast4);

  // Calculate activity score (0-100)
  const activityScore = calculateActivityScore(
    sessionsLast4Weeks,
    weeksActiveLast4,
    daysSinceLastSession,
    daysSinceLastAppActivity
  );

  // Determine activity status
  const activityStatus = determineActivityStatus(
    sessionsLast4Weeks,
    daysSinceLastSession,
    daysSinceLastAppActivity,
    lastSessionAt
  );

  return {
    lastSessionAt,
    sessionsLast4Weeks,
    weeksActiveLast4,
    daysSinceLastSession,
    daysSinceLastAppActivity,
    sessionFrequency,
    activityScore,
    activityStatus,
  };
}

/**
 * Calculate activity metrics for multiple players in batch
 */
export async function calculateBatchActivityMetrics(
  supabase: SupabaseClient,
  teamId: string,
  playerIds: string[]
): Promise<Map<string, Partial<ActivityMetrics>>> {
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  // Get all sessions for these players in the last 4 weeks
  const { data: sessions } = await supabase
    .from("poker_session_players")
    .select(`
      player_id,
      session_id,
      poker_sessions!inner (
        started_at
      )
    `)
    .eq("team_id", teamId)
    .in("player_id", playerIds)
    .gte("poker_sessions.started_at", fourWeeksAgo.toISOString());

  // Get last session for each player
  const { data: allSessions } = await supabase
    .from("poker_session_players")
    .select(`
      player_id,
      poker_sessions!inner (
        started_at
      )
    `)
    .eq("team_id", teamId)
    .in("player_id", playerIds)
    .order("poker_sessions(started_at)", { ascending: false });

  // Build metrics map
  const metricsMap = new Map<string, Partial<ActivityMetrics>>();

  // Initialize all players
  for (const playerId of playerIds) {
    metricsMap.set(playerId, {
      sessionsLast4Weeks: 0,
      weeksActiveLast4: 0,
      lastSessionAt: null,
      daysSinceLastSession: null,
    });
  }

  // Group sessions by player
  const sessionsByPlayer = new Map<string, any[]>();
  for (const session of sessions ?? []) {
    const existing = sessionsByPlayer.get(session.player_id) ?? [];
    existing.push(session);
    sessionsByPlayer.set(session.player_id, existing);
  }

  // Find last session per player
  const lastSessionByPlayer = new Map<string, string>();
  for (const session of allSessions ?? []) {
    if (!lastSessionByPlayer.has(session.player_id)) {
      lastSessionByPlayer.set(
        session.player_id,
        (session.poker_sessions as any).started_at
      );
    }
  }

  // Calculate metrics for each player
  for (const playerId of playerIds) {
    const playerSessions = sessionsByPlayer.get(playerId) ?? [];
    const sessionsLast4Weeks = playerSessions.length;

    // Calculate weeks with activity
    const weekSet = new Set<string>();
    for (const session of playerSessions) {
      const sessionDate = new Date((session.poker_sessions as any).started_at);
      const weekNum = getWeekNumber(sessionDate);
      weekSet.add(`${sessionDate.getFullYear()}-${weekNum}`);
    }
    const weeksActiveLast4 = weekSet.size;

    // Last session
    const lastSessionAt = lastSessionByPlayer.get(playerId) ?? null;

    // Days since last session
    let daysSinceLastSession: number | null = null;
    if (lastSessionAt) {
      const lastSessionDate = new Date(lastSessionAt);
      daysSinceLastSession = Math.floor(
        (now.getTime() - lastSessionDate.getTime()) / (24 * 60 * 60 * 1000)
      );
    }

    // Determine activity status
    const activityStatus = determineActivityStatus(
      sessionsLast4Weeks,
      daysSinceLastSession,
      null, // daysSinceLastAppActivity - not available in batch
      lastSessionAt
    );

    metricsMap.set(playerId, {
      sessionsLast4Weeks,
      weeksActiveLast4,
      lastSessionAt,
      daysSinceLastSession,
      activityStatus,
    });
  }

  return metricsMap;
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function calculateFrequency(
  sessionsLast4Weeks: number,
  weeksActiveLast4: number
): ActivityMetrics["sessionFrequency"] {
  if (sessionsLast4Weeks === 0) return "unknown";

  const avgSessionsPerWeek = sessionsLast4Weeks / 4;

  if (avgSessionsPerWeek >= 5) return "daily";
  if (avgSessionsPerWeek >= 2) return "weekly";
  if (weeksActiveLast4 >= 2) return "biweekly";
  if (weeksActiveLast4 >= 1) return "monthly";
  return "sporadic";
}

function calculateActivityScore(
  sessionsLast4Weeks: number,
  weeksActiveLast4: number,
  daysSinceLastSession: number | null,
  daysSinceLastAppActivity: number | null
): number {
  let score = 0;

  // Sessions score (max 40 points)
  // 10+ sessions = 40 points, scales down linearly
  score += Math.min(40, sessionsLast4Weeks * 4);

  // Weeks active score (max 20 points)
  // 4 weeks = 20 points, 3 weeks = 15, etc.
  score += weeksActiveLast4 * 5;

  // Recency score for sessions (max 20 points)
  if (daysSinceLastSession !== null) {
    if (daysSinceLastSession <= 3) score += 20;
    else if (daysSinceLastSession <= 7) score += 15;
    else if (daysSinceLastSession <= 14) score += 10;
    else if (daysSinceLastSession <= 30) score += 5;
  }

  // App activity score (max 20 points)
  if (daysSinceLastAppActivity !== null) {
    if (daysSinceLastAppActivity <= 3) score += 20;
    else if (daysSinceLastAppActivity <= 7) score += 15;
    else if (daysSinceLastAppActivity <= 14) score += 10;
    else if (daysSinceLastAppActivity <= 30) score += 5;
  }

  return Math.min(100, score);
}

function determineActivityStatus(
  sessionsLast4Weeks: number,
  daysSinceLastSession: number | null,
  daysSinceLastAppActivity: number | null,
  lastSessionAt: string | null
): ActivityMetrics["activityStatus"] {
  // New player - never played
  if (!lastSessionAt && sessionsLast4Weeks === 0) {
    return "new";
  }

  // Active - played recently or active in app
  const playedRecently = daysSinceLastSession !== null && daysSinceLastSession <= 14;
  const appActiveRecently = daysSinceLastAppActivity !== null && daysSinceLastAppActivity <= 7;
  const hasRecentSessions = sessionsLast4Weeks >= 2;

  if (playedRecently || appActiveRecently || hasRecentSessions) {
    return "active";
  }

  // Inactive - no activity for 30+ days
  const noRecentSessions = daysSinceLastSession === null || daysSinceLastSession > 30;
  const noRecentAppActivity = daysSinceLastAppActivity === null || daysSinceLastAppActivity > 30;

  if (noRecentSessions && noRecentAppActivity) {
    return "inactive";
  }

  // At risk - between active and inactive
  return "at_risk";
}
