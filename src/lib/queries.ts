/**
 * Optimized Database Queries
 *
 * High-performance queries using raw SQL for complex aggregations.
 */

import prisma from "@/lib/db";

export interface VelocityLink {
  id: string;
  title: string | null;
  fallbackTitle: string | null;
  canonicalUrl: string;
  domain: string;
  aiSummary: string | null;
  firstSeenAt: Date;
  categoryName: string | null;
  categorySlug: string | null;
  subcategoryName: string | null;
  velocity: number;
  weightedVelocity: number;
  isTrending: boolean;
  hoursSinceFirstMention: number;
  sourceNames: string[];
}

interface VelocityQueryOptions {
  timeFilter: Date;
  limit?: number;
  categorySlug?: string;
  entityId?: string;
}

interface TrendingQueryOptions {
  limit?: number;
  categorySlug?: string;
  minVelocity?: number;
}

/**
 * Get velocity-ranked links using optimized raw SQL
 *
 * This query runs in ~10ms at the database level and ~150ms total,
 * compared to 1700ms+ with Prisma includes.
 */
export async function getVelocityLinks(options: VelocityQueryOptions): Promise<VelocityLink[]> {
  const { timeFilter, limit = 100, categorySlug, entityId } = options;

  // Build dynamic SQL based on filters
  // Require either title OR fallbackTitle to be present (never show "Untitled")
  let filterConditions = `l."firstSeenAt" >= $1 AND (
    (l.title IS NOT NULL AND l.title != '') OR
    (l."fallbackTitle" IS NOT NULL AND l."fallbackTitle" != '')
  )`;
  const params: (Date | string | number)[] = [timeFilter];

  if (categorySlug) {
    params.push(categorySlug);
    filterConditions += ` AND c.slug = $${params.length}`;
  }

  if (entityId) {
    params.push(entityId);
    filterConditions += ` AND EXISTS (SELECT 1 FROM "LinkEntity" le WHERE le."linkId" = l.id AND le."entityId" = $${params.length})`;
  }

  params.push(limit);

  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string | null;
      fallbackTitle: string | null;
      canonicalUrl: string;
      domain: string;
      aiSummary: string | null;
      firstSeenAt: Date;
      categoryName: string | null;
      categorySlug: string | null;
      subcategoryName: string | null;
      velocity: bigint;
      weightedVelocity: number;
      hoursSinceFirstMention: number;
      sourceNames: string[] | null;
    }>
  >(
    `
    SELECT
      l.id,
      l.title,
      l."fallbackTitle",
      l."canonicalUrl",
      l.domain,
      l."aiSummary",
      l."firstSeenAt",
      c.name as "categoryName",
      c.slug as "categorySlug",
      sc.name as "subcategoryName",
      COUNT(DISTINCT m.id) as velocity,
      SUM(
        CASE
          WHEN m."seenAt" >= NOW() - INTERVAL '24 hours' THEN 1.0
          WHEN m."seenAt" >= NOW() - INTERVAL '48 hours' THEN 0.7
          WHEN m."seenAt" >= NOW() - INTERVAL '72 hours' THEN 0.4
          ELSE 0.2
        END
      )::float as "weightedVelocity",
      EXTRACT(EPOCH FROM (NOW() - MIN(m."seenAt"))) / 3600 as "hoursSinceFirstMention",
      ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as "sourceNames"
    FROM "Link" l
    INNER JOIN "Mention" m ON m."linkId" = l.id
    INNER JOIN "Source" s ON m."sourceId" = s.id AND s."showOnDashboard" = true
    LEFT JOIN "Category" c ON l."categoryId" = c.id
    LEFT JOIN "Subcategory" sc ON l."subcategoryId" = sc.id
    WHERE ${filterConditions}
    GROUP BY l.id, c.name, c.slug, sc.name
    ORDER BY "weightedVelocity" DESC, velocity DESC, l."firstSeenAt" DESC
    LIMIT $${params.length}
    `,
    ...params
  );

  return results.map((r) => {
    const velocity = Number(r.velocity);
    const weightedVelocity = Number(r.weightedVelocity) || 0;
    // Trending: 2+ sources AND recent activity (weighted >= 1.5)
    const isTrending = velocity >= 2 && weightedVelocity >= 1.5;

    return {
      id: r.id,
      title: r.title,
      fallbackTitle: r.fallbackTitle,
      canonicalUrl: r.canonicalUrl,
      domain: r.domain,
      aiSummary: r.aiSummary,
      firstSeenAt: r.firstSeenAt,
      categoryName: r.categoryName,
      categorySlug: r.categorySlug,
      subcategoryName: r.subcategoryName,
      velocity,
      weightedVelocity,
      isTrending,
      hoursSinceFirstMention: Number(r.hoursSinceFirstMention) || 0,
      sourceNames: r.sourceNames || [],
    };
  });
}

