/**
 * Test optimized velocity query
 *
 * Run with: npx tsx scripts/test-optimized-query.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface VelocityLink {
  id: string;
  title: string | null;
  canonicalUrl: string;
  domain: string;
  aiSummary: string | null;
  firstSeenAt: Date;
  categoryName: string | null;
  subcategoryName: string | null;
  velocity: number;
  sourceNames: string[];
}

async function getVelocityLinks(timeFilter: Date, limit: number = 100): Promise<VelocityLink[]> {
  // Step 1: Get links with velocity count using raw SQL (fast)
  const linksWithVelocity = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string | null;
      canonicalUrl: string;
      domain: string;
      aiSummary: string | null;
      firstSeenAt: Date;
      categoryId: string | null;
      subcategoryId: string | null;
      velocity: bigint;
    }>
  >`
    SELECT
      l.id,
      l.title,
      l."canonicalUrl",
      l.domain,
      l."aiSummary",
      l."firstSeenAt",
      l."categoryId",
      l."subcategoryId",
      COUNT(m.id) as velocity
    FROM "Link" l
    LEFT JOIN "Mention" m ON m."linkId" = l.id
    WHERE l."firstSeenAt" >= ${timeFilter}
      AND l.title IS NOT NULL
    GROUP BY l.id
    ORDER BY velocity DESC, l."firstSeenAt" DESC
    LIMIT ${limit}
  `;

  if (linksWithVelocity.length === 0) {
    return [];
  }

  // Step 2: Get category and subcategory names in one query
  const categoryIds = [...new Set(linksWithVelocity.filter(l => l.categoryId).map(l => l.categoryId!))];
  const subcategoryIds = [...new Set(linksWithVelocity.filter(l => l.subcategoryId).map(l => l.subcategoryId!))];

  const [categories, subcategories] = await Promise.all([
    categoryIds.length > 0
      ? prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true },
        })
      : [],
    subcategoryIds.length > 0
      ? prisma.subcategory.findMany({
          where: { id: { in: subcategoryIds } },
          select: { id: true, name: true },
        })
      : [],
  ]);

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));
  const subcategoryMap = new Map(subcategories.map(s => [s.id, s.name]));

  // Step 3: Get source names for each link (batch query)
  const linkIds = linksWithVelocity.map(l => l.id);
  const mentions = await prisma.mention.findMany({
    where: { linkId: { in: linkIds } },
    select: {
      linkId: true,
      source: { select: { name: true } },
    },
  });

  // Group sources by link
  const sourcesMap = new Map<string, Set<string>>();
  for (const mention of mentions) {
    if (!sourcesMap.has(mention.linkId)) {
      sourcesMap.set(mention.linkId, new Set());
    }
    sourcesMap.get(mention.linkId)!.add(mention.source.name);
  }

  // Step 4: Combine results
  return linksWithVelocity.map(link => ({
    id: link.id,
    title: link.title,
    canonicalUrl: link.canonicalUrl,
    domain: link.domain,
    aiSummary: link.aiSummary,
    firstSeenAt: link.firstSeenAt,
    categoryName: link.categoryId ? categoryMap.get(link.categoryId) || null : null,
    subcategoryName: link.subcategoryId ? subcategoryMap.get(link.subcategoryId) || null : null,
    velocity: Number(link.velocity),
    sourceNames: [...(sourcesMap.get(link.id) || [])],
  }));
}

async function testOptimizedQuery() {
  console.log("Testing OPTIMIZED dashboard query...\n");

  const linkCount = await prisma.link.count();
  const mentionCount = await prisma.mention.count();
  console.log(`Database: ${linkCount} links, ${mentionCount} mentions\n`);

  const timeFilter = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // Run optimized query
  console.log("=== Optimized Query (Last 48h, top 100) ===");
  const start = performance.now();
  const links = await getVelocityLinks(timeFilter, 100);
  const end = performance.now();

  console.log(`  Query time: ${(end - start).toFixed(2)}ms`);
  console.log(`  Results: ${links.length} links`);

  // Show top 5
  console.log(`\n  Top 5 by velocity:`);
  links.slice(0, 5).forEach((link, i) => {
    console.log(`    ${i + 1}. "${link.title?.substring(0, 40)}..." (${link.velocity} sources: ${link.sourceNames.join(", ")})`);
  });

  // Run 5 times to get average
  console.log("\n=== Performance Test (5 runs) ===");
  const times: number[] = [];
  for (let i = 0; i < 5; i++) {
    const s = performance.now();
    await getVelocityLinks(timeFilter, 100);
    const e = performance.now();
    times.push(e - s);
    console.log(`  Run ${i + 1}: ${(e - s).toFixed(2)}ms`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`\n  Average: ${avg.toFixed(2)}ms`);
  console.log(`  Target: < 500ms`);
  console.log(`  Status: ${avg < 500 ? "✅ PASS" : "❌ NEEDS MORE OPTIMIZATION"}`);

  await prisma.$disconnect();
}

testOptimizedQuery().catch(console.error);
