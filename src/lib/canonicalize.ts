/**
 * Link Canonicalization Service
 *
 * Handles:
 * 1. Following redirects (unwrapping tracking URLs)
 * 2. Extracting URLs from newsletter wrappers (Mailchimp, Substack, Beehiiv, etc.)
 * 3. Normalizing URLs (strip UTM params, fragments, trailing slashes)
 */

// Parameters to strip from URLs
const PARAMS_TO_STRIP = [
  // UTM parameters
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  // Common tracking params
  'ref', 'source', 'mc_cid', 'mc_eid', 'fbclid', 'gclid', 'msclkid',
  // Newsletter-specific
  'email', 'subscriber', 'hash',
];

// Max redirects to follow
const MAX_REDIRECTS = 10;

// Timeout for each request (ms)
const REQUEST_TIMEOUT = 10000;

/**
 * Extract the destination URL from known newsletter wrapper patterns
 */
function extractFromWrapper(url: string): string | null {
  const parsed = new URL(url);

  // Mailchimp click tracking
  // https://click.mailchimp.com/track/click/...?url=https%3A%2F%2Fexample.com
  if (parsed.hostname.includes('mailchimp.com') || parsed.hostname.includes('list-manage.com')) {
    const destUrl = parsed.searchParams.get('url');
    if (destUrl) return destUrl;
  }

  // Substack redirects
  // https://substack.com/redirect/...?uri=https%3A%2F%2Fexample.com
  // https://email.mg1.substack.com/c/...
  if (parsed.hostname.includes('substack.com')) {
    const uri = parsed.searchParams.get('uri');
    if (uri) return uri;
  }

  // Beehiiv tracking
  // https://link.beehiiv.com/ss/c/...
  // These need to be followed via redirect

  // ConvertKit
  // https://click.convertkit-mail.com/...
  // These need to be followed via redirect

  // Buttondown
  // https://buttondown.email/...
  // These need to be followed via redirect

  return null;
}

/**
 * Normalize a URL by stripping tracking params, fragments, and trailing slashes
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Strip fragment
    parsed.hash = '';

    // Strip tracking parameters
    for (const param of PARAMS_TO_STRIP) {
      parsed.searchParams.delete(param);
    }

    // Sort remaining params for consistency
    parsed.searchParams.sort();

    // Normalize protocol to https
    if (parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
    }

    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove trailing slash from pathname
    if (parsed.pathname.endsWith('/') && parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    // For root path, keep it clean (no trailing slash in final output)
    if (parsed.pathname === '/') {
      parsed.pathname = '';
    }

    // Remove default ports
    if (parsed.port === '80' || parsed.port === '443') {
      parsed.port = '';
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
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Check if a URL should be blacklisted (social media, mailto, etc.)
 */
export function shouldBlacklist(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Non-http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return true;
    }

    // Common blacklisted domains (basic check - full check uses DB)
    const blacklistedDomains = [
      'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'linkedin.com',
      'tiktok.com', 'youtube.com', 'reddit.com', 'threads.net',
    ];

    const domain = parsed.hostname.replace(/^www\./, '');
    return blacklistedDomains.includes(domain);
  } catch {
    return true; // Invalid URLs are blacklisted
  }
}

export interface CanonicalizeResult {
  canonicalUrl: string;
  originalUrl: string;
  domain: string;
  redirectChain: string[];
  error?: string;
}

/**
 * Follow redirects and canonicalize a URL
 */
export async function canonicalizeUrl(url: string): Promise<CanonicalizeResult> {
  const originalUrl = url;
  const redirectChain: string[] = [url];
  let currentUrl = url;
  let redirectCount = 0;

  try {
    // First, check if we can extract from a known wrapper pattern
    const extracted = extractFromWrapper(url);
    if (extracted) {
      currentUrl = extracted;
      redirectChain.push(extracted);
    }

    // Follow redirects
    while (redirectCount < MAX_REDIRECTS) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      try {
        const response = await fetch(currentUrl, {
          method: 'HEAD',
          redirect: 'manual', // Don't auto-follow, we want to track each hop
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)',
          },
        });

        clearTimeout(timeoutId);

        // Check for redirect
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          if (location) {
            // Handle relative redirects
            const nextUrl = new URL(location, currentUrl).toString();

            // Check if we can extract from the redirect target
            const extractedFromRedirect = extractFromWrapper(nextUrl);
            if (extractedFromRedirect) {
              currentUrl = extractedFromRedirect;
              redirectChain.push(extractedFromRedirect);
            } else {
              currentUrl = nextUrl;
              redirectChain.push(nextUrl);
            }

            redirectCount++;
            continue;
          }
        }

        // No more redirects, we're done
        break;
      } catch (fetchError) {
        clearTimeout(timeoutId);

        // If HEAD fails, try GET (some servers don't support HEAD)
        if (redirectCount === 0) {
          try {
            const getController = new AbortController();
            const getTimeoutId = setTimeout(() => getController.abort(), REQUEST_TIMEOUT);

            const getResponse = await fetch(currentUrl, {
              method: 'GET',
              redirect: 'manual',
              signal: getController.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)',
              },
            });

            clearTimeout(getTimeoutId);

            if ([301, 302, 303, 307, 308].includes(getResponse.status)) {
              const location = getResponse.headers.get('location');
              if (location) {
                const nextUrl = new URL(location, currentUrl).toString();
                currentUrl = nextUrl;
                redirectChain.push(nextUrl);
                redirectCount++;
                continue;
              }
            }

            break;
          } catch {
            // Both HEAD and GET failed
            break;
          }
        }

        break;
      }
    }

    // Normalize the final URL
    const canonicalUrl = normalizeUrl(currentUrl);

    return {
      canonicalUrl,
      originalUrl,
      domain: extractDomain(canonicalUrl),
      redirectChain,
    };
  } catch (error) {
    // Return normalized original URL if all else fails
    const normalizedOriginal = normalizeUrl(originalUrl);
    return {
      canonicalUrl: normalizedOriginal,
      originalUrl,
      domain: extractDomain(normalizedOriginal),
      redirectChain,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch canonicalize multiple URLs
 */
export async function canonicalizeUrls(urls: string[]): Promise<CanonicalizeResult[]> {
  return Promise.all(urls.map(canonicalizeUrl));
}
