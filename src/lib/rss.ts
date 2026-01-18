/**
 * RSS Feed Parser
 *
 * Fetches and parses RSS/Atom feeds, extracting links from items.
 */

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
}

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
      links.push(href);
    }
  }

  return [...new Set(links)];
}

// Parse XML to extract feed items
function parseXml(xml: string): ParsedFeed {
  const items: FeedItem[] = [];
  let feedTitle = "";

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

  return { title: feedTitle, items };
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
  return str
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]+>/g, "") // Strip HTML tags
    .trim();
}

export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { title: "", items: [], error: `HTTP ${response.status}` };
    }

    const xml = await response.text();
    return parseXml(xml);
  } catch (error) {
    return {
      title: "",
      items: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
