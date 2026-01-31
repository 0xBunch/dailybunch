/**
 * Backfill Canonical URLs
 *
 * This script re-canonicalizes all existing links using the new canonicalization
 * module. It processes links in batches and tracks changes for reporting.
 *
 * Usage:
 *   npx tsx scripts/backfill-canonical.ts
 *   npx tsx scripts/backfill-canonical.ts --dry-run
 *   npx tsx scripts/backfill-canonical.ts --batch-size=50
 */

import { PrismaClient } from "@prisma/client";
import {
  canonicalizeUrl,
  normalizeUrl,
} from "../src/lib/canonicalization";

const prisma = new PrismaClient();

// Configuration
const DEFAULT_BATCH_SIZE = 100;
const DELAY_BETWEEN_BATCHES_MS = 1000;

interface BackfillStats {
  total: number;
  processed: number;
  changed: number;
  duplicatesFound: number;
  errors: number;
  startTime: Date;
}

interface ChangeRecord {
  linkId: string;
  oldUrl: string;
  newUrl: string;
  reason: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): { dryRun: boolean; batchSize: number } {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    batchSize: parseInt(
      args.find((a) => a.startsWith("--batch-size="))?.split("=")[1] ||
        String(DEFAULT_BATCH_SIZE)
    ),
  };
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process a single link
 */
async function processLink(
  link: { id: string; canonicalUrl: string; originalUrl: string | null },
  dryRun: boolean,
  stats: BackfillStats,
  changes: ChangeRecord[]
): Promise<void> {
  try {
    // Get the URL to canonicalize (prefer original if available)
    const urlToProcess = link.originalUrl || link.canonicalUrl;

    // Re-canonicalize
    const result = await canonicalizeUrl(urlToProcess);

    // Check if canonical URL changed
    const oldNormalized = normalizeUrl(link.canonicalUrl);
    const newNormalized = result.canonicalUrl;

    if (oldNormalized !== newNormalized) {
      changes.push({
        linkId: link.id,
        oldUrl: link.canonicalUrl,
        newUrl: newNormalized,
        reason: result.status === "success" ? "re-resolved" : "normalized",
      });

      if (!dryRun) {
        // Check for duplicates before updating
        const existing = await prisma.link.findUnique({
          where: { canonicalUrl: newNormalized },
        });

        if (existing && existing.id !== link.id) {
          // This would create a duplicate - need to merge
          stats.duplicatesFound++;
          console.log(
            `  DUPLICATE: ${link.id} -> ${existing.id} (${newNormalized})`
          );

          // Merge mentions to the existing link
          await prisma.mention.updateMany({
            where: { linkId: link.id },
            data: { linkId: existing.id },
          });

          // Delete the duplicate link
          await prisma.link.delete({
            where: { id: link.id },
          });
        } else {
          // Safe to update
          await prisma.link.update({
            where: { id: link.id },
            data: {
              canonicalUrl: newNormalized,
              domain: result.domain,
              // Store original URL if not already stored
              originalUrl: link.originalUrl || link.canonicalUrl,
            },
          });
        }
      }

      stats.changed++;
    }

    stats.processed++;
  } catch (error) {
    stats.errors++;
    console.error(`  ERROR processing ${link.id}:`, error);
  }
}

/**
 * Main backfill function
 */
async function backfill(): Promise<void> {
  const { dryRun, batchSize } = parseArgs();

  console.log("=".repeat(60));
  console.log("URL Canonicalization Backfill");
  console.log("=".repeat(60));
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Batch size: ${batchSize}`);
  console.log("");

  // Get total count
  const totalLinks = await prisma.link.count();
  console.log(`Total links to process: ${totalLinks}`);
  console.log("");

  const stats: BackfillStats = {
    total: totalLinks,
    processed: 0,
    changed: 0,
    duplicatesFound: 0,
    errors: 0,
    startTime: new Date(),
  };

  const changes: ChangeRecord[] = [];
  let offset = 0;

  while (offset < totalLinks) {
    // Fetch batch
    const links = await prisma.link.findMany({
      select: {
        id: true,
        canonicalUrl: true,
        originalUrl: true,
      },
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: batchSize,
    });

    if (links.length === 0) break;

    console.log(
      `Processing batch ${Math.floor(offset / batchSize) + 1} (${offset + 1}-${offset + links.length})...`
    );

    // Process batch
    for (const link of links) {
      await processLink(link, dryRun, stats, changes);
    }

    // Progress update
    const progress = ((stats.processed / stats.total) * 100).toFixed(1);
    console.log(
      `  Progress: ${progress}% | Changed: ${stats.changed} | Duplicates: ${stats.duplicatesFound} | Errors: ${stats.errors}`
    );

    offset += batchSize;

    // Delay between batches to avoid overwhelming the server
    if (offset < totalLinks) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  // Final report
  const duration = (Date.now() - stats.startTime.getTime()) / 1000;

  console.log("");
  console.log("=".repeat(60));
  console.log("BACKFILL COMPLETE");
  console.log("=".repeat(60));
  console.log(`Duration: ${duration.toFixed(1)}s`);
  console.log(`Total processed: ${stats.processed}`);
  console.log(`URLs changed: ${stats.changed}`);
  console.log(`Duplicates merged: ${stats.duplicatesFound}`);
  console.log(`Errors: ${stats.errors}`);
  console.log("");

  if (changes.length > 0) {
    console.log("Changes made:");
    console.log("-".repeat(60));
    for (const change of changes.slice(0, 20)) {
      console.log(`  ${change.linkId}:`);
      console.log(`    OLD: ${change.oldUrl}`);
      console.log(`    NEW: ${change.newUrl}`);
      console.log(`    REASON: ${change.reason}`);
    }
    if (changes.length > 20) {
      console.log(`  ... and ${changes.length - 20} more`);
    }
  }

  if (dryRun) {
    console.log("");
    console.log("This was a DRY RUN. No changes were made.");
    console.log("Run without --dry-run to apply changes.");
  }
}

// Run
backfill()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
