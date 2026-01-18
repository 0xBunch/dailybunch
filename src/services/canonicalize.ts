import { prisma } from "@/lib/prisma";

// Parameters to strip from URLs
const TRACKING_PARAMS = [
  // UTM parameters
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  // Social/tracking
  "fbclid",
  "gclid",
  "ref",
  "ref_src",
  "ref_url",
  "source",
  // Email tracking
  "mc_cid",
  "mc_eid",
  "oly_enc_id",
  "oly_anon_id",
  "__s",
  // Substack
  "r",
  "s",
  // General
  "trk",
  "trkInfo",
];

export interface CanonicalizedLink {
  originalUrl: string;
  canonicalUrl: string;
  domain: string;
  isBlacklisted: boolean;
}

/**
 * Follow redirects and get the final URL
 */
async function followRedirects(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)",
      },
      signal: AbortSignal.timeout(10000),
    });
    return response.url;
  } catch {
    // If HEAD fails, try GET
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)",
        },
        signal: AbortSignal.timeout(10000),
      });
      return response.url;
    } catch {
      // Return original URL if all requests fail
      return url;
    }
  }
}

/**
 * Normalize a URL by stripping tracking params, fragments, and standardizing format
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove tracking parameters
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }

    // Remove fragment
    parsed.hash = "";

    // Remove trailing slash from path (except for root)
    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove www prefix
    if (parsed.hostname.startsWith("www.")) {
      parsed.hostname = parsed.hostname.slice(4);
    }

    // Sort remaining query params for consistency
    const sortedParams = new URLSearchParams(
      [...parsed.searchParams.entries()].sort((a, b) =>
        a[0].localeCompare(b[0])
      )
    );
    parsed.search = sortedParams.toString() ? `?${sortedParams.toString()}` : "";

    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Check if a domain is blacklisted
 */
async function isBlacklisted(domain: string): Promise<boolean> {
  const blacklisted = await prisma.blacklistedDomain.findUnique({
    where: { domain },
  });
  return !!blacklisted;
}

/**
 * Canonicalize a URL by following redirects and normalizing
 */
export async function canonicalizeUrl(
  originalUrl: string
): Promise<CanonicalizedLink> {
  // First follow redirects
  const resolvedUrl = await followRedirects(originalUrl);

  // Then normalize
  const canonicalUrl = normalizeUrl(resolvedUrl);

  // Extract domain
  const domain = extractDomain(canonicalUrl);

  // Check blacklist
  const blacklisted = await isBlacklisted(domain);

  return {
    originalUrl,
    canonicalUrl,
    domain,
    isBlacklisted: blacklisted,
  };
}

/**
 * Process multiple URLs in parallel with rate limiting
 */
export async function canonicalizeUrls(
  urls: string[],
  concurrency: number = 5
): Promise<CanonicalizedLink[]> {
  const results: CanonicalizedLink[] = [];

  // Process in batches to avoid overwhelming servers
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((url) => canonicalizeUrl(url))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Extract all links from HTML content
 */
export function extractLinksFromHtml(html: string): string[] {
  const links: string[] = [];
  // Match href attributes in anchor tags
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    const url = match[1];
    // Only include http/https URLs
    if (url.startsWith("http://") || url.startsWith("https://")) {
      links.push(url);
    }
  }

  return [...new Set(links)]; // Dedupe
}
