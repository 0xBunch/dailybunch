/**
 * Feed Preview API
 *
 * Fetches and previews an RSS feed, providing:
 * - Feed title and metadata
 * - Sample items
 * - Duplicate detection (existing sources with same URL/domain)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { fetchAndParseFeed } from "@/lib/rss";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    // Extract domain for duplicate checking
    let domain: string;
    try {
      const urlObj = new URL(normalizedUrl);
      domain = urlObj.hostname.replace(/^www\./, "");
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Check for duplicates
    const [exactMatch, domainMatches] = await Promise.all([
      // Exact URL match
      prisma.source.findFirst({
        where: { url: normalizedUrl },
        select: { id: true, name: true, url: true },
      }),
      // Domain-based matches
      prisma.source.findMany({
        where: {
          OR: [
            { baseDomain: domain },
            { url: { contains: domain } },
          ],
        },
        select: { id: true, name: true, url: true, baseDomain: true },
      }),
    ]);

    // Fetch and parse the feed
    const feed = await fetchAndParseFeed(normalizedUrl);

    if (feed.error) {
      return NextResponse.json(
        {
          error: feed.error,
          errorCode: feed.errorCode,
          duplicates: {
            exactMatch,
            domainMatches: domainMatches.filter((s) => s.id !== exactMatch?.id),
          },
        },
        { status: 422 }
      );
    }

    // Get sample items (most recent 5)
    const sampleItems = feed.items.slice(0, 5).map((item) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate?.toISOString() || null,
      linkCount: item.contentLinks.length,
    }));

    return NextResponse.json({
      feedTitle: feed.title,
      feedUrl: normalizedUrl,
      domain,
      itemCount: feed.items.length,
      sampleItems,
      duplicates: {
        exactMatch,
        domainMatches: domainMatches.filter((s) => s.id !== exactMatch?.id),
      },
    });
  } catch (error) {
    console.error("Feed preview failed:", error);
    return NextResponse.json(
      { error: "Failed to preview feed" },
      { status: 500 }
    );
  }
}
