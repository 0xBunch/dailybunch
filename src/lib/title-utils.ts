/**
 * Title Utilities
 *
 * Provides consistent title display across the application.
 * Guarantees every link has a displayable title - never "Untitled".
 * Handles HTML entity decoding for clean display.
 */

/**
 * Decode common HTML entities to their character equivalents.
 * Handles both named entities (&amp;) and numeric entities (&#8211;).
 */
export function decodeHtmlEntities(str: string): string {
  return str
    // Named entities
    .replace(/&ndash;/gi, "–")
    .replace(/&mdash;/gi, "—")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&hellip;/gi, "\u2026")
    .replace(/&lsquo;/gi, "\u2018")
    .replace(/&rsquo;/gi, "\u2019")
    .replace(/&ldquo;/gi, "\u201C")
    .replace(/&rdquo;/gi, "\u201D")
    .replace(/&bull;/gi, "\u2022")
    .replace(/&copy;/gi, "\u00A9")
    .replace(/&reg;/gi, "\u00AE")
    .replace(/&trade;/gi, "\u2122")
    // Numeric entities (decimal) - &#8211; → –
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    // Numeric entities (hex) - &#x2013; → –
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

export interface TitleableLink {
  title: string | null;
  fallbackTitle: string | null;
  canonicalUrl: string;
  domain: string;
}

export interface DisplayTitleResult {
  text: string;
  source: "extracted" | "fallback" | "generated";
}

/**
 * Get a displayable title for a link.
 * Priority: title → fallbackTitle → URL-derived title
 * Never returns empty string or null.
 * Decodes HTML entities for clean display.
 */
export function getDisplayTitle(link: TitleableLink): DisplayTitleResult {
  if (link.title && link.title.trim()) {
    return { text: decodeHtmlEntities(link.title.trim()), source: "extracted" };
  }

  if (link.fallbackTitle && link.fallbackTitle.trim()) {
    return { text: decodeHtmlEntities(link.fallbackTitle.trim()), source: "fallback" };
  }

  return {
    text: formatUrlAsTitle(link.canonicalUrl, link.domain),
    source: "generated",
  };
}

/**
 * Get just the title text (convenience function for simple cases)
 */
export function getDisplayTitleText(link: TitleableLink): string {
  return getDisplayTitle(link).text;
}

/**
 * Convert a URL path into a readable title.
 * Examples:
 *   "/blog/my-cool-post" → "My Cool Post"
 *   "/2024/01/ai-regulation" → "AI Regulation"
 *   "/" → "Example.com" (domain fallback)
 */
export function formatUrlAsTitle(url: string, domain: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    // If no meaningful path, use domain
    if (!pathname || pathname === "/" || pathname === "") {
      return formatDomain(domain);
    }

    // Get the last meaningful segment
    const segments = pathname
      .split("/")
      .filter((s) => s && !isDateSegment(s) && !isNumericOnly(s));

    if (segments.length === 0) {
      return formatDomain(domain);
    }

    // Use the last segment (usually the article slug)
    const slug = segments[segments.length - 1];

    // Convert slug to title case
    const title = slugToTitle(slug);

    // If the result is too short or generic, include domain
    if (title.length < 5) {
      return `${title} - ${formatDomain(domain)}`;
    }

    return title;
  } catch {
    return formatDomain(domain);
  }
}

/**
 * Convert a URL slug to a readable title.
 * "my-cool-post" → "My Cool Post"
 * "ai_regulation_2024" → "AI Regulation 2024"
 */
function slugToTitle(slug: string): string {
  // Remove file extensions
  const withoutExt = slug.replace(/\.(html?|php|aspx?|jsp)$/i, "");

  // Replace separators with spaces
  const spaced = withoutExt.replace(/[-_]+/g, " ");

  // Title case, preserving known acronyms
  const words = spaced.split(" ").map((word) => {
    const lower = word.toLowerCase();

    // Known acronyms to preserve
    const acronyms = [
      "ai",
      "api",
      "ceo",
      "cfo",
      "cto",
      "nfl",
      "nba",
      "mlb",
      "nhl",
      "usa",
      "uk",
      "eu",
      "gpt",
      "llm",
      "ice",
      "fbi",
      "cia",
      "doj",
      "sec",
      "ftc",
      "nyc",
      "la",
      "sf",
    ];

    if (acronyms.includes(lower)) {
      return word.toUpperCase();
    }

    // Title case
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return words.join(" ").trim();
}

/**
 * Format a domain for display.
 * "www.example.com" → "Example.com"
 * "blog.nytimes.com" → "NYTimes Blog"
 */
function formatDomain(domain: string): string {
  // Remove www prefix
  let clean = domain.replace(/^www\./i, "");

  // Handle known domains specially
  const knownDomains: Record<string, string> = {
    "nytimes.com": "The New York Times",
    "washingtonpost.com": "The Washington Post",
    "wsj.com": "The Wall Street Journal",
    "theguardian.com": "The Guardian",
    "bbc.com": "BBC",
    "cnn.com": "CNN",
    "apnews.com": "AP News",
    "reuters.com": "Reuters",
    "bloomberg.com": "Bloomberg",
    "techcrunch.com": "TechCrunch",
    "theverge.com": "The Verge",
    "arstechnica.com": "Ars Technica",
    "wired.com": "Wired",
  };

  // Check for known domains (including subdomains)
  for (const [pattern, name] of Object.entries(knownDomains)) {
    if (clean === pattern || clean.endsWith(`.${pattern}`)) {
      return name;
    }
  }

  // Handle subdomains
  const parts = clean.split(".");
  if (parts.length > 2) {
    // "blog.example.com" → "Example Blog"
    const subdomain = parts[0];
    const mainDomain = parts.slice(1, -1).join(".");
    if (subdomain !== "blog" && subdomain !== "www") {
      return `${capitalize(mainDomain)} ${capitalize(subdomain)}`;
    }
    clean = parts.slice(1).join(".");
  }

  // Remove TLD and capitalize
  const withoutTld = clean.replace(/\.(com|org|net|io|co|ai|dev)$/i, "");
  return capitalize(withoutTld);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function isDateSegment(segment: string): boolean {
  // Match common date patterns: 2024, 01, jan, january
  return /^(\d{4}|\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)$/i.test(
    segment
  );
}

function isNumericOnly(segment: string): boolean {
  return /^\d+$/.test(segment);
}
