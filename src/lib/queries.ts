/**
 * Optimized Database Queries
 *
 * High-performance queries using raw SQL for complex aggregations.
 */

import prisma from "@/lib/db";

export interface VelocityLink {
  id: string;
  title: string | null;
  canonicalUrl: string;
  domain: string;
  aiSummary: string | null;
  firstSeenAt: Date;
  categoryName: string | null;
  categorySlug: string | null;
  subcategoryName: string | null;
  velocity: number;
  sourceNames: string[];
}

interface VelocityQueryOptions {
  timeFilter: Date;
  limit?: number;
  categorySlug?: string;
  entityId?: string;
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
  // Exclude null and empty titles - these show as "Untitled" in the UI
  let filterConditions = `l."firstSeenAt" >= $1 AND l.title IS NOT NULL AND l.title != ''`;
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
      canonicalUrl: string;
      domain: string;
      aiSummary: string | null;
      firstSeenAt: Date;
      categoryName: string | null;
      categorySlug: string | null;
      subcategoryName: string | null;
      velocity: bigint;
      sourceNames: string[] | null;
    }>
  >(
    `
    SELECT
      l.id,
      l.title,
      l."canonicalUrl",
      l.domain,
      l."aiSummary",
      l."firstSeenAt",
      c.name as "categoryName",
      c.slug as "categorySlug",
      sc.name as "subcategoryName",
      COUNT(DISTINCT m.id) as velocity,
      ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as "sourceNames"
    FROM "Link" l
    INNER JOIN "Mention" m ON m."linkId" = l.id
    INNER JOIN "Source" s ON m."sourceId" = s.id AND s."showOnDashboard" = true
    LEFT JOIN "Category" c ON l."categoryId" = c.id
    LEFT JOIN "Subcategory" sc ON l."subcategoryId" = sc.id
    WHERE ${filterConditions}
    GROUP BY l.id, c.name, c.slug, sc.name
    ORDER BY velocity DESC, l."firstSeenAt" DESC
    LIMIT $${params.length}
    `,
    ...params
  );

  return results.map((r) => ({
    id: r.id,
    title: r.title,
    canonicalUrl: r.canonicalUrl,
    domain: r.domain,
    aiSummary: r.aiSummary,
    firstSeenAt: r.firstSeenAt,
    categoryName: r.categoryName,
    categorySlug: r.categorySlug,
    subcategoryName: r.subcategoryName,
    velocity: Number(r.velocity),
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
