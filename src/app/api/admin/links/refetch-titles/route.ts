/**
 * Refetch Titles API
 *
 * Re-fetches page metadata for links that are missing titles.
 * Uses Firecrawl if configured, falls back to simple HTML fetch.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { canonicalizeUrl } from "@/lib/canonicalize";
import { log } from "@/lib/logger";
import { redirectTo } from "@/lib/redirect";

// Process a batch of links at a time to avoid timeout
const BATCH_SIZE = 10;

export async function POST(request: NextRequest) {
  const op = log.operationStart("api", "admin/links/refetch-titles", {});

  try {
    // Get links without titles, ordered by most recent first
    const untitledLinks = await prisma.link.findMany({
      where: {
        title: null,
      },
      orderBy: { firstSeenAt: "desc" },
      take: BATCH_SIZE,
      select: {
        id: true,
        canonicalUrl: true,
      },
    });

    if (untitledLinks.length === 0) {
      op.end({ status: "no_work", count: 0 });
      return redirectTo(request, "/admin?message=no-untitled-links");
    }

    log.info("Refetching titles for untitled links", {
      service: "api",
      operation: "refetch-titles",
      count: untitledLinks.length,
    });

    let updated = 0;
    let failed = 0;

    for (const link of untitledLinks) {
      try {
        // Re-canonicalize to fetch fresh metadata
        const result = await canonicalizeUrl(link.canonicalUrl);

        if (result.title) {
          await prisma.link.update({
            where: { id: link.id },
            data: {
              title: result.title,
              description: result.description || undefined,
              imageUrl: result.imageUrl || undefined,
              author: result.author || undefined,
              publishedAt: result.publishedAt || undefined,
            },
          });
          updated++;
          log.info("Updated link title", {
            service: "api",
            operation: "refetch-titles",
            linkId: link.id,
            title: result.title.slice(0, 50),
          });
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
        log.warn("Failed to refetch title", {
          service: "api",
          operation: "refetch-titles",
          linkId: link.id,
          error: error instanceof Error ? error.message : "Unknown",
        });
      }
    }

    log.batchSummary("api", "refetch-titles", {
      total: untitledLinks.length,
      succeeded: updated,
      failed,
    });

    op.end({ status: "success", updated, failed });

    return redirectTo(
      request,
      `/admin?message=refetched-${updated}-of-${untitledLinks.length}`
    );
  } catch (error) {
    log.error("Refetch titles failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    op.end({ status: "failed" });
    return NextResponse.json(
      { error: "Failed to refetch titles" },
      { status: 500 }
    );
  }
}
