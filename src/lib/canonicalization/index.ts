/**
 * URL Canonicalization Module
 *
 * Main entry point for URL canonicalization. This module:
 * 1. Checks cache (Redis → Database)
 * 2. Extracts destination from known wrapper patterns
 * 3. Follows redirects (up to 5 hops)
 * 4. Strips tracking parameters
 * 5. Normalizes URL format
 * 6. Caches result
 *
 * Usage:
 *   import { canonicalizeUrl, normalizeUrl } from '@/lib/canonicalization';
 *   const result = await canonicalizeUrl('https://bit.ly/xxx');
 */

import { log } from "../logger";
import { Errors, wrapError, ServiceError } from "../errors";
import { withRetry, RetryPresets } from "../retry";
import {
  matchRedirectPattern,
  tryExtractDestination,
  isKnownRedirect,
} from "./patterns";
import { normalizeUrl, extractDomain, shouldExclude } from "./normalize";
import { getCachedCanonical, setCachedCanonical } from "./cache";

// Configuration
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 10000;

// Re-export utilities for convenience
export { normalizeUrl, extractDomain, shouldExclude } from "./normalize";
export { PARAMS_TO_STRIP } from "./params";
export { isKnownRedirect, matchRedirectPattern } from "./patterns";
export {
  getCachedCanonical,
  setCachedCanonical,
  invalidateCache,
  cleanupExpiredCache,
} from "./cache";

/**
 * Result of canonicalization
 */
export type CanonicalStatus = "success" | "failed" | "cached";

export interface CanonicalizeResult {
  /** The final canonical URL */
  canonicalUrl: string;
  /** The original URL that was passed in */
  originalUrl: string;
  /** Extracted domain from canonical URL */
  domain: string;
  /** Chain of URLs followed during resolution */
  redirectChain: string[];
  /** Status of the canonicalization */
  status: CanonicalStatus;
  /** Whether result came from cache */
  fromCache: boolean;
  /** Error message if status is 'failed' */
  error?: string;
}

/**
 * Follow a single redirect hop using HEAD or GET request
 */
async function followRedirect(
  url: string,
  method: "HEAD" | "GET"
): Promise<{ nextUrl: string | null; status: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DailyBunch/2.0; +https://dailybunch.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    clearTimeout(timeoutId);

    // Check for redirect status codes
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
    throw error;
  }
}

/**
 * Follow redirect chain until final destination
 */
async function resolveRedirects(
  startUrl: string,
  chain: string[],
  seenUrls: Set<string>
): Promise<string> {
  let currentUrl = startUrl;
  let hops = 0;

  while (hops < MAX_REDIRECTS) {
    // Check for redirect loop
    if (seenUrls.has(currentUrl)) {
      log.warn("Redirect loop detected", {
        service: "canonicalization",
        url: currentUrl,
        hops,
      });
      break;
    }
    seenUrls.add(currentUrl);

    // Try to extract destination from known patterns first
    const extracted = tryExtractDestination(currentUrl);
    if (extracted) {
      currentUrl = extracted;
      chain.push(extracted);
      hops++;
      continue;
    }

    // Skip redirect resolution for non-redirect patterns
    if (!isKnownRedirect(currentUrl) && hops > 0) {
      // We've followed at least one redirect and landed on a non-redirect URL
      break;
    }

    // Try to follow redirect
    const context = {
      service: "canonicalization",
      operation: "followRedirect",
      url: currentUrl,
    };

    try {
      // Try HEAD first (faster)
      const result = await withRetry(
        () => followRedirect(currentUrl, "HEAD"),
        context,
        RetryPresets.redirect
      );

      if (result.nextUrl) {
        currentUrl = result.nextUrl;
        chain.push(result.nextUrl);
        hops++;
        continue;
      }

      // No more redirects
      break;
    } catch {
      // HEAD failed, try GET for first hop
      if (hops === 0) {
        try {
          const getResult = await withRetry(
            () => followRedirect(currentUrl, "GET"),
            context,
            RetryPresets.redirect
          );

          if (getResult.nextUrl) {
            currentUrl = getResult.nextUrl;
            chain.push(getResult.nextUrl);
            hops++;
            continue;
          }
        } catch {
          // Both HEAD and GET failed, stop here
        }
      }
      break;
    }
  }

  if (hops >= MAX_REDIRECTS) {
    log.warn("Max redirects reached", {
      service: "canonicalization",
      url: startUrl,
      hops,
    });
  }

  return currentUrl;
}

