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
  // Exclude blocked links (robot pages, paywalls, 404s)
  let filterConditions = `l."isBlocked" = false AND l."firstSeenAt" >= $1 AND (
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
      COUNT(DISTINCT s.id) as velocity,
      SUM(
        -- Time weight * Trust weight (normalized)
        (CASE
          WHEN m."seenAt" >= NOW() - INTERVAL '24 hours' THEN 1.0
          WHEN m."seenAt" >= NOW() - INTERVAL '48 hours' THEN 0.7
          WHEN m."seenAt" >= NOW() - INTERVAL '72 hours' THEN 0.4
          ELSE 0.2
        END)
        *
        -- Trust score weight (1-10 normalized to 0.1-1.0)
        (COALESCE(s."trustScore", 5)::float / 10.0)
        *
        -- Tier weight (TIER_1=1.0, TIER_2=0.7, TIER_3=0.5, TIER_4=0.2)
        (CASE s.tier
          WHEN 'TIER_1' THEN 1.0
          WHEN 'TIER_2' THEN 0.7
          WHEN 'TIER_3' THEN 0.5
          WHEN 'TIER_4' THEN 0.2
          ELSE 0.5
        END)
      )::float as "weightedVelocity",
      EXTRACT(EPOCH FROM (NOW() - MIN(m."seenAt"))) / 3600 as "hoursSinceFirstMention",
      ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as "sourceNames"
    FROM "Link" l
    INNER JOIN "Mention" m ON m."linkId" = l.id
    INNER JOIN "Source" s ON m."sourceId" = s.id
      AND s."showOnDashboard" = true
      AND (
        s."baseDomain" IS NULL
        OR (
          l.domain != s."baseDomain"
          AND NOT (l.domain = ANY(s."internalDomains"))
        )
      )
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
  // Exclude blocked links (robot pages, paywalls, 404s)
  let filterConditions = `
    l."isBlocked" = false
    AND l."firstSeenAt" >= NOW() - INTERVAL '7 days'
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
      COUNT(DISTINCT s.id) as velocity,
      SUM(
        -- Time weight * Trust weight (normalized)
        (CASE
          WHEN m."seenAt" >= NOW() - INTERVAL '24 hours' THEN 1.0
          WHEN m."seenAt" >= NOW() - INTERVAL '48 hours' THEN 0.7
          WHEN m."seenAt" >= NOW() - INTERVAL '72 hours' THEN 0.4
          ELSE 0.2
        END)
        *
        -- Trust score weight (1-10 normalized to 0.1-1.0)
        (COALESCE(s."trustScore", 5)::float / 10.0)
        *
        -- Tier weight (TIER_1=1.0, TIER_2=0.7, TIER_3=0.5, TIER_4=0.2)
        (CASE s.tier
          WHEN 'TIER_1' THEN 1.0
          WHEN 'TIER_2' THEN 0.7
          WHEN 'TIER_3' THEN 0.5
          WHEN 'TIER_4' THEN 0.2
          ELSE 0.5
        END)
      )::float as "weightedVelocity",
      EXTRACT(EPOCH FROM (NOW() - MIN(m."seenAt"))) / 3600 as "hoursSinceFirstMention",
      ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as "sourceNames"
    FROM "Link" l
    INNER JOIN "Mention" m ON m."linkId" = l.id
    INNER JOIN "Source" s ON m."sourceId" = s.id
      AND s."showOnDashboard" = true
      AND (
        s."baseDomain" IS NULL
        OR (
          l.domain != s."baseDomain"
          AND NOT (l.domain = ANY(s."internalDomains"))
        )
      )
    LEFT JOIN "Category" c ON l."categoryId" = c.id
    LEFT JOIN "Subcategory" sc ON l."subcategoryId" = sc.id
    WHERE ${filterConditions}
    GROUP BY l.id, c.name, c.slug, sc.name
    HAVING COUNT(DISTINCT s.id) >= $${minVelocityParam}
      AND SUM(
        (CASE
          WHEN m."seenAt" >= NOW() - INTERVAL '24 hours' THEN 1.0
          WHEN m."seenAt" >= NOW() - INTERVAL '48 hours' THEN 0.7
          WHEN m."seenAt" >= NOW() - INTERVAL '72 hours' THEN 0.4
          ELSE 0.2
        END)
        *
        (COALESCE(s."trustScore", 5)::float / 10.0)
        *
        (CASE s.tier
          WHEN 'TIER_1' THEN 1.0
          WHEN 'TIER_2' THEN 0.7
          WHEN 'TIER_3' THEN 0.5
          WHEN 'TIER_4' THEN 0.2
          ELSE 0.5
        END)
      ) >= 0.3
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

interface TopVideoQueryOptions {
  minVelocity?: number;
  hoursLookback?: number;
  limit?: number;
}

/**
 * Get the top video by weighted velocity
 *
 * Returns the highest-velocity video link that:
 * - Has mediaType = 'video'
 * - Has velocity >= minVelocity (default: 2)
 * - Was first seen within hoursLookback (default: 48 hours)
 */
