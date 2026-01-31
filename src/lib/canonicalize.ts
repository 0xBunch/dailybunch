/**
 * Link Canonicalization Service (Backwards Compatibility Layer)
 *
 * This module wraps the new canonicalization module (@/lib/canonicalization)
 * and adds metadata fetching for backwards compatibility.
 *
 * New code should import from '@/lib/canonicalization' directly.
 *
 * Handles:
 * 1. URL canonicalization via new module (redirect resolution, normalization)
 * 2. Metadata fetching (title, description, image) via Firecrawl or HTML
 */

import { log } from "./logger";
import { fetchMetadataWithFirecrawl, isFirecrawlConfigured } from "./firecrawl";
import {
  canonicalizeUrl as canonicalizeUrlCore,
  normalizeUrl as normalizeUrlCore,
  extractDomain as extractDomainCore,
  type CanonicalizeResult as CoreResult,
} from "./canonicalization";

// Re-export core functions
export { normalizeUrl, extractDomain } from "./canonicalization";
export { PARAMS_TO_STRIP } from "./canonicalization";

// Timeout for metadata fetch
const METADATA_TIMEOUT = 10000;

export type CanonicalStatus = "success" | "failed" | "pending";

interface PageMetadata {
  title?: string;
  description?: string;
}

/**
 * Extract title and description from HTML
 */
function extractMetadataFromHtml(html: string): PageMetadata {
  const result: PageMetadata = {};

  // Extract <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    result.title = titleMatch[1]
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
  }

  // Try og:title if no title found
  if (!result.title) {
    const ogTitleMatch =
      html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i
      );
    if (ogTitleMatch) {
      result.title = ogTitleMatch[1].trim().slice(0, 500);
    }
  }

  // Extract meta description
  const descMatch =
    html.match(
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
    ) ||
    html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i
    );
  if (descMatch) {
    result.description = descMatch[1].trim().slice(0, 500);
  }

  // Try og:description if no description found
  if (!result.description) {
    const ogDescMatch =
      html.match(
        /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i
      );
    if (ogDescMatch) {
      result.description = ogDescMatch[1].trim().slice(0, 500);
    }
  }

  return result;
}

/**
 * Fetch page metadata (title, description) from a URL
 */
async function fetchPageMetadata(url: string): Promise<PageMetadata> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), METADATA_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)",
        Accept: "text/html",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {};
    }

    // Only read first 50KB to get metadata from <head>
    const reader = response.body?.getReader();
    if (!reader) return {};

    let html = "";
    const decoder = new TextDecoder();
    const maxBytes = 50000;

    while (html.length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });

      // Stop early if we've passed </head>
      if (html.includes("</head>")) break;
    }

    reader.cancel();
    return extractMetadataFromHtml(html);
  } catch {
    clearTimeout(timeoutId);
    return {};
  }
}

export interface CanonicalizeResult {
  canonicalUrl: string;
  originalUrl: string;
  domain: string;
  redirectChain: string[];
  status: CanonicalStatus;
  error?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  author?: string;
  publishedAt?: Date;
}

/**
 * Check if a URL should be blacklisted (social media, mailto, etc.)
 */
export function shouldBlacklist(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Non-http(s) protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return true;
    }

    // Common blacklisted domains (basic check - full check uses DB)
    const blacklistedDomains = [
      "twitter.com",
      "x.com",
      "facebook.com",
      "instagram.com",
      "linkedin.com",
      "tiktok.com",
      "youtube.com",
      "reddit.com",
      "threads.net",
    ];

    const domain = parsed.hostname.replace(/^www\./, "");
    return blacklistedDomains.includes(domain);
  } catch {
    return true; // Invalid URLs are blacklisted
  }
}

/**
 * Follow redirects and canonicalize a URL, with metadata fetching
 *
 * This is the legacy API that includes metadata. For pure canonicalization,
 * use the new module directly: import { canonicalizeUrl } from '@/lib/canonicalization'
 */
export async function canonicalizeUrl(url: string): Promise<CanonicalizeResult> {
  // 1. Use new canonicalization module for URL resolution
  const coreResult = await canonicalizeUrlCore(url);

  // Map status
  const status: CanonicalStatus =
    coreResult.status === "cached" ? "success" : coreResult.status;

  // If failed, return early without metadata
  if (coreResult.status === "failed") {
    return {
      canonicalUrl: coreResult.canonicalUrl,
      originalUrl: coreResult.originalUrl,
      domain: coreResult.domain,
      redirectChain: coreResult.redirectChain,
      status,
      error: coreResult.error,
    };
  }

  // 2. Fetch metadata (title, description, etc.)
  let metadata: {
    title?: string;
    description?: string;
    imageUrl?: string;
    author?: string;
    publishedAt?: Date;
  } = {};

  // Prefer Firecrawl if configured (handles paywalls, JS rendering)
  if (isFirecrawlConfigured()) {
    metadata = await fetchMetadataWithFirecrawl(coreResult.canonicalUrl);
  }

  // Fall back to simple HTML fetch if Firecrawl not configured or returned nothing
  if (!metadata.title) {
    const htmlMetadata = await fetchPageMetadata(coreResult.canonicalUrl);
    metadata.title = metadata.title || htmlMetadata.title;
    metadata.description = metadata.description || htmlMetadata.description;
  }

  return {
    canonicalUrl: coreResult.canonicalUrl,
    originalUrl: coreResult.originalUrl,
    domain: coreResult.domain,
    redirectChain: coreResult.redirectChain,
    status,
    title: metadata.title,
    description: metadata.description,
    imageUrl: metadata.imageUrl,
    author: metadata.author,
    publishedAt: metadata.publishedAt,
  };
}

/**
 * Batch canonicalize multiple URLs
 *
 * Never throws - each URL is processed independently.
 * Failed URLs return with status='failed'.
 */
export async function canonicalizeUrls(
  urls: string[]
): Promise<CanonicalizeResult[]> {
  const results = await Promise.all(urls.map(canonicalizeUrl));

  // Log batch summary
  const succeeded = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;

  log.batchSummary("canonicalize", "canonicalizeUrls", {
    total: urls.length,
    succeeded,
    failed,
  });

  return results;
}

// For backwards compatibility, also export normalizeUrl and extractDomain
// These are now re-exported from canonicalization module at the top
