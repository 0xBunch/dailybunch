/**
 * Link Canonicalization Service
 *
 * Handles:
 * 1. Following redirects (unwrapping tracking URLs)
 * 2. Extracting URLs from newsletter wrappers (Mailchimp, Substack, Beehiiv, etc.)
 * 3. Normalizing URLs (strip UTM params, fragments, trailing slashes)
 *
 * Error Handling:
 * - Redirect loop detection
 * - Timeout handling with retry
 * - Graceful degradation to original URL on failure
 */

import { Errors, ServiceError, wrapError } from "./errors";
import { log } from "./logger";
import { withRetry, RetryPresets } from "./retry";
import { fetchMetadataWithFirecrawl, isFirecrawlConfigured } from "./firecrawl";

// Parameters to strip from URLs
const PARAMS_TO_STRIP = [
  // UTM parameters
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  // Common tracking params
  "ref", "source", "mc_cid", "mc_eid", "fbclid", "gclid", "msclkid",
  // Newsletter-specific
  "email", "subscriber", "hash",
];

// Max redirects to follow
const MAX_REDIRECTS = 10;

// Timeout for each request (ms)
const REQUEST_TIMEOUT = 10000;

/**
 * Extract the destination URL from known newsletter wrapper patterns
 */
function extractFromWrapper(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Mailchimp click tracking
    // https://click.mailchimp.com/track/click/...?url=https%3A%2F%2Fexample.com
    if (parsed.hostname.includes("mailchimp.com") || parsed.hostname.includes("list-manage.com")) {
      const destUrl = parsed.searchParams.get("url");
      if (destUrl) return destUrl;
    }

    // Substack redirects
    // https://substack.com/redirect/...?uri=https%3A%2F%2Fexample.com
    // https://email.mg1.substack.com/c/...
    if (parsed.hostname.includes("substack.com")) {
      const uri = parsed.searchParams.get("uri");
      if (uri) return uri;
    }

    // Beehiiv tracking - these need to be followed via redirect
    // ConvertKit - these need to be followed via redirect
    // Buttondown - these need to be followed via redirect

    return null;
  } catch {
    return null;
  }
}

/**
 * Normalize a URL by stripping tracking params, fragments, and trailing slashes
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Strip fragment
    parsed.hash = "";

    // Strip tracking parameters
    for (const param of PARAMS_TO_STRIP) {
      parsed.searchParams.delete(param);
    }

    // Sort remaining params for consistency
    parsed.searchParams.sort();

    // Normalize protocol to https
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
    }

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove trailing slash from pathname
    if (parsed.pathname.endsWith("/") && parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    // For root path, keep it clean (no trailing slash in final output)
    if (parsed.pathname === "/") {
      parsed.pathname = "";
    }

    // Remove default ports
    if (parsed.port === "80" || parsed.port === "443") {
      parsed.port = "";
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove www. prefix for cleaner display
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
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
      "twitter.com", "x.com", "facebook.com", "instagram.com", "linkedin.com",
      "tiktok.com", "youtube.com", "reddit.com", "threads.net",
    ];

    const domain = parsed.hostname.replace(/^www\./, "");
    return blacklistedDomains.includes(domain);
  } catch {
    return true; // Invalid URLs are blacklisted
  }
}

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
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    if (ogTitleMatch) {
      result.title = ogTitleMatch[1].trim().slice(0, 500);
    }
  }

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (descMatch) {
    result.description = descMatch[1].trim().slice(0, 500);
  }

  // Try og:description if no description found
  if (!result.description) {
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
    if (ogDescMatch) {
      result.description = ogDescMatch[1].trim().slice(0, 500);
    }
  }

  return result;
}

/**
 * Fetch page metadata (title, description) from a URL
 */
async function fetchPageMetadata(
  url: string,
  context: { service: string; operation: string; url: string }
): Promise<PageMetadata> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const startTime = performance.now();
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)",
        "Accept": "text/html",
      },
    });

    clearTimeout(timeoutId);
    const durationMs = Math.round(performance.now() - startTime);

    log.externalCall("canonicalize", "GET-metadata", url, durationMs, response.status);

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
  } catch (error) {
    clearTimeout(timeoutId);
    // Don't throw - metadata fetch is optional
    log.warn("Failed to fetch page metadata", {
      ...context,
      error: error instanceof Error ? error.message : "Unknown error",
    });
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
 * Follow a single redirect hop
 */
async function followRedirect(
  url: string,
  method: "HEAD" | "GET",
  context: { service: string; operation: string; url: string }
): Promise<{ nextUrl: string | null; status: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const startTime = performance.now();
    const response = await fetch(url, {
      method,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)",
      },
    });

    clearTimeout(timeoutId);
    const durationMs = Math.round(performance.now() - startTime);

    log.externalCall("canonicalize", method, url, durationMs, response.status);

    // Check for redirect
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (location) {
        // Handle relative redirects
        const nextUrl = new URL(location, url).toString();
        return { nextUrl, status: response.status };
      }
    }

    return { nextUrl: null, status: response.status };
  } catch (error) {
    clearTimeout(timeoutId);

    // Wrap the error with context
    const serviceError = wrapError(error, context);
    log.externalCall("canonicalize", method, url, 0, "error", {
      errorCode: serviceError.code,
      errorMessage: serviceError.message,
    });

    throw serviceError;
  }
}

