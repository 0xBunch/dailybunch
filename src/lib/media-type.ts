/**
 * Media Type Detection
 *
 * Detects content type based on domain patterns.
 * Used to render appropriate card variants (video, podcast, newsletter, etc.)
 */

export type MediaType = "article" | "video" | "podcast" | "newsletter" | "thread";

interface MediaTypePattern {
  pattern: RegExp;
  type: MediaType;
}

/**
 * Domain patterns for detecting media types
 */
const MEDIA_TYPE_PATTERNS: MediaTypePattern[] = [
  // Video platforms
  { pattern: /^(www\.)?youtube\.com$/i, type: "video" },
  { pattern: /^youtu\.be$/i, type: "video" },
  { pattern: /^(www\.)?vimeo\.com$/i, type: "video" },
  { pattern: /^(www\.)?tiktok\.com$/i, type: "video" },
  { pattern: /^(www\.)?twitch\.tv$/i, type: "video" },
  { pattern: /^(www\.)?dailymotion\.com$/i, type: "video" },
  { pattern: /^(www\.)?loom\.com$/i, type: "video" },
  { pattern: /^(www\.)?wistia\.com$/i, type: "video" },
  { pattern: /^fast\.wistia\.net$/i, type: "video" },
  { pattern: /^(www\.)?rumble\.com$/i, type: "video" },
  { pattern: /^(www\.)?bitchute\.com$/i, type: "video" },
  { pattern: /^(www\.)?odysee\.com$/i, type: "video" },
  { pattern: /^clips\.twitch\.tv$/i, type: "video" },

  // Podcast platforms
  { pattern: /^(podcasts|itunes)\.apple\.com$/i, type: "podcast" },
  { pattern: /^open\.spotify\.com\/episode/i, type: "podcast" },
  { pattern: /^open\.spotify\.com\/show/i, type: "podcast" },
  { pattern: /^(www\.)?overcast\.fm$/i, type: "podcast" },
  { pattern: /^(www\.)?pocketcasts\.com$/i, type: "podcast" },
  { pattern: /^(www\.)?castbox\.fm$/i, type: "podcast" },
  { pattern: /^(www\.)?podbean\.com$/i, type: "podcast" },
  { pattern: /^(www\.)?anchor\.fm$/i, type: "podcast" },
  { pattern: /^(www\.)?transistor\.fm$/i, type: "podcast" },
  { pattern: /^(www\.)?simplecast\.com$/i, type: "podcast" },
  { pattern: /^(www\.)?megaphone\.fm$/i, type: "podcast" },
  { pattern: /^(www\.)?omnycontent\.com$/i, type: "podcast" },
  { pattern: /^(www\.)?buzzsprout\.com$/i, type: "podcast" },

  // Newsletter platforms
  { pattern: /\.substack\.com$/i, type: "newsletter" },
  { pattern: /^(www\.)?substack\.com$/i, type: "newsletter" },
  { pattern: /\.beehiiv\.com$/i, type: "newsletter" },
  { pattern: /^(www\.)?beehiiv\.com$/i, type: "newsletter" },
  { pattern: /\.buttondown\.email$/i, type: "newsletter" },
  { pattern: /\.ghost\.io$/i, type: "newsletter" },
  { pattern: /^(www\.)?revue\.co$/i, type: "newsletter" },
  { pattern: /\.convertkit\.com$/i, type: "newsletter" },
  { pattern: /^(www\.)?mailchimp\.com$/i, type: "newsletter" },

  // Social threads (if we ever un-blacklist them)
  { pattern: /^(www\.)?twitter\.com$/i, type: "thread" },
  { pattern: /^(www\.)?x\.com$/i, type: "thread" },
  { pattern: /^(www\.)?threads\.net$/i, type: "thread" },
  { pattern: /^(www\.)?mastodon\./i, type: "thread" },
  { pattern: /^(www\.)?bsky\.app$/i, type: "thread" },
];

/**
 * URL path patterns for additional detection
 */
const URL_PATH_PATTERNS: Array<{ test: (url: URL) => boolean; type: MediaType }> = [
  // Spotify episode/show URLs
  {
    test: (url) =>
      url.hostname.includes("spotify.com") &&
      (url.pathname.startsWith("/episode") || url.pathname.startsWith("/show")),
    type: "podcast",
  },
  // YouTube watch URLs
  {
    test: (url) =>
      (url.hostname === "youtube.com" || url.hostname === "www.youtube.com") &&
      (url.pathname === "/watch" || url.pathname.startsWith("/shorts")),
    type: "video",
  },
  // Medium as newsletter (debatable, but mostly personal blogs now)
  {
    test: (url) => url.hostname === "medium.com" || url.hostname.endsWith(".medium.com"),
    type: "newsletter",
  },
];

/**
 * Detect media type from a URL's domain
 *
 * @param url - Full URL or domain string
 * @returns MediaType or null if it's a standard article
 */
export function detectMediaType(url: string): MediaType {
  try {
    // Handle raw domains (no protocol)
    const urlString = url.includes("://") ? url : `https://${url}`;
    const parsed = new URL(urlString);
    const hostname = parsed.hostname.toLowerCase();

    // Check URL path patterns first (more specific)
    for (const { test, type } of URL_PATH_PATTERNS) {
      if (test(parsed)) {
        return type;
      }
    }

    // Check domain patterns
    for (const { pattern, type } of MEDIA_TYPE_PATTERNS) {
      if (pattern.test(hostname)) {
        return type;
      }
    }

    // Default to article
    return "article";
  } catch {
    // If URL parsing fails, assume article
    return "article";
  }
}

/**
 * Detect media type from a domain only (faster, no URL parsing)
 */
export function detectMediaTypeFromDomain(domain: string): MediaType {
  const hostname = domain.toLowerCase().replace(/^www\./, "");

  for (const { pattern, type } of MEDIA_TYPE_PATTERNS) {
    if (pattern.test(hostname) || pattern.test(`www.${hostname}`)) {
      return type;
    }
  }

  return "article";
}

/**
 * Check if a URL is a video
 */
export function isVideo(url: string): boolean {
  return detectMediaType(url) === "video";
}

/**
 * Check if a URL is a podcast
 */
export function isPodcast(url: string): boolean {
  return detectMediaType(url) === "podcast";
}

/**
 * Check if a URL is a newsletter
 */
export function isNewsletter(url: string): boolean {
  return detectMediaType(url) === "newsletter";
}

/**
 * Get display label for a media type
 */
export function getMediaTypeLabel(type: MediaType): string {
  switch (type) {
    case "video":
      return "Video";
    case "podcast":
      return "Podcast";
    case "newsletter":
      return "Newsletter";
    case "thread":
      return "Thread";
    case "article":
    default:
      return "Article";
  }
}

/**
 * Get icon for a media type (for UI rendering)
 */
export function getMediaTypeIcon(type: MediaType): string {
  switch (type) {
    case "video":
      return "▶";
    case "podcast":
      return "🎧";
    case "newsletter":
      return "📧";
    case "thread":
      return "💬";
    case "article":
    default:
      return "📄";
  }
}