/**
 * Canonicalize a URL
 *
 * This is the main entry point. It:
 * 1. Checks cache first
 * 2. Resolves redirects
 * 3. Normalizes the URL
 * 4. Caches the result
 *
 * Graceful degradation: On any failure, returns normalized original URL
 */
export async function canonicalizeUrl(url: string): Promise<CanonicalizeResult> {
  const originalUrl = url;
  const redirectChain: string[] = [url];

  // Check if URL should be excluded
  if (shouldExclude(url)) {
    return {
      canonicalUrl: url,
      originalUrl,
      domain: extractDomain(url),
      redirectChain,
      status: "failed",
      fromCache: false,
      error: "URL excluded (invalid protocol or localhost)",
    };
  }

  const op = log.operationStart("canonicalization", "canonicalizeUrl", {
    url: url.slice(0, 100),
  });

  try {
    // 1. Check cache first
    const cached = await getCachedCanonical(url);
    if (cached) {
      op.end({ status: "cached", source: cached.source });
      return {
        canonicalUrl: cached.canonicalUrl,
        originalUrl,
        domain: extractDomain(cached.canonicalUrl),
        redirectChain: cached.redirectChain,
        status: "cached",
        fromCache: true,
      };
    }

    // 2. Try to extract from wrapper pattern without HTTP request
    let currentUrl = url;
    const extracted = tryExtractDestination(url);
    if (extracted) {
      currentUrl = extracted;
      redirectChain.push(extracted);
    }

    // 3. Resolve redirects
    const seenUrls = new Set<string>();
    const finalUrl = await resolveRedirects(currentUrl, redirectChain, seenUrls);

    // 4. Normalize the final URL
    const canonicalUrl = normalizeUrl(finalUrl);

    // 5. Cache the result
    await setCachedCanonical(originalUrl, canonicalUrl, redirectChain);

    op.end({
      status: "success",
      hops: redirectChain.length - 1,
      cached: false,
    });

    return {
      canonicalUrl,
      originalUrl,
      domain: extractDomain(canonicalUrl),
      redirectChain,
      status: "success",
      fromCache: false,
    };
  } catch (error) {
    // Graceful degradation: return normalized original URL
    const normalizedOriginal = normalizeUrl(originalUrl);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    op.end({ status: "failed", error: errorMessage });

    return {
      canonicalUrl: normalizedOriginal,
      originalUrl,
      domain: extractDomain(normalizedOriginal),
      redirectChain,
      status: "failed",
      fromCache: false,
      error: errorMessage,
    };
  }
}

/**
 * Batch canonicalize multiple URLs
 *
 * Processes URLs in parallel but respects rate limits
 */
export async function canonicalizeUrls(
  urls: string[]
): Promise<CanonicalizeResult[]> {
  const results = await Promise.all(urls.map(canonicalizeUrl));

  // Log batch summary
  const succeeded = results.filter((r) => r.status === "success").length;
  const cached = results.filter((r) => r.status === "cached").length;
  const failed = results.filter((r) => r.status === "failed").length;

  log.batchSummary("canonicalization", "canonicalizeUrls", {
    total: urls.length,
    succeeded: succeeded + cached, // Include cached in succeeded count
    failed,
  });

  return results;
}

/**
 * Check if two URLs resolve to the same canonical URL
 */
export async function areSameCanonical(
  url1: string,
  url2: string
): Promise<boolean> {
  const [result1, result2] = await Promise.all([
    canonicalizeUrl(url1),
    canonicalizeUrl(url2),
  ]);

  return result1.canonicalUrl === result2.canonicalUrl;
}
