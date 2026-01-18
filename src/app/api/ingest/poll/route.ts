/**
 * RSS Polling Endpoint
 *
 * Fetches all active RSS sources, extracts links, and stores them.
 * Protected by CRON_SECRET header.
 *
 * Error Handling:
 * - Uses fetchMultipleFeeds with retry logic
 * - Updates source error tracking in database
 * - Never fails the entire batch on individual source/link failure
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { fetchMultipleFeeds } from "@/lib/rss";
import { canonicalizeUrl } from "@/lib/canonicalize";
import { log } from "@/lib/logger";

// Check if URL matches blacklist
async function isBlacklisted(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "");

    const blacklistEntry = await prisma.blacklist.findFirst({
      where: {
        OR: [
          { type: "domain", pattern: domain },
          { type: "domain", pattern: `www.${domain}` },
          { type: "url", pattern: url },
        ],
      },
    });

    return !!blacklistEntry;
  } catch {
    return true;
  }
}

// Process a single link from RSS (never throws)
async function processLink(
  url: string,
  sourceId: string,
  title?: string,
  description?: string
): Promise<{
  success: boolean;
  linkId?: string;
  error?: string;
  status?: string;
}> {
  try {
    if (await isBlacklisted(url)) {
      return { success: false, error: "Blacklisted" };
    }

    const result = await canonicalizeUrl(url);

    if (await isBlacklisted(result.canonicalUrl)) {
      return { success: false, error: "Canonical URL blacklisted" };
    }

    // Use provided title/description, or fall back to fetched metadata
    const finalTitle = title || result.title || null;
    const finalDescription = description || result.description || null;

    // Upsert the link with status tracking
    const link = await prisma.link.upsert({
      where: { canonicalUrl: result.canonicalUrl },
      update: {
        lastSeenAt: new Date(),
        // Only update title/description if we have better data
        ...(finalTitle && { title: finalTitle }),
        ...(finalDescription && { description: finalDescription }),
        // Update image/author/publishedAt if we have them and they're missing
        ...(result.imageUrl && { imageUrl: result.imageUrl }),
        ...(result.author && { author: result.author }),
        ...(result.publishedAt && { publishedAt: result.publishedAt }),
      },
      create: {
        canonicalUrl: result.canonicalUrl,
        originalUrl: url,
        domain: result.domain,
        title: finalTitle,
        description: finalDescription,
        imageUrl: result.imageUrl || null,
        author: result.author || null,
        publishedAt: result.publishedAt || null,
        // Track canonicalization status
        canonicalStatus: result.status,
        canonicalError: result.error || null,
        needsManualReview: result.status === "failed",
      },
    });

    // Create mention
    await prisma.mention.create({
      data: {
        linkId: link.id,
        sourceId: sourceId,
        seenAt: new Date(),
      },
    });

    return {
      success: true,
      linkId: link.id,
      status: result.status,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return { success: true, error: "Duplicate mention" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(request: NextRequest) {
  // Verify cron secret (if configured)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    if (providedSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const op = log.operationStart("api", "ingest/poll", {});

  // Get all active RSS sources
  const sources = await prisma.source.findMany({
    where: {
      type: "rss",
      active: true,
    },
    select: {
      id: true,
      name: true,
      url: true,
    },
  });

  log.info("Starting RSS poll", {
    service: "api",
    operation: "ingest/poll",
    sourceCount: sources.length,
  });

  // Filter sources with valid URLs
  const validSources = sources
    .filter((s) => s.url)
    .map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url!,
    }));

  // Fetch all feeds in parallel with retry logic
  const { results: feedResults, feeds } = await fetchMultipleFeeds(validSources);

  // Update source error tracking in database
  for (const result of feedResults) {
    if (result.success) {
      // Clear error state on success
      await prisma.source.update({
        where: { id: result.sourceId },
        data: {
          lastFetchedAt: new Date(),
          lastError: null,
          lastErrorAt: null,
          consecutiveErrors: 0,
        },
      });
    } else {
      // Track error state
      await prisma.source.update({
        where: { id: result.sourceId },
        data: {
          lastError: result.error,
          lastErrorAt: new Date(),
          consecutiveErrors: { increment: 1 },
        },
      });
    }
  }

  // Process links from successful feeds
  const linkResults: Array<{
    sourceId: string;
    sourceName: string;
    linksProcessed: number;
    linksFailed: number;
  }> = [];

  for (const source of validSources) {
    const feed = feeds.get(source.id);
    if (!feed || feed.error) {
      continue;
    }

    let linksProcessed = 0;
    let linksFailed = 0;

    for (const item of feed.items) {
      // Create/update SourceItem for this RSS entry (for Sources tab)
      // Note: linkCount is only the content links, not the item itself
      const linkCount = item.contentLinks.length;
      try {
        await prisma.sourceItem.upsert({
          where: { url: item.link },
          update: {
            title: item.title,
            description: item.description,
            pubDate: item.pubDate,
            linkCount,
          },
          create: {
            sourceId: source.id,
            url: item.link,
            title: item.title,
            description: item.description,
            pubDate: item.pubDate,
            linkCount,
          },
        });
      } catch (error) {
        // Log but don't fail - SourceItem storage is secondary
        log.warn("Failed to store SourceItem", {
          service: "api",
          operation: "ingest/poll",
          url: item.link,
          error: error instanceof Error ? error.message : "Unknown",
        });
      }

      // Process links found within content (NOT the RSS item URL itself)
      // The RSS item URL is stored as a SourceItem, not a Link
      // Links are the external articles that sources mention
      for (const contentLink of item.contentLinks) {
        const contentResult = await processLink(contentLink, source.id);
        if (contentResult.success) {
          linksProcessed++;
        } else {
          linksFailed++;
        }
      }
    }

    linkResults.push({
      sourceId: source.id,
      sourceName: source.name,
      linksProcessed,
      linksFailed,
    });
  }

  // Calculate totals
  const totalItemsFound = feedResults.reduce((sum, r) => sum + r.itemCount, 0);
  const totalLinksProcessed = linkResults.reduce((sum, r) => sum + r.linksProcessed, 0);
  const totalLinksFailed = linkResults.reduce((sum, r) => sum + r.linksFailed, 0);
  const sourcesSucceeded = feedResults.filter((r) => r.success).length;
  const sourcesFailed = feedResults.filter((r) => !r.success).length;

  log.batchSummary("api", "ingest/poll", {
    total: sources.length,
    succeeded: sourcesSucceeded,
    failed: sourcesFailed,
  }, {
    totalItemsFound,
    totalLinksProcessed,
    totalLinksFailed,
  });

  op.end({
    sourcesPolled: sources.length,
    sourcesSucceeded,
    sourcesFailed,
    totalLinksProcessed,
  });

  return NextResponse.json({
    status: "ok",
    sourcesPolled: sources.length,
    sourcesSucceeded,
    sourcesFailed,
    totalItemsFound,
    totalLinksProcessed,
    totalLinksFailed,
    feedResults: feedResults.map((r) => ({
      sourceId: r.sourceId,
      sourceName: r.sourceName,
      success: r.success,
      itemCount: r.itemCount,
      error: r.error,
      errorCode: r.errorCode,
    })),
    linkResults,
  });
}

// GET for manual testing (no auth required in dev)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Use POST" }, { status: 405 });
  }

  // In development, allow GET for easy testing
  return POST(request);
}
