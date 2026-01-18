/**
 * Test single raw SQL query approach
 *
 * Run with: npx tsx scripts/test-single-query.ts
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

async function getVelocityLinksSingleQuery(timeFilter: Date, limit: number = 100): Promise<VelocityLink[]> {
  // Single query with all JOINs - aggregate sources using array_agg
  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string | null;
      canonicalUrl: string;
      domain: string;
      aiSummary: string | null;
      firstSeenAt: Date;
      categoryName: string | null;
      subcategoryName: string | null;
      velocity: bigint;
      sourceNames: string[] | null;
    }>
  >`
    SELECT
      l.id,
      l.title,
      l."canonicalUrl",
      l.domain,
      l."aiSummary",
      l."firstSeenAt",
      c.name as "categoryName",
      sc.name as "subcategoryName",
      COUNT(DISTINCT m.id) as velocity,
      ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as "sourceNames"
    FROM "Link" l
    LEFT JOIN "Mention" m ON m."linkId" = l.id
    LEFT JOIN "Source" s ON m."sourceId" = s.id
    LEFT JOIN "Category" c ON l."categoryId" = c.id
    LEFT JOIN "Subcategory" sc ON l."subcategoryId" = sc.id
    WHERE l."firstSeenAt" >= ${timeFilter}
      AND l.title IS NOT NULL
    GROUP BY l.id, c.name, sc.name
    ORDER BY velocity DESC, l."firstSeenAt" DESC
    LIMIT ${limit}
  `;

  return results.map(r => ({
    id: r.id,
    title: r.title,
    canonicalUrl: r.canonicalUrl,
    domain: r.domain,
    aiSummary: r.aiSummary,
    firstSeenAt: r.firstSeenAt,
    categoryName: r.categoryName,
    subcategoryName: r.subcategoryName,
    velocity: Number(r.velocity),
    sourceNames: r.sourceNames || [],
  }));
}

async function testSingleQuery() {
  console.log("Testing SINGLE QUERY approach...\n");

  const linkCount = await prisma.link.count();
  const mentionCount = await prisma.mention.count();
  console.log(`Database: ${linkCount} links, ${mentionCount} mentions\n`);

  const timeFilter = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // Warm up
  await getVelocityLinksSingleQuery(timeFilter, 100);

  // Run query
  console.log("=== Single Query (Last 48h, top 100) ===");
  const start = performance.now();
  const links = await getVelocityLinksSingleQuery(timeFilter, 100);
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
    await getVelocityLinksSingleQuery(timeFilter, 100);
    const e = performance.now();
    times.push(e - s);
    console.log(`  Run ${i + 1}: ${(e - s).toFixed(2)}ms`);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`\n  Average: ${avg.toFixed(2)}ms`);
  console.log(`  Target: < 500ms`);
  console.log(`  Status: ${avg < 500 ? "✅ PASS" : "❌ NEEDS MORE OPTIMIZATION"}`);

  // EXPLAIN ANALYZE
  console.log("\n=== EXPLAIN ANALYZE ===");
  const explain = await prisma.$queryRaw<Array<{ "QUERY PLAN": string }>>`
    EXPLAIN ANALYZE
    SELECT
      l.id,
      l.title,
      l."canonicalUrl",
      l.domain,
      l."aiSummary",
      l."firstSeenAt",
      c.name as "categoryName",
      sc.name as "subcategoryName",
      COUNT(DISTINCT m.id) as velocity,
      ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as "sourceNames"
    FROM "Link" l
    LEFT JOIN "Mention" m ON m."linkId" = l.id
    LEFT JOIN "Source" s ON m."sourceId" = s.id
    LEFT JOIN "Category" c ON l."categoryId" = c.id
    LEFT JOIN "Subcategory" sc ON l."subcategoryId" = sc.id
    WHERE l."firstSeenAt" >= ${timeFilter}
      AND l.title IS NOT NULL
    GROUP BY l.id, c.name, sc.name
    ORDER BY velocity DESC, l."firstSeenAt" DESC
    LIMIT 100
  `;

  explain.forEach(row => console.log(row["QUERY PLAN"]));

  await prisma.$disconnect();
}

testSingleQuery().catch(console.error);