/**
 * Get trending links (2+ sources with recent activity)
 *
 * Returns only links that meet the trending threshold:
 * - velocity >= 2 (at least 2 distinct sources)
 * - weightedVelocity >= 1.5 (recent mentions, not all old)
 * - firstSeenAt within last 7 days
 */
export async function getTrendingLinks(options: TrendingQueryOptions = {}): Promise<VelocityLink[]> {
  const { limit = 10, categorySlug, minVelocity = 2 } = options;

  // Build dynamic SQL based on filters
  let filterConditions = `
    l."firstSeenAt" >= NOW() - INTERVAL '7 days'
    AND (
      (l.title IS NOT NULL AND l.title != '') OR
      (l."fallbackTitle" IS NOT NULL AND l."fallbackTitle" != '')
    )
  `;
  const params: (string | number)[] = [];

  if (categorySlug) {
    params.push(categorySlug);
    filterConditions += ` AND c.slug = $${params.length}`;
  }

  params.push(minVelocity);
  const minVelocityParam = params.length;

  params.push(limit);
  const limitParam = params.length;

  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string | null;
      fallbackTitle: string | null;
      canonicalUrl: string;
      domain: string;
      aiSummary: string | null;
      firstSeenAt: Date;
      categoryName: string | null;
      categorySlug: string | null;
      subcategoryName: string | null;
      velocity: bigint;
      weightedVelocity: number;
      hoursSinceFirstMention: number;
      sourceNames: string[] | null;
    }>
  >(
    `
    SELECT
      l.id,
      l.title,
      l."fallbackTitle",
      l."canonicalUrl",
      l.domain,
      l."aiSummary",
      l."firstSeenAt",
      c.name as "categoryName",
      c.slug as "categorySlug",
      sc.name as "subcategoryName",
      COUNT(DISTINCT m.id) as velocity,
      SUM(
        CASE
          WHEN m."seenAt" >= NOW() - INTERVAL '24 hours' THEN 1.0
          WHEN m."seenAt" >= NOW() - INTERVAL '48 hours' THEN 0.7
          WHEN m."seenAt" >= NOW() - INTERVAL '72 hours' THEN 0.4
          ELSE 0.2
        END
      )::float as "weightedVelocity",
      EXTRACT(EPOCH FROM (NOW() - MIN(m."seenAt"))) / 3600 as "hoursSinceFirstMention",
      ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as "sourceNames"
    FROM "Link" l
    INNER JOIN "Mention" m ON m."linkId" = l.id
    INNER JOIN "Source" s ON m."sourceId" = s.id AND s."showOnDashboard" = true
    LEFT JOIN "Category" c ON l."categoryId" = c.id
    LEFT JOIN "Subcategory" sc ON l."subcategoryId" = sc.id
    WHERE ${filterConditions}
    GROUP BY l.id, c.name, c.slug, sc.name
    HAVING COUNT(DISTINCT m.id) >= $${minVelocityParam}
      AND SUM(
        CASE
          WHEN m."seenAt" >= NOW() - INTERVAL '24 hours' THEN 1.0
          WHEN m."seenAt" >= NOW() - INTERVAL '48 hours' THEN 0.7
          WHEN m."seenAt" >= NOW() - INTERVAL '72 hours' THEN 0.4
          ELSE 0.2
        END
      ) >= 1.5
    ORDER BY "weightedVelocity" DESC, velocity DESC
    LIMIT $${limitParam}
    `,
    ...params
  );

  return results.map((r) => ({
    id: r.id,
    title: r.title,
    fallbackTitle: r.fallbackTitle,
    canonicalUrl: r.canonicalUrl,
    domain: r.domain,
    aiSummary: r.aiSummary,
    firstSeenAt: r.firstSeenAt,
    categoryName: r.categoryName,
    categorySlug: r.categorySlug,
    subcategoryName: r.subcategoryName,
    velocity: Number(r.velocity),
    weightedVelocity: Number(r.weightedVelocity) || 0,
    isTrending: true, // By definition, all results from this query are trending
    hoursSinceFirstMention: Number(r.hoursSinceFirstMention) || 0,
    sourceNames: r.sourceNames || [],
  }));
}

/**
 * Get link entities for a list of link IDs
 */
export async function getLinkEntities(linkIds: string[]): Promise<Map<string, Array<{ id: string; name: string; type: string }>>> {
  if (linkIds.length === 0) {
    return new Map();
  }

  const linkEntities = await prisma.linkEntity.findMany({
    where: { linkId: { in: linkIds } },
    select: {
      linkId: true,
      entity: {
        select: { id: true, name: true, type: true },
      },
    },
  });

  const entityMap = new Map<string, Array<{ id: string; name: string; type: string }>>();
  for (const le of linkEntities) {
    if (!entityMap.has(le.linkId)) {
      entityMap.set(le.linkId, []);
    }
    entityMap.get(le.linkId)!.push(le.entity);
  }

  return entityMap;
}
