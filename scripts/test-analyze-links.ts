/**
 * Test Link Analysis Flow
 *
 * Run with: npx tsx scripts/test-analyze-links.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { analyzeUnanalyzedLinks } from "../src/lib/analyze";

const prisma = new PrismaClient();

async function testAnalyze() {
  console.log("Testing link analysis flow...\n");

  // Count unanalyzed links
  const unanalyzedCount = await prisma.link.count({
    where: {
      aiAnalyzedAt: null,
      title: { not: null },
    },
  });

  console.log(`Found ${unanalyzedCount} unanalyzed links with titles\n`);

  if (unanalyzedCount === 0) {
    console.log("No links to analyze. Run RSS poll first.");
    await prisma.$disconnect();
    return;
  }

  // Analyze just 3 links for testing
  console.log("Analyzing 3 links...\n");

  const result = await analyzeUnanalyzedLinks(3);

  console.log(`✓ Analyzed: ${result.analyzed}`);
  console.log(`✗ Failed: ${result.failed}`);

  // Show the analyzed links
  const analyzedLinks = await prisma.link.findMany({
    where: {
      aiAnalyzedAt: { not: null },
    },
    include: {
      category: true,
      subcategory: true,
      entities: {
        include: { entity: true },
      },
    },
    orderBy: { aiAnalyzedAt: "desc" },
    take: 3,
  });

  console.log("\nRecently analyzed links:");
  for (const link of analyzedLinks) {
    console.log(`\n---`);
    console.log(`Title: ${link.title}`);
    console.log(`URL: ${link.canonicalUrl}`);
    console.log(`Category: ${link.category?.name || "None"}`);
    console.log(`Subcategory: ${link.subcategory?.name || "None"}`);
    console.log(`Summary: ${link.aiSummary?.substring(0, 100)}...`);
    console.log(
      `Entities: ${link.entities.map((e) => e.entity.name).join(", ") || "None"}`
    );
  }

  // Check for entity suggestions
  const suggestions = await prisma.entitySuggestion.findMany({
    where: { status: "pending" },
    take: 5,
  });

  if (suggestions.length > 0) {
    console.log(`\n\nPending entity suggestions: ${suggestions.length}`);
    for (const s of suggestions) {
      console.log(`  - ${s.name} (${s.type})`);
    }
  }

  await prisma.$disconnect();
  console.log("\n✅ Analysis test complete!");
}

testAnalyze().catch(console.error);
