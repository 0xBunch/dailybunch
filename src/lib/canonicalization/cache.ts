/**
 * URL Canonicalization Cache
 *
 * Two-tier caching strategy:
 * 1. Redis (if configured) - Fast, 7-day TTL
 * 2. Database (UrlCache) - Persistent, 30-day TTL
 *
 * Cache lookup order: Redis → Database → Resolve
 */

import { safeGet, safeSetEx, isRedisConfigured } from "../redis";
import prisma from "../db";
import { createHash } from "crypto";

// Cache TTLs
const REDIS_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const DB_TTL_DAYS = 30; // 30 days

/**
 * Generate a cache key for a URL (using MD5 hash for consistent length)
 */
function getCacheKey(url: string): string {
  const hash = createHash("md5").update(url).digest("hex");
  return `canonical:${hash}`;
}

/**
 * Result from cache lookup
 */
export interface CachedCanonical {
  canonicalUrl: string;
  redirectChain: string[];
  source: "redis" | "database" | "fresh";
}

/**
 * Get cached canonical URL for a given original URL
 * Checks Redis first, then database
 */
export async function getCachedCanonical(
  originalUrl: string
): Promise<CachedCanonical | null> {
  // 1. Check Redis first (fast)
  if (isRedisConfigured()) {
    const cacheKey = getCacheKey(originalUrl);
    const cached = await safeGet(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        return {
          canonicalUrl: data.canonicalUrl,
          redirectChain: data.redirectChain || [],
          source: "redis",
        };
      } catch {
        // Invalid cache entry, continue to DB
      }
    }
  }

  // 2. Check database (slower but persistent)
  try {
    const cached = await prisma.urlCache.findUnique({
      where: { originalUrl },
    });

    if (cached && cached.expiresAt > new Date()) {
      // Found valid cache entry, also populate Redis for next time
      if (isRedisConfigured()) {
        const cacheKey = getCacheKey(originalUrl);
        await safeSetEx(
          cacheKey,
          REDIS_TTL_SECONDS,
          JSON.stringify({
            canonicalUrl: cached.canonicalUrl,
            redirectChain: cached.redirectChain,
          })
        );
      }

      return {
        canonicalUrl: cached.canonicalUrl,
        redirectChain: cached.redirectChain,
        source: "database",
      };
    }

    // Cache entry expired, delete it
    if (cached) {
      await prisma.urlCache.delete({
        where: { id: cached.id },
      }).catch(() => {});
    }
  } catch {
    // Database error, continue without cache
  }

  return null;
}

/**
 * Store canonical URL in cache (both Redis and database)
 */
export async function setCachedCanonical(
  originalUrl: string,
  canonicalUrl: string,
  redirectChain: string[]
): Promise<void> {
  const cacheData = { canonicalUrl, redirectChain };

  // 1. Set in Redis (non-blocking)
  if (isRedisConfigured()) {
    const cacheKey = getCacheKey(originalUrl);
    safeSetEx(cacheKey, REDIS_TTL_SECONDS, JSON.stringify(cacheData)).catch(
      () => {}
    );
  }

  // 2. Upsert in database
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DB_TTL_DAYS);

    await prisma.urlCache.upsert({
      where: { originalUrl },
      create: {
        originalUrl,
        canonicalUrl,
        redirectChain,
        expiresAt,
      },
      update: {
        canonicalUrl,
        redirectChain,
        resolvedAt: new Date(),
        expiresAt,
      },
    });
  } catch {
    // Database error - cache miss is acceptable
  }
}

/**
 * Invalidate cache for a specific URL
 */
export async function invalidateCache(originalUrl: string): Promise<void> {
  // Clear from Redis
  if (isRedisConfigured()) {
    const { safeDel } = await import("../redis");
    await safeDel(getCacheKey(originalUrl));
  }

  // Clear from database
  try {
    await prisma.urlCache.delete({
      where: { originalUrl },
    });
  } catch {
    // Entry might not exist
  }
}

/**
 * Clean up expired cache entries from database
 * Should be called periodically (e.g., daily cron)
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const result = await prisma.urlCache.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  } catch {
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  expiredEntries: number;
  redisConfigured: boolean;
}> {
  const [total, expired] = await Promise.all([
    prisma.urlCache.count().catch(() => 0),
    prisma.urlCache
      .count({ where: { expiresAt: { lt: new Date() } } })
      .catch(() => 0),
  ]);

  return {
    totalEntries: total,
    expiredEntries: expired,
    redisConfigured: isRedisConfigured(),
  };
}
