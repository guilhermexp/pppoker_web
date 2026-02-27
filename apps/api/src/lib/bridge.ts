import { createAdminClient } from "@api/services/supabase";
import { decrypt } from "@midpoker/encryption";
import { TRPCError } from "@trpc/server";

export const PPPOKER_BRIDGE_URL =
  process.env.PPPOKER_BRIDGE_URL || "http://localhost:3102";

/**
 * Default fetch timeout for bridge calls (30 seconds).
 * Bridge calls go through PPPoker TCP which can be slow (5-19s).
 */
export const BRIDGE_FETCH_TIMEOUT = 30_000;

// ---------------------------------------------------------------------------
// Credentials cache (in-memory, 60s TTL)
// ---------------------------------------------------------------------------

const credentialsCache = new Map<
  string,
  { data: BridgeCredentials; expiresAt: number }
>();
const CACHE_TTL_MS = 60_000;

interface BridgeCredentials {
  club_id: number;
  pppoker_username: string;
  pppoker_password: string;
}

interface BridgeCredentialsWithLiga extends BridgeCredentials {
  liga_id: number | null;
}

// ---------------------------------------------------------------------------
// Circuit Breaker — protects against cascading failures when bridge is down
// ---------------------------------------------------------------------------

const CIRCUIT_FAILURE_THRESHOLD = 5; // Open after 5 failures
const CIRCUIT_WINDOW_MS = 60_000; // Within 1 minute
const CIRCUIT_RECOVERY_MS = 30_000; // Try again after 30 seconds

type CircuitState = "closed" | "open" | "half-open";

const circuitBreaker = {
  state: "closed" as CircuitState,
  failures: [] as number[],
  lastOpenedAt: 0,

  recordFailure() {
    const now = Date.now();
    this.failures.push(now);
    // Keep only failures within the window
    this.failures = this.failures.filter((t) => now - t < CIRCUIT_WINDOW_MS);
    if (this.failures.length >= CIRCUIT_FAILURE_THRESHOLD) {
      this.state = "open";
      this.lastOpenedAt = now;
      console.warn(
        `[bridge] Circuit breaker OPENED — ${this.failures.length} failures in ${CIRCUIT_WINDOW_MS / 1000}s`,
      );
    }
  },

  recordSuccess() {
    if (this.state === "half-open") {
      console.info("[bridge] Circuit breaker CLOSED — bridge recovered");
    }
    this.state = "closed";
    this.failures = [];
  },

  canRequest(): boolean {
    if (this.state === "closed") return true;
    if (this.state === "open") {
      // Check if recovery period has elapsed
      if (Date.now() - this.lastOpenedAt >= CIRCUIT_RECOVERY_MS) {
        this.state = "half-open";
        return true; // Allow one probe request
      }
      return false;
    }
    // half-open: allow the probe
    return true;
  },
};

/** Check if the bridge circuit is currently open (unhealthy). */
export function isBridgeCircuitOpen(): boolean {
  return !circuitBreaker.canRequest();
}

/** Get circuit breaker status for health checks. */
export function getBridgeCircuitStatus() {
  return {
    state: circuitBreaker.state,
    recentFailures: circuitBreaker.failures.length,
    lastOpenedAt: circuitBreaker.lastOpenedAt || null,
  };
}

// ---------------------------------------------------------------------------
// Bridge Health Check
// ---------------------------------------------------------------------------

let lastHealthCheck: { ok: boolean; ts: number; detail: string } | null = null;

