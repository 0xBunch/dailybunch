import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";
import { processLinksFromSource } from "./links";
import { extractLinksFromHtml } from "./canonicalize";

const parser = new Parser({
  timeout: 30000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)",
  },
});

export interface RssFetchResult {
  sourceId: string;
  sourceName: string;
  itemsProcessed: number;
  linksFound: number;
  newLinks: number;
  error?: string;
}

/**
 * Fetch and process a single RSS feed
 */
export async function fetchRssFeed(
  sourceId: string
): Promise<RssFetchResult> {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
  });

  if (!source || source.type !== "RSS" || !source.url) {
    return {
      sourceId,
      sourceName: source?.name || "Unknown",
      itemsProcessed: 0,
      linksFound: 0,
      newLinks: 0,
      error: "Invalid source or missing URL",
    };
  }

  try {
    const feed = await parser.parseURL(source.url);

    // Extract links from all items
    const allLinks: Array<{ url: string; context?: string }> = [];

    for (const item of feed.items) {
      // Add the item's main link
      if (item.link) {
        allLinks.push({
          url: item.link,
          context: item.title || undefined,
        });
      }

      // Extract links from content/description
      const content = item.content || item["content:encoded"] || item.description || "";
      if (content) {
        const contentLinks = extractLinksFromHtml(content);
        for (const link of contentLinks) {
          // Skip if it's the same as the main link
          if (link !== item.link) {
            allLinks.push({
              url: link,
              context: item.title || undefined,
            });
          }
        }
      }
    }

    // Process all links
    const result = await processLinksFromSource(allLinks, sourceId);

    // Update last fetched timestamp
    await prisma.source.update({
      where: { id: sourceId },
      data: { lastFetchedAt: new Date() },
    });

    return {
      sourceId,
      sourceName: source.name,
      itemsProcessed: feed.items.length,
      linksFound: result.total,
      newLinks: result.new,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error fetching RSS feed ${source.name}:`, error);

    return {
      sourceId,
      sourceName: source.name,
      itemsProcessed: 0,
      linksFound: 0,
      newLinks: 0,
      error: errorMessage,
    };
  }
}

/**
 * Fetch all active RSS feeds
 */
export async function fetchAllRssFeeds(): Promise<{
  results: RssFetchResult[];
  totalSources: number;
  totalNewLinks: number;
  errors: number;
}> {
  const sources = await prisma.source.findMany({
    where: {
      type: "RSS",
      isActive: true,
    },
  });

  const results: RssFetchResult[] = [];
  let totalNewLinks = 0;
  let errors = 0;

  // Process feeds sequentially to avoid rate limiting
  for (const source of sources) {
    const result = await fetchRssFeed(source.id);
    results.push(result);

    if (result.error) {
      errors++;
    } else {
      totalNewLinks += result.newLinks;
    }

    // Small delay between feeds
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return {
    results,
    totalSources: sources.length,
    totalNewLinks,
    errors,
  };
}
