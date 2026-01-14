import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";
import { extractDomain } from "@/lib/utils";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "DailyBunch/1.0 (+https://dailybunch.com)",
  },
});

interface FetchResult {
  feedId: string;
  feedName: string;
  success: boolean;
  linksFound: number;
  linksAdded: number;
  error?: string;
}

export async function fetchRssFeed(feedId: string): Promise<FetchResult> {
  const feed = await prisma.rssFeed.findUnique({
    where: { id: feedId },
  });

  if (!feed) {
    return {
      feedId,
      feedName: "Unknown",
      success: false,
      linksFound: 0,
      linksAdded: 0,
      error: "Feed not found",
    };
  }

  try {
    const parsed = await parser.parseURL(feed.url);
    const items = parsed.items || [];
    let linksAdded = 0;

    for (const item of items) {
      const url = item.link;
      if (!url) continue;

      // Normalize URL
      const normalizedUrl = normalizeUrl(url);
      if (!normalizedUrl) continue;

      const title = item.title || "Untitled";
      const description = item.contentSnippet || item.content?.slice(0, 500) || "";
      const domain = extractDomain(normalizedUrl);

      try {
        // Upsert link
        const link = await prisma.link.upsert({
          where: { url: normalizedUrl },
          create: {
            url: normalizedUrl,
            title,
            description,
            domain,
            status: "APPROVED", // Auto-approve RSS links
            firstSeenAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          },
          update: {
            // Only update if the existing record has no description
            description: description || undefined,
          },
        });

        // Create mention record
        await prisma.mention.upsert({
          where: {
            linkId_sourceType_sourceId: {
              linkId: link.id,
              sourceType: "RSS",
              sourceId: feedId,
            },
          },
          create: {
            linkId: link.id,
            sourceType: "RSS",
            sourceId: feedId,
            mentionedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          },
          update: {},
        });

        linksAdded++;
      } catch (error) {
        // Skip duplicates and other errors
        console.error(`Error processing item ${url}:`, error);
      }
    }

    // Update feed status
    await prisma.rssFeed.update({
      where: { id: feedId },
      data: {
        lastFetchedAt: new Date(),
        lastError: null,
      },
    });

    return {
      feedId,
      feedName: feed.name,
      success: true,
      linksFound: items.length,
      linksAdded,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Update feed with error
    await prisma.rssFeed.update({
      where: { id: feedId },
      data: {
        lastError: errorMessage,
      },
    });

    return {
      feedId,
      feedName: feed.name,
      success: false,
      linksFound: 0,
      linksAdded: 0,
      error: errorMessage,
    };
  }
}

export async function fetchAllRssFeeds(): Promise<FetchResult[]> {
  const feeds = await prisma.rssFeed.findMany({
    where: { isActive: true },
  });

  const results: FetchResult[] = [];

  for (const feed of feeds) {
    const result = await fetchRssFeed(feed.id);
    results.push(result);

    // Small delay between fetches to be nice to servers
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

function normalizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Remove tracking parameters
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "ref",
      "source",
    ];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));

    // Remove trailing slashes
    let normalized = parsed.toString();
    if (normalized.endsWith("/") && !normalized.endsWith("//")) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    return null;
  }
}

// Default RSS feeds to seed the database
export const defaultFeeds = [
  {
    name: "Hacker News",
    url: "https://news.ycombinator.com/rss",
    description: "Hacker News front page",
  },
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    description: "Technology news and analysis",
  },
  {
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    description: "Technology news and information",
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    description: "Technology, science, art, and culture",
  },
  {
    name: "Lobsters",
    url: "https://lobste.rs/rss",
    description: "Computing-focused community",
  },
];

export async function seedDefaultFeeds(): Promise<number> {
  let added = 0;

  for (const feed of defaultFeeds) {
    try {
      await prisma.rssFeed.upsert({
        where: { url: feed.url },
        create: feed,
        update: {},
      });
      added++;
    } catch (error) {
      console.error(`Error seeding feed ${feed.name}:`, error);
    }
  }

  return added;
}
