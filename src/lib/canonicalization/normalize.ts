/**
 * URL Normalization Utilities
 *
 * Functions for normalizing URLs to a consistent canonical form.
 */

import { PARAMS_TO_STRIP, PARAMS_TO_PRESERVE } from "./params";

/**
 * Normalize a URL to its canonical form:
 * - Lowercase hostname
 * - Normalize protocol (http → https)
 * - Remove default ports (80, 443)
 * - Remove trailing slashes (except root)
 * - Remove fragments
 * - Strip tracking parameters
 * - Sort remaining query parameters
 * - Handle www prefix (remove it for consistency)
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // 1. Normalize protocol to https
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
    }

    // 2. Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // 3. Remove www. prefix for consistency
    if (parsed.hostname.startsWith("www.")) {
      parsed.hostname = parsed.hostname.slice(4);
    }

    // 4. Remove default ports
    if (parsed.port === "80" || parsed.port === "443") {
      parsed.port = "";
    }

    // 5. Remove fragment
    parsed.hash = "";

    // 6. Strip tracking parameters
    for (const param of PARAMS_TO_STRIP) {
      parsed.searchParams.delete(param);
    }

    // 7. Sort remaining parameters for consistency
    parsed.searchParams.sort();

    // 8. Normalize pathname
    let pathname = parsed.pathname;

    // Remove trailing slash (except for root path)
    if (pathname.endsWith("/") && pathname.length > 1) {
      pathname = pathname.slice(0, -1);
    }

    // Collapse multiple slashes
    pathname = pathname.replace(/\/+/g, "/");

    // Handle empty pathname
    if (pathname === "") {
      pathname = "/";
    }

    parsed.pathname = pathname;

    // 9. Build final URL
    let result = parsed.toString();

    // Remove trailing slash from final URL (but keep for root domain)
    if (result.endsWith("/") && !result.match(/^https?:\/\/[^/]+\/$/)) {
      result = result.slice(0, -1);
    }

    return result;
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Extract the domain from a URL (without www prefix)
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove www. prefix for cleaner display
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Extract the base domain (registrable domain) from a URL
 * e.g., "blog.example.com" → "example.com"
 *
 * Note: This is a simple implementation that handles common cases.
 * For production, consider using a library like "psl" (Public Suffix List)
 */
export function extractBaseDomain(url: string): string {
  try {
    const domain = extractDomain(url);
    const parts = domain.split(".");

    // Handle common TLDs
    if (parts.length <= 2) {
      return domain;
    }

    // Handle two-part TLDs (co.uk, com.au, etc.)
    const twoPartTlds = ["co.uk", "co.nz", "co.jp", "com.au", "com.br", "org.uk"];
    const lastTwo = parts.slice(-2).join(".");
    if (twoPartTlds.includes(lastTwo)) {
      return parts.slice(-3).join(".");
    }

    // Default: return last two parts
    return parts.slice(-2).join(".");
  } catch {
    return "";
  }
}

/**
 * Check if two URLs point to the same domain
 */
export function isSameDomain(url1: string, url2: string): boolean {
  return extractDomain(url1) === extractDomain(url2);
}

/**
 * Check if a URL is from a specific domain
 */
export function isFromDomain(url: string, domain: string): boolean {
  const urlDomain = extractDomain(url).toLowerCase();
  const targetDomain = domain.toLowerCase().replace(/^www\./, "");

  return urlDomain === targetDomain || urlDomain.endsWith("." + targetDomain);
}

/**
 * Check if a URL should be excluded (non-http(s) protocols, invalid URLs)
 */
export function shouldExclude(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return true;
    }

    // Exclude localhost and IP addresses for production
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.match(/^\d+\.\d+\.\d+\.\d+$/)
    ) {
      return true;
    }

    return false;
  } catch {
    // Invalid URLs should be excluded
    return true;
  }
}

/**
 * Check if URL has any meaningful query parameters
 * (not just tracking params)
 */
export function hasMeaningfulParams(url: string): boolean {
  try {
    const parsed = new URL(url);
    for (const [key] of parsed.searchParams) {
      if (!PARAMS_TO_STRIP.includes(key)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
