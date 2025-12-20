import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { withReplicas } from "./replicas";
import * as schema from "./schema";

const isDevelopment = process.env.NODE_ENV === "development";

const connectionConfig = {
  max: isDevelopment ? 3 : 12,
  idleTimeoutMillis: isDevelopment ? 10000 : 60000,
  connectionTimeoutMillis: 30000,
  maxUses: isDevelopment ? 50 : 0,
  allowExitOnIdle: true,
};

// Lazy initialization to ensure env vars are loaded
let _primaryPool: Pool | null = null;
let _fraPool: Pool | null = null;
let _sjcPool: Pool | null = null;
let _iadPool: Pool | null = null;

const getPrimaryPool = () => {
  if (!_primaryPool) {
    const connectionString = process.env.DATABASE_PRIMARY_URL;
    if (!connectionString) {
      throw new Error("DATABASE_PRIMARY_URL is not set");
    }
    _primaryPool = new Pool({
      connectionString,
      ...connectionConfig,
    });
  }
  return _primaryPool;
};

const getFraPool = () => {
  if (!_fraPool && process.env.DATABASE_FRA_URL) {
    _fraPool = new Pool({
      connectionString: process.env.DATABASE_FRA_URL,
      ...connectionConfig,
    });
  }
  return _fraPool;
};

const getSjcPool = () => {
  if (!_sjcPool && process.env.DATABASE_SJC_URL) {
    _sjcPool = new Pool({
      connectionString: process.env.DATABASE_SJC_URL,
      ...connectionConfig,
    });
  }
  return _sjcPool;
};

const getIadPool = () => {
  if (!_iadPool && process.env.DATABASE_IAD_URL) {
    _iadPool = new Pool({
      connectionString: process.env.DATABASE_IAD_URL,
      ...connectionConfig,
    });
  }
  return _iadPool;
};

// For backward compatibility - these will be initialized on first access
const primaryPool = new Proxy({} as Pool, {
  get: (_, prop) => (getPrimaryPool() as any)[prop],
});

const fraPool = new Proxy({} as Pool, {
  get: (_, prop) => (getFraPool() as any)?.[prop],
});

const sjcPool = new Proxy({} as Pool, {
  get: (_, prop) => (getSjcPool() as any)?.[prop],
});

const iadPool = new Proxy({} as Pool, {
  get: (_, prop) => (getIadPool() as any)?.[prop],
});

const hasReplicas = Boolean(
  process.env.DATABASE_FRA_URL &&
    process.env.DATABASE_SJC_URL &&
    process.env.DATABASE_IAD_URL,
);

// Connection pool monitoring function
export const getConnectionPoolStats = () => {
  const getPoolStats = (pool: Pool, name: string) => {
    try {
      return {
        name,
        total: pool.options.max || 0,
        idle: pool.idleCount || 0,
        active: pool.totalCount - pool.idleCount,
        waiting: pool.waitingCount || 0,
        ended: pool.ended || false,
      };
    } catch (error) {
      return {
        name,
        error: error instanceof Error ? error.message : String(error),
        total: 0,
        idle: 0,
        active: 0,
        waiting: 0,
        ended: true,
      };
    }
  };

  // Only include pools that are actually being used
  const pools: Record<string, any> = {
    primary: getPoolStats(primaryPool, "primary"),
  };

  // Only add replica pools if they're configured
  if (hasReplicas) {
    pools.fra = getPoolStats(fraPool, "fra");
    pools.sjc = getPoolStats(sjcPool, "sjc");
    pools.iad = getPoolStats(iadPool, "iad");
  }

  const poolArray = Object.values(pools);
  const totalActive = poolArray.reduce(
    (sum: number, pool: any) => sum + (pool.active || 0),
    0,
  );
  const totalWaiting = poolArray.reduce(
    (sum: number, pool: any) => sum + (pool.waiting || 0),
    0,
  );
  const hasExhaustedPools = poolArray.some(
    (pool: any) =>
      (pool.active || 0) >= (pool.total || 0) || (pool.waiting || 0) > 0,
  );

  const connectionsPerPool = isDevelopment ? 8 : 12; // Match the actual config
  const totalConnections = hasReplicas
    ? connectionsPerPool * 4
    : connectionsPerPool;

  return {
    timestamp: new Date().toISOString(),
    region: process.env.FLY_REGION || "unknown",
    instance: process.env.FLY_ALLOC_ID || "local",
    pools,
    summary: {
      totalConnections,
      totalActive,
      totalWaiting,
      hasExhaustedPools,
      utilizationPercent: Math.round((totalActive / totalConnections) * 100),
    },
  };
};

export const primaryDb = drizzle(primaryPool, {
  schema,
  casing: "snake_case",
});

const getReplicaIndexForRegion = () => {
  switch (process.env.FLY_REGION) {
    case "fra":
      return 0;
    case "iad":
      return 1;
    case "sjc":
      return 2;
    default:
      return 0;
  }
};

// Create the database instance once and export it
const replicaIndex = getReplicaIndexForRegion();

// Create a wrapper that adds replica methods even when there are no replicas
const createPrimaryOnlyDb = (primary: typeof primaryDb) => {
  const executeOnReplica = async <
    TRow extends Record<string, unknown> = Record<string, unknown>,
  >(
    query: string | any,
  ): Promise<TRow[]> => {
    const result = await primary.execute(query);
    if (Array.isArray(result)) {
      return result as TRow[];
    }
    return (result as any).rows as TRow[];
  };

  // Use a Proxy to properly delegate all methods to primary while adding replica methods
  return new Proxy(primary, {
    get(target, prop) {
      // Add replica-specific methods
      if (prop === "executeOnReplica") return executeOnReplica;
      if (prop === "transactionOnReplica") return target.transaction;
      if (prop === "$primary") return target;
      if (prop === "usePrimaryOnly") return () => createPrimaryOnlyDb(target);
      // Delegate everything else to primary
      return (target as any)[prop];
    },
  }) as typeof primaryDb & {
    executeOnReplica: typeof executeOnReplica;
    transactionOnReplica: typeof primary.transaction;
    $primary: typeof primary;
    usePrimaryOnly: () => ReturnType<typeof createPrimaryOnlyDb>;
  };
};

// Only use replicas when all replica URLs are configured
export const db = hasReplicas
  ? withReplicas(
      primaryDb,
      [
        // Order of replicas is important
        drizzle(fraPool, {
          schema,
          casing: "snake_case",
        }),
        drizzle(iadPool, {
          schema,
          casing: "snake_case",
        }),
        drizzle(sjcPool, {
          schema,
          casing: "snake_case",
        }),
      ],
      (replicas) => replicas[replicaIndex]!,
    )
  : createPrimaryOnlyDb(primaryDb);

// Keep connectDb for backward compatibility, but just return the singleton
export const connectDb = async () => {
  return db;
};

export type Database = Awaited<ReturnType<typeof connectDb>>;

export type DatabaseWithPrimary = Database & {
  $primary?: Database;
  usePrimaryOnly?: () => Database;
};
