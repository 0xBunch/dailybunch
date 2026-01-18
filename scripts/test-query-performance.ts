/**
 * Test velocity query performance
 *
 * Run with: npx tsx scripts/test-query-performance.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query"],
});

async function testQueryPerformance() {
  console.log("Testing dashboard query performance...\n");

  // Count data
  const linkCount = await prisma.link.count();
  const mentionCount = await prisma.mention.count();
  console.log(`Database: ${linkCount} links, ${mentionCount} mentions\n`);

  // Test 1: The main dashboard query (what we use in the scoreboard)
  console.log("=== Test 1: Dashboard Query (Last 48h) ===");
  const timeFilter = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const start1 = performance.now();
  const links = await prisma.link.findMany({
    where: {
      firstSeenAt: { gte: timeFilter },
      title: { not: null },
    },
    include: {
      category: true,
      subcategory: true,
      entities: {
        include: { entity: true },
      },
      mentions: {
        include: { source: true },
      },
    },
    orderBy: { firstSeenAt: "desc" },
    take: 100,
  });
  const end1 = performance.now();

  console.log(`  Query time: ${(end1 - start1).toFixed(2)}ms`);
  console.log(`  Results: ${links.length} links`);

  // Calculate velocity and sort
  const start2 = performance.now();
  const sortedLinks = links
    .map((link) => ({
      ...link,
      velocity: link.mentions.length,
      sources: [...new Set(link.mentions.map((m) => m.source.name))],
    }))
    .sort((a, b) => {
      if (b.velocity !== a.velocity) return b.velocity - a.velocity;
      return b.firstSeenAt.getTime() - a.firstSeenAt.getTime();
    });
  const end2 = performance.now();

  console.log(`  Sort time: ${(end2 - start2).toFixed(2)}ms`);
  console.log(`  Total time: ${(end2 - start1).toFixed(2)}ms`);

  // Show top 5 by velocity
  console.log(`\n  Top 5 by velocity:`);
  sortedLinks.slice(0, 5).forEach((link, i) => {
    console.log(`    ${i + 1}. "${link.title?.substring(0, 40)}..." (${link.velocity} sources)`);
  });

  // Test 2: Raw SQL for EXPLAIN ANALYZE
  console.log("\n=== Test 2: EXPLAIN ANALYZE ===");
  const explainResult = await prisma.$queryRaw<Array<{ "QUERY PLAN": string }>>`
    EXPLAIN ANALYZE
    SELECT l.id, l.title, l.domain, l."firstSeenAt", COUNT(m.id) as velocity
    FROM "Link" l
    LEFT JOIN "Mention" m ON m."linkId" = l.id
    WHERE l."firstSeenAt" >= ${timeFilter}
      AND l.title IS NOT NULL
    GROUP BY l.id
    ORDER BY velocity DESC, l."firstSeenAt" DESC
    LIMIT 100
  `;

  console.log("\nQuery Plan:");
  explainResult.forEach((row) => console.log(`  ${row["QUERY PLAN"]}`));

  // Test 3: Links browser query (all links with pagination)
  console.log("\n=== Test 3: Link Browser Query (page 1, 50 items) ===");
  const start3 = performance.now();
  const browserLinks = await prisma.link.findMany({
    include: {
      category: true,
      mentions: {
        include: { source: true },
      },
    },
    orderBy: { firstSeenAt: "desc" },
    skip: 0,
    take: 50,
  });
  const end3 = performance.now();
  console.log(`  Query time: ${(end3 - start3).toFixed(2)}ms`);
  console.log(`  Results: ${browserLinks.length} links`);

  // Test 4: Count query for pagination
  console.log("\n=== Test 4: Count Query ===");
  const start4 = performance.now();
  const totalCount = await prisma.link.count();
  const end4 = performance.now();
  console.log(`  Query time: ${(end4 - start4).toFixed(2)}ms`);
  console.log(`  Total: ${totalCount} links`);

  // Summary
  console.log("\n=== SUMMARY ===");
  const totalMs = end1 - start1 + (end3 - start3);
  console.log(`Dashboard query: ${(end1 - start1).toFixed(2)}ms`);
  console.log(`Browser query: ${(end3 - start3).toFixed(2)}ms`);
  console.log(`Target: < 500ms`);
  console.log(`Status: ${totalMs < 500 ? "✅ PASS" : "❌ NEEDS OPTIMIZATION"}`);

  await prisma.$disconnect();
}

testQueryPerformance().catch(console.error);