/** Ping bridge /health endpoint. Cached for 15 seconds. */
export async function checkBridgeHealth(): Promise<{
  ok: boolean;
  detail: string;
  circuit: ReturnType<typeof getBridgeCircuitStatus>;
}> {
  const now = Date.now();
  if (lastHealthCheck && now - lastHealthCheck.ts < 15_000) {
    return {
      ok: lastHealthCheck.ok,
      detail: lastHealthCheck.detail,
      circuit: getBridgeCircuitStatus(),
    };
  }

  try {
    const res = await fetch(`${PPPOKER_BRIDGE_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    const json = (await res.json()) as {
      status: string;
      active_sessions: number;
    };
    const ok = res.ok && json.status === "ok";
    const detail = ok
      ? `Bridge OK (${json.active_sessions} sessions)`
      : `Bridge unhealthy: ${JSON.stringify(json)}`;
    lastHealthCheck = { ok, ts: now, detail };
    return { ok, detail, circuit: getBridgeCircuitStatus() };
  } catch (err) {
    const detail = `Bridge unreachable: ${err instanceof Error ? err.message : String(err)}`;
    lastHealthCheck = { ok: false, ts: now, detail };
    return { ok: false, detail, circuit: getBridgeCircuitStatus() };
  }
}

// ---------------------------------------------------------------------------
// bridgeFetch — single wrapper for ALL bridge HTTP calls
// ---------------------------------------------------------------------------

export interface BridgeFetchOptions extends RequestInit {
  /** If true, throw on circuit open instead of returning error. Default: true */
  throwOnCircuitOpen?: boolean;
}

/**
 * Fetch wrapper for bridge calls with circuit breaker + timeout.
 * All bridge calls should go through this function.
 */
export async function bridgeFetch(
  url: string,
  options: BridgeFetchOptions = {},
): Promise<Response> {
  const { throwOnCircuitOpen = true, ...fetchOptions } = options;

  // Check circuit breaker
  if (!circuitBreaker.canRequest()) {
    if (throwOnCircuitOpen) {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message:
          "PPPoker bridge temporariamente indisponível. Tente novamente em alguns segundos.",
      });
    }
    return new Response(
      JSON.stringify({
        error: "circuit_open",
        message: "Bridge temporarily unavailable",
      }),
      { status: 503 },
    );
  }

  // Add timeout if not already set
  if (!fetchOptions.signal) {
    fetchOptions.signal = AbortSignal.timeout(BRIDGE_FETCH_TIMEOUT);
  }

  try {
    const res = await fetch(url, fetchOptions);
    if (res.ok) {
      circuitBreaker.recordSuccess();
    } else if (res.status >= 500) {
      circuitBreaker.recordFailure();
    }
    return res;
  } catch (err) {
    circuitBreaker.recordFailure();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Credential helpers — decrypt password if encrypted
// ---------------------------------------------------------------------------

/**
 * Safely get the plaintext password.
 * Supports both legacy plaintext and new encrypted (base64) format.
 */
function decryptPasswordIfNeeded(stored: string): string {
  // Encrypted passwords are base64-encoded (contain only base64 chars and are >= 44 chars)
  // Plaintext PPPoker passwords are typically short alphanumeric strings
  if (stored.length >= 44 && /^[A-Za-z0-9+/]+=*$/.test(stored)) {
    try {
      return decrypt(stored);
    } catch {
      // Not encrypted or decryption failed — treat as plaintext
      return stored;
    }
  }
  return stored;
}

/**
 * Get bridge credentials for a team (basic: club_id, username, password).
 * Cached in-memory for 60 seconds.
 */
export async function getBridgeCredentials(
  teamId: string,
): Promise<BridgeCredentials> {
  const cacheKey = `basic:${teamId}`;
  const cached = credentialsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("pppoker_club_connections")
    .select("club_id, pppoker_username, pppoker_password")
    .eq("team_id", teamId)
    .in("sync_status", ["active", "error"])
    .limit(1)
    .single();

  if (!data) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Nenhuma conexao PPPoker encontrada. Faca login novamente.",
    });
  }

  const result: BridgeCredentials = {
    club_id: data.club_id,
    pppoker_username: data.pppoker_username,
    pppoker_password: decryptPasswordIfNeeded(data.pppoker_password),
  };

  credentialsCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
}

/**
 * Get bridge credentials with liga_id (extended version used by members/club-data).
 * Cached in-memory for 60 seconds.
 */
export async function getBridgeCredentialsWithLiga(
  teamId: string,
): Promise<BridgeCredentialsWithLiga> {
  const cacheKey = `liga:${teamId}`;
  const cached = credentialsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as BridgeCredentialsWithLiga;
  }

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("pppoker_club_connections")
    .select("club_id, pppoker_username, pppoker_password")
    .eq("team_id", teamId)
    .in("sync_status", ["active", "error"])
    .limit(1)
    .single();

  if (!data) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Nenhuma conexao PPPoker encontrada. Faca login novamente.",
    });
  }

  // Fetch liga_id from team settings
  const { data: team } = await supabase
    .from("teams")
    .select("poker_liga_id")
    .eq("id", teamId)
    .single();

  const result: BridgeCredentialsWithLiga = {
    club_id: data.club_id,
    pppoker_username: data.pppoker_username,
    pppoker_password: decryptPasswordIfNeeded(data.pppoker_password),
    liga_id: team?.poker_liga_id ? Number(team.poker_liga_id) : null,
  };

  credentialsCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
}
