/**
 * Enrichment Cron Endpoint
 *
 * Processes links with enrichmentStatus = "pending"
 * Runs the multi-tier enrichment pipeline and updates the database.
 *
 * Schedule: Every 5 minutes via Railway cron
 *
 * GET /api/cron/enrich - Process pending links
 * POST /api/cron/enrich - Same (for webhook compatibility)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { enrichLink, type LinkToEnrich } from "@/lib/enrich";
import { isBlockedTitle } from "@/lib/title-utils";

const BATCH_SIZE = 10; // Reduced to prevent timeouts - Railway has 60s limit
const MAX_RETRIES = 5;

interface EnrichmentStats {
  processed: number;
  success: number;
  fallback: number;
  failed: number;
  skipped: number;
  blocked: number;
  resetGarbage: number;
}

/**
 * Reset links that were previously enriched but have garbage titles
 * (e.g. "Please update your browser" from YouTube).
 * Sets them back to pending so the pipeline can recover real titles.
 */
async function resetGarbageTitledLinks(): Promise<number> {
  const garbageLinks = await prisma.link.findMany({
    where: {
      isBlocked: false,
      enrichmentStatus: { in: ["success", "fallback"] },
      title: { not: null },
    },
    select: { id: true, title: true, domain: true },
    take: 20,
  });

  let reset = 0;
  for (const link of garbageLinks) {
    if (!link.title) continue;
    const reason = isBlockedTitle(link.title);
    if (reason) {
      await prisma.link.update({
        where: { id: link.id },
        data: {
          title: null,
          enrichmentStatus: "pending",
          enrichmentRetryCount: 0,
        },
      });
      reset++;
      console.log(`[Enrich Cron] Reset garbage title: "${link.title}" (${link.domain})`);
    }
  }
  return reset;
}

async function processEnrichmentBatch(): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = {
    processed: 0,
    success: 0,
    fallback: 0,
    failed: 0,
    skipped: 0,
    blocked: 0,
    resetGarbage: 0,
  };

  // First, reset any previously-enriched links with garbage titles
  stats.resetGarbage = await resetGarbageTitledLinks();

  // Get pending links that haven't exceeded retry limit
  const pendingLinks = await prisma.link.findMany({
    where: {
      enrichmentStatus: "pending",
      enrichmentRetryCount: { lt: MAX_RETRIES },
    },
    orderBy: [
      { enrichmentRetryCount: "asc" }, // Prioritize fresh links
      { firstSeenAt: "desc" }, // Then newest
    ],
    take: BATCH_SIZE,
    select: {
      id: true,
      canonicalUrl: true,
      domain: true,
      title: true,
      description: true,
      enrichmentRetryCount: true,
    },
  });

  if (pendingLinks.length === 0) {
    return stats;
  }

  console.log(`[Enrich Cron] Processing ${pendingLinks.length} links...`);

  for (const link of pendingLinks) {
    stats.processed++;

    // Skip if already has a good title
    // If title is garbage (e.g. "Please update your browser"), clear it and re-enrich
    if (link.title && link.title.trim()) {
      const blockedReason = isBlockedTitle(link.title);
      if (blockedReason) {
        // Clear garbage title so enrichment pipeline can try to recover the real one
        console.log(`[Enrich Cron] Garbage title for ${link.domain}: "${link.title}" — re-enriching`);
        link.title = null;
      } else {
        await prisma.link.update({
          where: { id: link.id },
          data: {
            enrichmentStatus: "success",
            enrichmentSource: "html",
            enrichmentLastAttempt: new Date(),
          },
        });
        stats.skipped++;
        continue;
      }
    }

    try {
      // Mark as processing
      await prisma.link.update({
        where: { id: link.id },
        data: {
          enrichmentStatus: "processing",
          enrichmentLastAttempt: new Date(),
        },
      });

      // Run enrichment
      const linkToEnrich: LinkToEnrich = {
        id: link.id,
        canonicalUrl: link.canonicalUrl,
        domain: link.domain,
        title: link.title,
        description: link.description,
      };

      const result = await enrichLink(linkToEnrich);

      // Update database based on result
      if (result.status === "success") {
        // Check if the title indicates a blocked page (robot, paywall, 404)
        const blockedReason = isBlockedTitle(result.title);
        if (blockedReason) {
          await prisma.link.update({
            where: { id: link.id },
            data: {
              title: result.title,
              isBlocked: true,
              blockedReason,
              enrichmentStatus: "success",
              enrichmentSource: result.source,
              enrichmentError: null,
            },
          });
          stats.blocked++;
          console.log(`[Enrich Cron] Blocked ${link.domain}: ${blockedReason}`);
        } else {
          await prisma.link.update({
            where: { id: link.id },
            data: {
              title: result.title,
              description: result.description || link.description,
              author: result.author,
              imageUrl: result.imageUrl,
              publishedAt: result.publishedAt,
              enrichmentStatus: "success",
              enrichmentSource: result.source,
              enrichmentError: null,
            },
          });
          stats.success++;
        }
      } else if (result.status === "fallback") {
        await prisma.link.update({
          where: { id: link.id },
          data: {
            fallbackTitle: result.title,
            fallbackTitleSource: result.source,
            enrichmentStatus: "fallback",
            enrichmentSource: result.source,
            enrichmentError: null,
          },
        });
        stats.fallback++;
      } else {
        // Shouldn't happen given our pipeline, but handle it
        await prisma.link.update({
          where: { id: link.id },
          data: {
            enrichmentStatus: "pending",
            enrichmentRetryCount: link.enrichmentRetryCount + 1,
            enrichmentError: result.error || "Unknown error",
          },
        });
        stats.failed++;
      }
    } catch (error) {
      // Handle unexpected errors
      console.error(`[Enrich Cron] Error processing ${link.domain}:`, error);

      await prisma.link.update({
        where: { id: link.id },
        data: {
          enrichmentStatus: "pending",
          enrichmentRetryCount: link.enrichmentRetryCount + 1,
          enrichmentError:
            error instanceof Error ? error.message : "Unknown error",
        },
      });
      stats.failed++;
    }

    // Small delay between links (reduced from 200ms for faster throughput)
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return stats;
}

export async function GET() {
  try {
    const startTime = Date.now();
    const stats = await processEnrichmentBatch();
    const duration = Date.now() - startTime;

    // Get remaining pending count
    const remainingPending = await prisma.link.count({
      where: {
        enrichmentStatus: "pending",
        enrichmentRetryCount: { lt: MAX_RETRIES },
      },
    });

    console.log(
      `[Enrich Cron] Completed in ${duration}ms:`,
      `${stats.success} success,`,
      `${stats.fallback} fallback,`,
      `${stats.blocked} blocked,`,
      `${stats.failed} failed,`,
      `${stats.skipped} skipped,`,
      `${stats.resetGarbage} garbage reset.`,
      `${remainingPending} remaining.`
    );

    return NextResponse.json({
      status: "ok",
      ...stats,
      remainingPending,
      durationMs: duration,
    });
  } catch (error) {
    console.error("[Enrich Cron] Fatal error:", error);
    return NextResponse.json(
      { error: "Enrichment failed", message: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Support webhook-style calls
  return GET();
}
