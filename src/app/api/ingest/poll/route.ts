import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { fetchAndParseFeed } from "@/lib/rss";
import { canonicalizeUrl } from "@/lib/canonicalize";

/**
 * RSS Polling Endpoint
 *
 * Fetches all active RSS sources, extracts links, and stores them.
 * Protected by CRON_SECRET header.
 */

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

// Process a single link from RSS
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

    // Upsert the link
    const link = await prisma.link.upsert({
      where: { canonicalUrl: result.canonicalUrl },
      update: {
        lastSeenAt: new Date(),
        // Only update title/description if we have better data
        ...(title && { title }),
        ...(description && { description }),
      },
      create: {
        canonicalUrl: result.canonicalUrl,
        originalUrl: url,
        domain: result.domain,
        title: title || null,
        description: description || null,
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

    return { success: true, linkId: link.id };
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

// Process a single RSS source
async function processSource(source: {
  id: string;
  name: string;
  url: string | null;
}): Promise<{
  sourceId: string;
  sourceName: string;
  itemsFound: number;
  linksProcessed: number;
  error?: string;
}> {
  if (!source.url) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      itemsFound: 0,
      linksProcessed: 0,
      error: "No URL configured",
    };
  }

  console.log(`📡 Fetching: ${source.name}`);

  const feed = await fetchAndParseFeed(source.url);

  if (feed.error) {
    console.error(`   Error: ${feed.error}`);
    return {
      sourceId: source.id,
      sourceName: source.name,
      itemsFound: 0,
      linksProcessed: 0,
      error: feed.error,
    };
  }

  console.log(`   Found ${feed.items.length} items`);

  let linksProcessed = 0;

  for (const item of feed.items) {
    // Process the main item link
    const mainResult = await processLink(
      item.link,
      source.id,
      item.title,
      item.description
    );
    if (mainResult.success) linksProcessed++;

    // Process links found within content (limit to 5 per item to avoid spam)
    const contentLinks = item.contentLinks.slice(0, 5);
    for (const contentLink of contentLinks) {
      const contentResult = await processLink(contentLink, source.id);
      if (contentResult.success) linksProcessed++;
    }
  }

  // Update last fetched timestamp
  await prisma.source.update({
    where: { id: source.id },
    data: { lastFetchedAt: new Date() },
  });

  console.log(`   Processed ${linksProcessed} links`);

  return {
    sourceId: source.id,
    sourceName: source.name,
    itemsFound: feed.items.length,
    linksProcessed,
  };
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

  console.log("🔄 Starting RSS poll...");

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

  console.log(`Found ${sources.length} active RSS sources`);

  // Process each source
  const results = await Promise.all(sources.map(processSource));

  const totalItems = results.reduce((sum, r) => sum + r.itemsFound, 0);
  const totalLinks = results.reduce((sum, r) => sum + r.linksProcessed, 0);
  const errors = results.filter((r) => r.error).length;

  console.log(`✅ Poll complete: ${totalItems} items, ${totalLinks} links, ${errors} errors`);

  return NextResponse.json({
    status: "ok",
    sourcesPolled: sources.length,
    totalItemsFound: totalItems,
    totalLinksProcessed: totalLinks,
    errors,
    results,
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