export async function getTopVideo(options: TopVideoQueryOptions = {}): Promise<VelocityLink | null> {
  const { minVelocity = 2, hoursLookback = 48 } = options;

  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string | null;
      fallbackTitle: string | null;
      canonicalUrl: string;
      domain: string;
      aiSummary: string | null;
      imageUrl: string | null;
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
      l."imageUrl",
      l."firstSeenAt",
      c.name as "categoryName",
      c.slug as "categorySlug",
      sc.name as "subcategoryName",
      COUNT(DISTINCT s.id) as velocity,
      SUM(
        (CASE
          WHEN m."seenAt" >= NOW() - INTERVAL '24 hours' THEN 1.0
          WHEN m."seenAt" >= NOW() - INTERVAL '48 hours' THEN 0.7
          WHEN m."seenAt" >= NOW() - INTERVAL '72 hours' THEN 0.4
          ELSE 0.2
        END)
        *
        (COALESCE(s."trustScore", 5)::float / 10.0)
        *
        (CASE s.tier
          WHEN 'TIER_1' THEN 1.0
          WHEN 'TIER_2' THEN 0.7
          WHEN 'TIER_3' THEN 0.5
          WHEN 'TIER_4' THEN 0.2
          ELSE 0.5
        END)
      )::float as "weightedVelocity",
      EXTRACT(EPOCH FROM (NOW() - MIN(m."seenAt"))) / 3600 as "hoursSinceFirstMention",
      ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as "sourceNames"
    FROM "Link" l
    INNER JOIN "Mention" m ON m."linkId" = l.id
    INNER JOIN "Source" s ON m."sourceId" = s.id
      AND s."showOnDashboard" = true
      AND (
        s."baseDomain" IS NULL
        OR (
          l.domain != s."baseDomain"
          AND NOT (l.domain = ANY(s."internalDomains"))
        )
      )
    LEFT JOIN "Category" c ON l."categoryId" = c.id
    LEFT JOIN "Subcategory" sc ON l."subcategoryId" = sc.id
    WHERE l."isBlocked" = false
      AND l."mediaType" = 'video'
      AND l."firstSeenAt" >= NOW() - INTERVAL '${hoursLookback} hours'
      AND (
        (l.title IS NOT NULL AND l.title != '') OR
        (l."fallbackTitle" IS NOT NULL AND l."fallbackTitle" != '')
      )
    GROUP BY l.id, c.name, c.slug, sc.name
    HAVING COUNT(DISTINCT s.id) >= $1
    ORDER BY "weightedVelocity" DESC, velocity DESC
    LIMIT 1
    `,
    minVelocity
  );

  if (results.length === 0) {
    return null;
  }

  const r = results[0];
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
    velocity: Number(r.velocity),
    weightedVelocity: Number(r.weightedVelocity) || 0,
    isTrending: true,
    hoursSinceFirstMention: Number(r.hoursSinceFirstMention) || 0,
    sourceNames: r.sourceNames || [],
  };
}

/**
 * Get top videos by weighted velocity
 *
 * Returns the highest-velocity video links that:
 * - Have mediaType = 'video'
 * - Have velocity >= minVelocity (default: 1)
 * - Were first seen within hoursLookback (default: 168 hours / 7 days)
 */
export async function getTopVideos(options: TopVideoQueryOptions = {}): Promise<VelocityLink[]> {
  const { minVelocity = 1, hoursLookback = 168, limit = 3 } = options;

  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string | null;
      fallbackTitle: string | null;
      canonicalUrl: string;
      domain: string;
      aiSummary: string | null;
      imageUrl: string | null;
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
      l."imageUrl",
      l."firstSeenAt",
      c.name as "categoryName",
      c.slug as "categorySlug",
      sc.name as "subcategoryName",
      COUNT(DISTINCT s.id) as velocity,
      SUM(
        (CASE
          WHEN m."seenAt" >= NOW() - INTERVAL '24 hours' THEN 1.0
          WHEN m."seenAt" >= NOW() - INTERVAL '48 hours' THEN 0.7
          WHEN m."seenAt" >= NOW() - INTERVAL '72 hours' THEN 0.4
          ELSE 0.2
        END)
        *
        (COALESCE(s."trustScore", 5)::float / 10.0)
        *
        (CASE s.tier
          WHEN 'TIER_1' THEN 1.0
          WHEN 'TIER_2' THEN 0.7
          WHEN 'TIER_3' THEN 0.5
          WHEN 'TIER_4' THEN 0.2
          ELSE 0.5
        END)
      )::float as "weightedVelocity",
      EXTRACT(EPOCH FROM (NOW() - MIN(m."seenAt"))) / 3600 as "hoursSinceFirstMention",
      ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as "sourceNames"
    FROM "Link" l
    INNER JOIN "Mention" m ON m."linkId" = l.id
    INNER JOIN "Source" s ON m."sourceId" = s.id
      AND s."showOnDashboard" = true
      AND (
        s."baseDomain" IS NULL
        OR (
          l.domain != s."baseDomain"
          AND NOT (l.domain = ANY(s."internalDomains"))
        )
      )
    LEFT JOIN "Category" c ON l."categoryId" = c.id
    LEFT JOIN "Subcategory" sc ON l."subcategoryId" = sc.id
    WHERE l."isBlocked" = false
      AND l."mediaType" = 'video'
      AND l."firstSeenAt" >= NOW() - INTERVAL '${hoursLookback} hours'
      AND (
        (l.title IS NOT NULL AND l.title != '') OR
        (l."fallbackTitle" IS NOT NULL AND l."fallbackTitle" != '')
      )
    GROUP BY l.id, c.name, c.slug, sc.name
    HAVING COUNT(DISTINCT s.id) >= $1
    ORDER BY "weightedVelocity" DESC, velocity DESC
    LIMIT $2
    `,
    minVelocity,
    limit
  );

  // Deduplicate by ID (in case JOINs produce duplicates)
  const seen = new Set<string>();
  const unique = results.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return unique.map((r) => ({
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
    isTrending: true,
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
