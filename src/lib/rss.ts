/**
 * RSS Feed Parser
 *
 * Fetches and parses RSS/Atom feeds, extracting links from items.
 *
 * Error Handling:
 * - Retry on network failures
 * - Detailed error reporting for source tracking
 * - Never breaks batch on individual feed failure
 */

import { Errors, wrapError, type ErrorContext } from "./errors";
import { log } from "./logger";
import { withRetry, RetryPresets } from "./retry";
import { decodeHtmlEntities } from "./title-utils";

// Request timeout in ms
const FEED_TIMEOUT = 15000;

export interface FeedItem {
  title: string;
  link: string;
  pubDate?: Date;
  description?: string;
  contentLinks: string[]; // Links found within content
}

export interface ParsedFeed {
  title: string;
  items: FeedItem[];
  error?: string;
  errorCode?: string;
}

// Patterns to skip when extracting links
const SKIP_URL_PATTERNS = [
  // Image files
  /\.(jpg|jpeg|png|gif|webp|heic|svg|ico|bmp)(\?|$)/i,
  // CDN/image hosting
  /substackcdn\.com/i,
  /substack-post-media\.s3/i,
  /cloudinary\.com.*\/image\//i,
  // Subscription/auth pages
  /\/subscribe\/?(\?|$)/i,
  /\/login\/?(\?|$)/i,
  /\/account\/?(\?|$)/i,
  /\/settings\/?(\?|$)/i,
  /\/email-capture/i,
  // Social media (not content we want to track)
  /linkedin\.com/i, // All LinkedIn - profiles, posts, everything
  /twitter\.com\/(?!.*\/status\/)/i, // Twitter profiles but not tweets
  /instagram\.com\/[^/]+\/?$/i, // Instagram profiles but not posts
  // Email tracking pixels/domains
  /trk\.email\./i,
  /click\.email\./i,
  /email\.mg\./i,
  /list-manage\.com/i,
  // Font/asset files
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
  // Newsletter platform domains (these are sources, not links)
  // We want to track articles MENTIONED in newsletters, not the newsletters themselves
  /substack\.com\/p\//i, // Substack posts
  /beehiiv\.com/i, // Beehiiv newsletters
  /buttondown\.email/i, // Buttondown newsletters
  /convertkit\.com/i, // ConvertKit newsletters
  /mailchi\.mp/i, // Mailchimp campaign links
  /campaign-archive\.com/i, // Mailchimp archives
];

// Extract links from HTML content
function extractLinksFromContent(content: string): string[] {
  const linkRegex = /href=["']([^"']+)["']/gi;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[1];
    if (
      href &&
      !href.startsWith("mailto:") &&
      !href.startsWith("javascript:") &&
      !href.startsWith("#") &&
      (href.startsWith("http://") || href.startsWith("https://"))
    ) {
      // Check against skip patterns
      const shouldSkip = SKIP_URL_PATTERNS.some((pattern) => pattern.test(href));
      if (!shouldSkip) {
        links.push(href);
      }
    }
  }

  return [...new Set(links)];
}

// Parse XML to extract feed items
function parseXml(xml: string, context: ErrorContext): ParsedFeed {
  const items: FeedItem[] = [];
  let feedTitle = "";

  try {
    // Try to extract feed title
    const titleMatch = xml.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      feedTitle = titleMatch[1].trim();
    }

    // RSS 2.0 format: <item>...</item>
    const rssItemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = rssItemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const item = parseRssItem(itemXml);
      if (item) {
        items.push(item);
      }
    }

    // Atom format: <entry>...</entry>
    if (items.length === 0) {
      const atomEntryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
      while ((match = atomEntryRegex.exec(xml)) !== null) {
        const entryXml = match[1];
        const item = parseAtomEntry(entryXml);
        if (item) {
          items.push(item);
        }
      }
    }

    // Log if no items found (might indicate parse issue)
    if (items.length === 0 && xml.length > 100) {
      log.warn("No items found in feed", {
        ...context,
        feedTitle,
        xmlLength: xml.length,
        xmlPreview: xml.slice(0, 200),
      });
    }

    return { title: feedTitle, items };
  } catch (error) {
    const parseError = Errors.xmlParseFailed(
      { ...context, feedTitle },
      error instanceof Error ? error : undefined
    );
    log.error(parseError);

    return {
      title: feedTitle,
      items,
      error: parseError.message,
      errorCode: parseError.code,
    };
  }
}

function parseRssItem(xml: string): FeedItem | null {
  // Extract title
  const titleMatch = xml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
  const title = titleMatch ? cleanCdata(titleMatch[1]).trim() : "";

  // Extract link (try multiple patterns)
  let link = "";
  const linkMatch = xml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
  if (linkMatch) {
    link = cleanCdata(linkMatch[1]).trim();
  }

  // Try guid if no link
  if (!link) {
    const guidMatch = xml.match(/<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/i);
    if (guidMatch) {
      const guid = cleanCdata(guidMatch[1]).trim();
      if (guid.startsWith("http")) {
        link = guid;
      }
    }
  }

  if (!link) return null;

  // Extract pubDate
  const pubDateMatch = xml.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i);
  const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : undefined;

  // Extract description/content for additional links
  const descMatch = xml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
  const contentMatch = xml.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);

  const content = contentMatch ? contentMatch[1] : descMatch ? descMatch[1] : "";
  const contentLinks = extractLinksFromContent(content);

  return {
    title,
    link,
    pubDate: pubDate && !isNaN(pubDate.getTime()) ? pubDate : undefined,
    description: descMatch ? cleanCdata(descMatch[1]).substring(0, 500) : undefined,
    contentLinks,
  };
}

