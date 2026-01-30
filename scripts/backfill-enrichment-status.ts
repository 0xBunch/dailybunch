/**
 * Backfill Enrichment Status
 *
 * Sets enrichmentStatus for existing links:
 * - Links with title → "success"
 * - Links without title → "pending" (to be enriched)
 *
 * Run with: npx tsx scripts/backfill-enrichment-status.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backfillEnrichmentStatus() {
  console.log("Backfilling enrichment status for existing links...\n");

  // Count current state
  const totalLinks = await prisma.link.count();
  const linksWithTitle = await prisma.link.count({
    where: { title: { not: null } },
  });
  const linksWithoutTitle = await prisma.link.count({
    where: { title: null },
  });

  console.log(`Total links: ${totalLinks}`);
  console.log(`Links with title: ${linksWithTitle}`);
  console.log(`Links without title: ${linksWithoutTitle}`);
  console.log("");

  // Update links WITH title to "success"
  const successResult = await prisma.link.updateMany({
    where: {
      title: { not: null },
      enrichmentStatus: "pending", // Only update if still pending
    },
    data: {
      enrichmentStatus: "success",
      enrichmentSource: "html", // Assume they came from HTML fetch
    },
  });

  console.log(`Marked ${successResult.count} links as enrichmentStatus="success"`);

  // Links WITHOUT title stay as "pending" (default)
  // They'll be picked up by the enrichment cron job

  console.log(`\nRemaining pending links: ${linksWithoutTitle}`);
  console.log("These will be processed by the enrichment cron job.");

  await prisma.$disconnect();
}

backfillEnrichmentStatus().catch((error) => {
  console.error("Error:", error);
  prisma.$disconnect();
  process.exit(1);
});
