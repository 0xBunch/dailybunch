/**
 * Firecrawl Service
 *
 * Extracts metadata (title, description, og:image) from URLs.
 * Handles JS rendering and anti-bot protection better than simple fetch.
 *
 * Error Handling:
 * - Graceful degradation: returns partial metadata on failure
 * - No retry (metadata fetch is optional enhancement)
 * - Logs all attempts for debugging
 */

import FirecrawlApp from "@mendable/firecrawl-js";
import { log } from "./logger";

// Initialize Firecrawl client
const firecrawl = process.env.FIRECRAWL_API_KEY
  ? new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
  : null;

export interface PageMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  author?: string;
  publishedAt?: Date;
}

/**
 * Extract metadata from a URL using Firecrawl
 *
 * Falls back gracefully if Firecrawl is not configured or fails.
 */
export async function fetchMetadataWithFirecrawl(
  url: string
): Promise<PageMetadata> {
  const context = { service: "firecrawl", operation: "scrapeUrl", url };

  // If Firecrawl not configured, return empty
  if (!firecrawl) {
    log.warn("Firecrawl not configured, skipping metadata fetch", context);
    return {};
  }

  const startTime = performance.now();

  try {
    const result = await firecrawl.scrapeUrl(url, {
      formats: ["html"],
      onlyMainContent: false,
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (!result.success) {
      log.externalCall("firecrawl", "scrape", url, durationMs, "error", {
        error: result.error || "Unknown error",
      });
      return {};
    }

    log.externalCall("firecrawl", "scrape", url, durationMs, 200);

    // Extract metadata from the result
    const metadata: PageMetadata = {};

    // Firecrawl returns metadata in the result
    if (result.metadata) {
      metadata.title = result.metadata.title || result.metadata.ogTitle;
      metadata.description =
        result.metadata.description || result.metadata.ogDescription;
      metadata.imageUrl = result.metadata.ogImage;

      // Try to extract author
      if (result.metadata.author) {
        metadata.author = result.metadata.author;
      }

      // Try to extract publish date
      if (result.metadata.publishedTime) {
        const parsed = new Date(result.metadata.publishedTime);
        if (!isNaN(parsed.getTime())) {
          metadata.publishedAt = parsed;
        }
      }
    }

    // Clean up extracted values
    if (metadata.title) {
      metadata.title = metadata.title.trim().slice(0, 500);
    }
    if (metadata.description) {
      metadata.description = metadata.description.trim().slice(0, 1000);
    }
    if (metadata.author) {
      metadata.author = metadata.author.trim().slice(0, 200);
    }

    log.info("Metadata extracted", {
      ...context,
      hasTitle: !!metadata.title,
      hasImage: !!metadata.imageUrl,
      hasAuthor: !!metadata.author,
    });

    return metadata;
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);
    log.externalCall("firecrawl", "scrape", url, durationMs, "error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Don't throw - metadata is optional
    return {};
  }
}

/**
 * Check if Firecrawl is configured and available
 */
export function isFirecrawlConfigured(): boolean {
  return !!firecrawl;
}
