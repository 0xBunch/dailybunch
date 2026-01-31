/**
 * Redis Client
 *
 * Optional Redis connection for caching.
 * Falls back gracefully when REDIS_URL is not configured.
 */

import Redis from "ioredis";

const getRedisUrl = (): string | null => {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  return null;
};

const createRedisClient = (): Redis | null => {
  const url = getRedisUrl();
  if (!url) return null;

  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    client.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
    });

    return client;
  } catch (error) {
    console.warn("[Redis] Failed to create client:", error);
    return null;
  }
};

export const redis = createRedisClient();

export function isRedisConfigured(): boolean {
  return redis !== null;
}

export async function isRedisConnected(): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe Redis GET - returns null on any error
 */
export async function safeGet(key: string): Promise<string | null> {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

/**
 * Safe Redis SETEX - silently fails on error
 */
export async function safeSetEx(
  key: string,
  ttlSeconds: number,
  value: string
): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, value);
  } catch {
    // Silent failure - cache miss is acceptable
  }
}

/**
 * Safe Redis DEL - silently fails on error
 */
export async function safeDel(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // Silent failure
  }
}
