import type { RedisClientType } from "redis";
import { getSharedRedisClient } from "./shared-redis";

interface RateLimitResult {
  allowed: boolean;
  count: number;
  resetAt: number;
  remaining: number;
}

/**
 * Redis-based rate limiter using fixed time windows
 * Prevents abuse by limiting requests per user within a time window
 */
export class RateLimitCache {
  private prefix: string;
  private windowMs: number;
  private limit: number;

  /**
   * @param prefix - Redis key prefix for this rate limiter
   * @param windowMs - Time window in milliseconds (default: 10 minutes)
   * @param limit - Maximum requests per window (default: 1000)
   */
  constructor(
    prefix: string = "rate-limit",
    windowMs: number = 10 * 60 * 1000,
    limit: number = 1000,
  ) {
    this.prefix = prefix;
    this.windowMs = windowMs;
    this.limit = limit;
  }

  private getRedisClient(): RedisClientType {
    return getSharedRedisClient();
  }

  private getKey(identifier: string): string {
    return `${this.prefix}:${identifier}`;
  }

  /**
   * Check and increment rate limit for a user/identifier
   * @param identifier - Unique identifier (e.g., user ID or IP address)
   * @returns RateLimitResult with allowed status and metadata
   */
  async checkAndIncrement(identifier: string): Promise<RateLimitResult> {
    try {
      const redis = this.getRedisClient();
      const key = this.getKey(identifier);
      const now = Date.now();

      // Atomically increment counter
      const count = await redis.incr(key);

      // If this is the first request in the window, set TTL
      if (count === 1) {
        const ttlSeconds = Math.ceil(this.windowMs / 1000);
        await redis.expire(key, ttlSeconds);
      }

      // Get TTL to calculate reset time
      const ttl = await redis.ttl(key);
      const resetAt = ttl > 0 ? now + ttl * 1000 : now + this.windowMs;

      // Check if limit exceeded
      if (count > this.limit) {
        return {
          allowed: false,
          count,
          resetAt,
          remaining: 0,
        };
      }

      return {
        allowed: true,
        count,
        resetAt,
        remaining: this.limit - count,
      };
    } catch (error) {
      console.error(
        `Redis rate limit error for identifier "${identifier}":`,
        error,
      );
      // On Redis failure, allow request (fail open for availability)
      return {
        allowed: true,
        count: 0,
        resetAt: Date.now() + this.windowMs,
        remaining: this.limit,
      };
    }
  }

  /**
   * Get current rate limit status without incrementing
   * @param identifier - Unique identifier
   * @returns Current count, reset time, and remaining requests
   */
  async getStatus(
    identifier: string,
  ): Promise<Omit<RateLimitResult, "allowed">> {
    try {
      const redis = this.getRedisClient();
      const key = this.getKey(identifier);
      const now = Date.now();

      const [countStr, ttl] = await Promise.all([
        redis.get(key),
        redis.ttl(key),
      ]);

      const count = countStr ? Number.parseInt(countStr, 10) : 0;
      const resetAt = ttl > 0 ? now + ttl * 1000 : now + this.windowMs;
      const remaining = Math.max(0, this.limit - count);

      return {
        count,
        resetAt,
        remaining,
      };
    } catch (error) {
      console.error(
        `Redis rate limit status error for identifier "${identifier}":`,
        error,
      );
      return {
        count: 0,
        resetAt: Date.now() + this.windowMs,
        remaining: this.limit,
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier
   * @param identifier - Unique identifier to reset
   */
  async reset(identifier: string): Promise<void> {
    try {
      const redis = this.getRedisClient();
      await redis.del(this.getKey(identifier));
    } catch (error) {
      console.error(
        `Redis rate limit reset error for identifier "${identifier}":`,
        error,
      );
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<void> {
    try {
      const redis = this.getRedisClient();
      await redis.ping();
    } catch (error) {
      throw new Error(`Redis health check failed: ${error}`);
    }
  }
}

// Default instance for API rate limiting (10 minutes, 1000 requests)
const rateLimiter = new RateLimitCache("rate-limit", 10 * 60 * 1000, 1000);

export const rateLimitCache = {
  checkAndIncrement: (identifier: string): Promise<RateLimitResult> =>
    rateLimiter.checkAndIncrement(identifier),
  getStatus: (identifier: string) => rateLimiter.getStatus(identifier),
  reset: (identifier: string): Promise<void> => rateLimiter.reset(identifier),
  healthCheck: (): Promise<void> => rateLimiter.healthCheck(),
};
