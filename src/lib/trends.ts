/**
 * Trend Detection Service
 *
 * Detects rising stories and tracks entity velocity changes.
 */

import prisma from "@/lib/db";
import { log } from "@/lib/logger";

// Time windows for comparison
const RECENT_WINDOW_HOURS = 24;
const COMPARISON_WINDOW_HOURS = 72;

interface TrendingLink {
  id: string;
  title: string | null;
  fallbackTitle: string | null;
  canonicalUrl: string;
  domain: string;
  velocity: number;
  recentVelocity: number; // Mentions in last 24h
  velocityAcceleration: number; // Ratio of recent to older
  categoryName: string | null;
  sourceNames: string[];
}

/**
 * Get "Rising" links - stories accelerating faster than average
 *
 * Rising = recent velocity (24h) is significantly higher than
 * velocity in prior 48h, indicating acceleration
 */
export async function getRisingLinks(limit = 10): Promise<TrendingLink[]> {
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - RECENT_WINDOW_HOURS * 60 * 60 * 1000);
  const comparisonCutoff = new Date(now.getTime() - COMPARISON_WINDOW_HOURS * 60 * 60 * 1000);

  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string | null;
      fallbackTitle: string | null;
      canonicalUrl: string;
      domain: string;
      categoryName: string | null;
      totalVelocity: bigint;
      recentVelocity: bigint;
      olderVelocity: bigint;
      sourceNames: string[] | null;
    }>
  >`
    WITH link_mentions AS (
      SELECT
        l.id,
        l.title,
        l."fallbackTitle",
        l."canonicalUrl",
        l.domain,
        c.name as "categoryName",
        COUNT(DISTINCT m."sourceId") as "totalVelocity",
        COUNT(DISTINCT CASE WHEN m."seenAt" >= ${recentCutoff} THEN m."sourceId" END) as "recentVelocity",
        COUNT(DISTINCT CASE WHEN m."seenAt" < ${recentCutoff} AND m."seenAt" >= ${comparisonCutoff} THEN m."sourceId" END) as "olderVelocity",
        ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as "sourceNames"
      FROM "Link" l
      INNER JOIN "Mention" m ON m."linkId" = l.id
      INNER JOIN "Source" s ON m."sourceId" = s.id AND s."showOnDashboard" = true
      LEFT JOIN "Category" c ON l."categoryId" = c.id
      WHERE l."isBlocked" = false
        AND l."firstSeenAt" >= ${comparisonCutoff}
        AND (l.title IS NOT NULL OR l."fallbackTitle" IS NOT NULL)
      GROUP BY l.id, c.name
    )
    SELECT *
    FROM link_mentions
    WHERE "recentVelocity" >= 2  -- At least 2 recent mentions
      AND "recentVelocity" > "olderVelocity"  -- Accelerating
    ORDER BY
      CASE WHEN "olderVelocity" = 0 THEN "recentVelocity" * 10
           ELSE "recentVelocity"::float / NULLIF("olderVelocity", 0)
      END DESC,
      "recentVelocity" DESC
    LIMIT ${limit}
  `;

  return results.map((r) => ({
    id: r.id,
    title: r.title,
    fallbackTitle: r.fallbackTitle,
    canonicalUrl: r.canonicalUrl,
    domain: r.domain,
    velocity: Number(r.totalVelocity),
    recentVelocity: Number(r.recentVelocity),
    velocityAcceleration:
      Number(r.olderVelocity) === 0
        ? Number(r.recentVelocity) * 10
        : Number(r.recentVelocity) / Number(r.olderVelocity),
    categoryName: r.categoryName,
    sourceNames: r.sourceNames || [],
  }));
}

/**
 * Update entity velocity metrics
 *
 * Calculates weekly/monthly velocity and trend direction for all entities.
 */
export async function updateEntityVelocities(): Promise<{
  updated: number;
  rising: number;
  falling: number;
}> {
  const op = log.operationStart("trends", "updateEntityVelocities");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const priorWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Get all active entities with their link counts
  const entities = await prisma.entity.findMany({
    where: { active: true },
    include: {
      links: {
        include: {
          link: {
            select: {
              firstSeenAt: true,
            },
          },
        },
      },
    },
  });

  let updated = 0;
  let rising = 0;
  let falling = 0;

  for (const entity of entities) {
    // Calculate velocity metrics
    const weekLinks = entity.links.filter(
      (le) => le.link.firstSeenAt >= weekAgo
    ).length;

    const monthLinks = entity.links.filter(
      (le) => le.link.firstSeenAt >= monthAgo
    ).length;

    const priorWeekLinks = entity.links.filter(
      (le) => le.link.firstSeenAt >= priorWeek && le.link.firstSeenAt < weekAgo
    ).length;

    // Determine trend
    let trend: string | null = null;
    if (priorWeekLinks > 0) {
      const ratio = weekLinks / priorWeekLinks;
      if (ratio >= 1.5) {
        trend = "rising";
        rising++;
      } else if (ratio <= 0.5) {
        trend = "falling";
        falling++;
      } else {
        trend = "stable";
      }
    } else if (weekLinks > 0) {
      trend = "rising"; // New activity
      rising++;
    }

    // Update entity
    await prisma.entity.update({
      where: { id: entity.id },
      data: {
        velocityWeek: weekLinks,
        velocityMonth: monthLinks,
        velocityTrend: trend,
        velocityUpdatedAt: now,
      },
    });

    updated++;
  }

  log.info("Entity velocities updated", {
    service: "trends",
    operation: "updateEntityVelocities",
    updated,
    rising,
    falling,
  });

  op.end({ updated, rising, falling });
  return { updated, rising, falling };
}

/**
 * Get top entities by velocity
 */
export async function getTopEntities(
  period: "week" | "month" = "week",
  limit = 20
): Promise<
  Array<{
    id: string;
    name: string;
    type: string;
    velocity: number;
    trend: string | null;
  }>
> {
  const orderField = period === "week" ? "velocityWeek" : "velocityMonth";

  const entities = await prisma.entity.findMany({
    where: {
      active: true,
      [orderField]: { gt: 0 },
    },
    orderBy: { [orderField]: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      type: true,
      velocityWeek: true,
      velocityMonth: true,
      velocityTrend: true,
    },
  });

  return entities.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    velocity: period === "week" ? e.velocityWeek : e.velocityMonth,
    trend: e.velocityTrend,
  }));
}

/**
 * Get rising entities (velocity trend = rising)
 */
export async function getRisingEntities(limit = 10): Promise<
  Array<{
    id: string;
    name: string;
    type: string;
    velocityWeek: number;
    velocityMonth: number;
  }>
> {
  return prisma.entity.findMany({
    where: {
      active: true,
      showInTrending: true, // Filter out entities hidden from trending
      velocityTrend: "rising",
      velocityWeek: { gt: 0 },
    },
    orderBy: { velocityWeek: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      type: true,
      velocityWeek: true,
      velocityMonth: true,
    },
  });
}
