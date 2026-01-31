/**
 * Single Source Fetch Endpoint
 *
 * Manually trigger a fetch for one specific source.
 * POST /api/admin/sources/[id]/fetch
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { fetchAndParseFeed } from "@/lib/rss";
import { canonicalizeUrl } from "@/lib/canonicalize";
import { redirectTo } from "@/lib/redirect";

// Extract base domain from URL
function getBaseDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const parts = hostname.split(".");
    if (parts.length <= 2) {
      return hostname.replace(/^www\./, "");
    }
    const twoPartTlds = ["co.uk", "com.au", "co.nz", "com.br", "co.jp"];
    const lastTwo = parts.slice(-2).join(".");
    if (twoPartTlds.includes(lastTwo)) {
      return parts.slice(-3).join(".");
    }
    return parts.slice(-2).join(".");
  } catch {
    return null;
  }
}

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

// Process a single link
async function processLink(
  url: string,
  sourceId: string,
  title?: string,
  description?: string
): Promise<{ success: boolean; linkId?: string; error?: string }> {
  try {
    if (await isBlacklisted(url)) {
      return { success: false, error: "Blacklisted" };
    }

    const result = await canonicalizeUrl(url);

    if (await isBlacklisted(result.canonicalUrl)) {
      return { success: false, error: "Canonical URL blacklisted" };
    }

    const finalTitle = title || result.title || null;
    const finalDescription = description || result.description || null;

    const link = await prisma.link.upsert({
      where: { canonicalUrl: result.canonicalUrl },
      update: {
        lastSeenAt: new Date(),
        ...(finalTitle && { title: finalTitle }),
        ...(finalDescription && { description: finalDescription }),
        ...(result.imageUrl && { imageUrl: result.imageUrl }),
        ...(result.author && { author: result.author }),
        ...(result.publishedAt && { publishedAt: result.publishedAt }),
        ...(finalTitle && {
          enrichmentStatus: "success",
          enrichmentSource: "html",
          enrichmentLastAttempt: new Date(),
        }),
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
        canonicalStatus: result.status,
        canonicalError: result.error || null,
        needsManualReview: result.status === "failed",
        enrichmentStatus: finalTitle ? "success" : "pending",
        enrichmentSource: finalTitle ? "html" : null,
        enrichmentLastAttempt: finalTitle ? new Date() : null,
      },
    });

    await prisma.mention.create({
      data: {
        linkId: link.id,
        sourceId: sourceId,
        seenAt: new Date(),
      },
    });

    return { success: true, linkId: link.id };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: true, error: "Duplicate mention" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Look up the source
  const source = await prisma.source.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      url: true,
      type: true,
      includeOwnLinks: true,
    },
  });

  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  if (source.type !== "rss" || !source.url) {
    return NextResponse.json(
      { error: "Source is not an RSS feed" },
      { status: 400 }
    );
  }

  const baseDomain = getBaseDomain(source.url);

  // Fetch the feed
  const feed = await fetchAndParseFeed(source.url, source.id, source.name);

  if (feed.error) {
    // Update error tracking
    await prisma.source.update({
      where: { id: source.id },
      data: {
        lastError: feed.error,
        lastErrorAt: new Date(),
        consecutiveErrors: { increment: 1 },
      },
    });

    return redirectTo(request, `/admin/sources?error=${encodeURIComponent(feed.error)}`);
  }

  // Clear error state on success
  await prisma.source.update({
    where: { id: source.id },
    data: {
      lastFetchedAt: new Date(),
      lastError: null,
      lastErrorAt: null,
      consecutiveErrors: 0,
    },
  });

  // Process items
  let linksProcessed = 0;
  let linksFailed = 0;

  for (const item of feed.items) {
    // Create/update SourceItem
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
    } catch {
      // Log but don't fail
    }

    // Process content links
    for (const contentLink of item.contentLinks) {
      const linkBaseDomain = getBaseDomain(contentLink);

      // Skip own-domain links if includeOwnLinks is false
      if (
        !source.includeOwnLinks &&
        linkBaseDomain &&
        baseDomain &&
        linkBaseDomain === baseDomain
      ) {
        continue;
      }

      const result = await processLink(contentLink, source.id);
      if (result.success) {
        linksProcessed++;
      } else {
        linksFailed++;
      }
    }
  }

  // Redirect back with success message
  return redirectTo(
    request,
    `/admin/sources?success=${encodeURIComponent(`${source.name}: ${feed.items.length} items, ${linksProcessed} links`)}`
  );
}