function parseAtomEntry(xml: string): FeedItem | null {
  // Extract title
  const titleMatch = xml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
  const title = titleMatch ? cleanCdata(titleMatch[1]).trim() : "";

  // Extract link (Atom uses href attribute)
  let link = "";
  const linkMatch = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
  if (linkMatch) {
    link = linkMatch[1];
  }

  // Try alternate link
  if (!link) {
    const altLinkMatch = xml.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
    if (altLinkMatch) {
      link = altLinkMatch[1];
    }
  }

  if (!link) return null;

  // Extract updated/published date
  const updatedMatch = xml.match(/<updated[^>]*>([^<]+)<\/updated>/i);
  const publishedMatch = xml.match(/<published[^>]*>([^<]+)<\/published>/i);
  const dateStr = updatedMatch?.[1] || publishedMatch?.[1];
  const pubDate = dateStr ? new Date(dateStr) : undefined;

  // Extract content/summary for additional links
  const contentMatch = xml.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i);
  const summaryMatch = xml.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i);

  const content = contentMatch ? contentMatch[1] : summaryMatch ? summaryMatch[1] : "";
  const contentLinks = extractLinksFromContent(content);

  return {
    title,
    link,
    pubDate: pubDate && !isNaN(pubDate.getTime()) ? pubDate : undefined,
    description: summaryMatch ? cleanCdata(summaryMatch[1]).substring(0, 500) : undefined,
    contentLinks,
  };
}

function cleanCdata(str: string): string {
  return decodeHtmlEntities(
    str
      .replace(/<!\[CDATA\[/g, "")
      .replace(/\]\]>/g, "")
      .replace(/<[^>]+>/g, "") // Strip HTML tags
      .trim()
  );
}

/**
 * Fetch a single RSS feed with retry logic
 */
async function fetchFeedWithRetry(
  url: string,
  context: ErrorContext
): Promise<string> {
  return withRetry(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FEED_TIMEOUT);

      const startTime = performance.now();

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)",
            Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
          },
        });

        clearTimeout(timeoutId);
        const durationMs = Math.round(performance.now() - startTime);

        log.externalCall("rss", "GET", url, durationMs, response.status);

        if (!response.ok) {
          if (response.status === 429) {
            throw Errors.rateLimit(context);
          } else if (response.status >= 500) {
            throw Errors.serverError(context, new Error(`HTTP ${response.status}`));
          } else {
            throw Errors.badRequest(context, `HTTP ${response.status}`);
          }
        }

        return await response.text();
      } catch (error) {
        clearTimeout(timeoutId);
        throw wrapError(error, context);
      }
    },
    context,
    RetryPresets.rss
  );
}

/**
 * Fetch and parse an RSS/Atom feed
 *
 * Graceful degradation: returns empty items array with error on failure.
 */
export async function fetchAndParseFeed(
  url: string,
  sourceId?: string,
  sourceName?: string
): Promise<ParsedFeed> {
  const context = {
    service: "rss",
    operation: "fetchAndParseFeed",
    url,
    sourceId,
    sourceName,
  };

  const op = log.operationStart("rss", "fetchAndParseFeed", {
    url: url.slice(0, 80),
    sourceName,
  });

  try {
    const xml = await fetchFeedWithRetry(url, context);
    const feed = parseXml(xml, context);

    op.end({
      status: feed.error ? "partial" : "success",
      itemCount: feed.items.length,
      feedTitle: feed.title?.slice(0, 50),
    });

    return feed;
  } catch (error) {
    const serviceError = wrapError(error, context);
    log.error(serviceError);

    op.end({ status: "failed", errorCode: serviceError.code });

    return {
      title: "",
      items: [],
      error: serviceError.message,
      errorCode: serviceError.code,
    };
  }
}

/**
 * Result of processing a single source
 */
export interface SourceFetchResult {
  sourceId: string;
  sourceName: string;
  success: boolean;
  itemCount: number;
  error?: string;
  errorCode?: string;
}

/**
 * Fetch multiple feeds in parallel
 *
 * Never throws - each feed is processed independently.
 * Failed feeds return with error info for source tracking.
 */
export async function fetchMultipleFeeds(
  sources: Array<{ id: string; name: string; url: string }>
): Promise<{
  results: SourceFetchResult[];
  feeds: Map<string, ParsedFeed>;
}> {
  const op = log.operationStart("rss", "fetchMultipleFeeds", {
    sourceCount: sources.length,
  });

  const results: SourceFetchResult[] = [];
  const feeds = new Map<string, ParsedFeed>();

  // Fetch all feeds in parallel
  const fetchPromises = sources.map(async (source) => {
    const feed = await fetchAndParseFeed(source.url, source.id, source.name);
    feeds.set(source.id, feed);

    return {
      sourceId: source.id,
      sourceName: source.name,
      success: !feed.error,
      itemCount: feed.items.length,
      error: feed.error,
      errorCode: feed.errorCode,
    };
  });

  const fetchResults = await Promise.all(fetchPromises);
  results.push(...fetchResults);

  // Log batch summary
  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const totalItems = results.reduce((sum, r) => sum + r.itemCount, 0);

  log.batchSummary("rss", "fetchMultipleFeeds", {
    total: sources.length,
    succeeded,
    failed,
  }, { totalItems });

  op.end({ succeeded, failed, totalItems });

  return { results, feeds };
}