/**
 * Follow redirects with retry logic
 */
async function followRedirectsWithRetry(
  url: string,
  redirectChain: string[],
  seenUrls: Set<string>
): Promise<{ finalUrl: string; chain: string[] }> {
  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount < MAX_REDIRECTS) {
    const context = { service: "canonicalize", operation: "followRedirect", url: currentUrl };

    // Check for redirect loop
    if (seenUrls.has(currentUrl)) {
      const loopError = Errors.redirectLoop({ ...context, url: currentUrl });
      log.error(loopError);
      // Don't throw - just stop following and use current URL
      break;
    }
    seenUrls.add(currentUrl);

    try {
      // Try HEAD first with retry
      const result = await withRetry(
        () => followRedirect(currentUrl, "HEAD", context),
        context,
        RetryPresets.redirect
      );

      if (result.nextUrl) {
        // Check if we can extract from the redirect target
        const extractedFromRedirect = extractFromWrapper(result.nextUrl);
        const nextUrl = extractedFromRedirect || result.nextUrl;

        currentUrl = nextUrl;
        redirectChain.push(nextUrl);
        redirectCount++;
        continue;
      }

      // No more redirects
      break;
    } catch (headError) {
      // If HEAD fails, try GET (some servers don't support HEAD)
      if (redirectCount === 0) {
        try {
          const getResult = await withRetry(
            () => followRedirect(currentUrl, "GET", context),
            context,
            RetryPresets.redirect
          );

          if (getResult.nextUrl) {
            currentUrl = getResult.nextUrl;
            redirectChain.push(getResult.nextUrl);
            redirectCount++;
            continue;
          }

          break;
        } catch {
          // Both HEAD and GET failed - stop here
          break;
        }
      }

      // Already tried, stop here
      break;
    }
  }

  // Check if we hit max redirects
  if (redirectCount >= MAX_REDIRECTS) {
    log.warn("Max redirects reached", {
      service: "canonicalize",
      operation: "followRedirects",
      url,
      redirectCount,
    });
  }

  return { finalUrl: currentUrl, chain: redirectChain };
}

/**
 * Follow redirects and canonicalize a URL
 *
 * Graceful degradation: on any failure, returns normalized original URL
 * with status='failed' and error message.
 */
export async function canonicalizeUrl(url: string): Promise<CanonicalizeResult> {
  const originalUrl = url;
  const redirectChain: string[] = [url];
  const seenUrls = new Set<string>();
  const context = { service: "canonicalize", operation: "canonicalizeUrl", url };

  const op = log.operationStart("canonicalize", "canonicalizeUrl", { url: url.slice(0, 100) });

  try {
    let currentUrl = url;

    // First, check if we can extract from a known wrapper pattern
    const extracted = extractFromWrapper(url);
    if (extracted) {
      currentUrl = extracted;
      redirectChain.push(extracted);
    }

    // Follow redirects with retry and loop detection
    const { finalUrl, chain } = await followRedirectsWithRetry(
      currentUrl,
      redirectChain,
      seenUrls
    );

    // Normalize the final URL
    const canonicalUrl = normalizeUrl(finalUrl);

    // Fetch page metadata - prefer Firecrawl if configured (handles paywalls, JS rendering)
    let metadata: {
      title?: string;
      description?: string;
      imageUrl?: string;
      author?: string;
      publishedAt?: Date;
    } = {};

    if (isFirecrawlConfigured()) {
      metadata = await fetchMetadataWithFirecrawl(canonicalUrl);
    }

    // Fall back to simple HTML fetch if Firecrawl not configured or returned nothing
    if (!metadata.title) {
      const htmlMetadata = await fetchPageMetadata(canonicalUrl, context);
      metadata.title = metadata.title || htmlMetadata.title;
      metadata.description = metadata.description || htmlMetadata.description;
    }

    op.end({
      status: "success",
      redirectCount: chain.length - 1,
      hasTitle: !!metadata.title,
      hasImage: !!metadata.imageUrl,
      usedFirecrawl: isFirecrawlConfigured(),
    });

    return {
      canonicalUrl,
      originalUrl,
      domain: extractDomain(canonicalUrl),
      redirectChain: chain,
      status: "success",
      title: metadata.title,
      description: metadata.description,
      imageUrl: metadata.imageUrl,
      author: metadata.author,
      publishedAt: metadata.publishedAt,
    };
  } catch (error) {
    // Graceful degradation: return normalized original URL
    const normalizedOriginal = normalizeUrl(originalUrl);
    const serviceError = error instanceof ServiceError ? error : wrapError(error, context);

    op.end({ status: "failed", errorCode: serviceError.code });

    return {
      canonicalUrl: normalizedOriginal,
      originalUrl,
      domain: extractDomain(normalizedOriginal),
      redirectChain,
      status: "failed",
      error: serviceError.message,
    };
  }
}

/**
 * Batch canonicalize multiple URLs
 *
 * Never throws - each URL is processed independently.
 * Failed URLs return with status='failed'.
 */
export async function canonicalizeUrls(urls: string[]): Promise<CanonicalizeResult[]> {
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
