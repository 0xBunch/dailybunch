/**
 * Known Redirect Patterns
 *
 * These patterns identify URLs that are tracking/redirect wrappers.
 * For some, we can extract the destination URL directly from the URL structure.
 * For others, we need to follow the redirect.
 */

export interface RedirectPattern {
  /** Regex pattern to match the URL */
  pattern: RegExp;
  /** Type of handling needed */
  type: "redirect" | "extract";
  /** For 'extract' type: function to extract destination URL */
  extract?: (url: string) => string | null;
  /** Human-readable name for logging */
  name: string;
}

export const REDIRECT_PATTERNS: RedirectPattern[] = [
  // ========================================
  // Substack (multiple formats)
  // NOTE: Extract patterns must come BEFORE redirect-only patterns
  // ========================================
  {
    // Extract from ?uri= parameter (must be first for Substack)
    pattern: /^https:\/\/substack\.com\/redirect\/.*\?.*uri=/,
    type: "extract",
    extract: (url) => {
      try {
        const parsed = new URL(url);
        const uri = parsed.searchParams.get("uri");
        return uri;
      } catch {
        return null;
      }
    },
    name: "Substack Redirect with URI",
  },
  {
    pattern: /^https:\/\/email\.mg\d?\.substack\.com\/c\//,
    type: "redirect",
    name: "Substack Email (mg)",
  },
  {
    pattern: /^https:\/\/substack\.com\/redirect\//,
    type: "redirect",
    name: "Substack Redirect",
  },
  {
    pattern: /^https:\/\/[^.]+\.substack\.com\/redirect\//,
    type: "redirect",
    name: "Substack Publication Redirect",
  },

  // ========================================
  // Beehiiv
  // ========================================
  {
    pattern: /^https:\/\/link\.mail\.beehiiv\.com\//,
    type: "redirect",
    name: "Beehiiv",
  },
  {
    pattern: /^https:\/\/[^.]+\.beehiiv\.com\/clicks\//,
    type: "redirect",
    name: "Beehiiv Clicks",
  },

  // ========================================
  // ConvertKit
  // ========================================
  {
    pattern: /^https:\/\/click\.convertkit-mail\.com\//,
    type: "redirect",
    name: "ConvertKit",
  },
  {
    pattern: /^https:\/\/click\.convertkit-mail\d?\.com\//,
    type: "redirect",
    name: "ConvertKit (numbered)",
  },

  // ========================================
  // Mailchimp
  // NOTE: Extract patterns must come BEFORE redirect-only patterns
  // ========================================
  {
    // Extract from ?url= parameter (must be first for Mailchimp)
    pattern: /^https:\/\/[^.]+\.list-manage\.com\/track\/click\?.*url=/,
    type: "extract",
    extract: (url) => {
      try {
        const parsed = new URL(url);
        const dest = parsed.searchParams.get("url");
        return dest;
      } catch {
        return null;
      }
    },
    name: "Mailchimp with URL param",
  },
  {
    pattern: /^https:\/\/click\.mailchimp\.com\//,
    type: "redirect",
    name: "Mailchimp Click",
  },
  {
    pattern: /^https:\/\/[^.]+\.list-manage\.com\/track\/click/,
    type: "redirect",
    name: "Mailchimp List-Manage",
  },

  // ========================================
  // Buttondown
  // ========================================
  {
    pattern: /^https:\/\/links\.buttondown\.email\//,
    type: "redirect",
    name: "Buttondown",
  },
  {
    pattern: /^https:\/\/buttondown\.email\/redirect\//,
    type: "redirect",
    name: "Buttondown Redirect",
  },

  // ========================================
  // Campaign Monitor
  // ========================================
  {
    pattern: /^https:\/\/link\.mail\.campaignmonitor\.com\//,
    type: "redirect",
    name: "Campaign Monitor",
  },
  {
    pattern: /^https:\/\/[^.]+\.createsend\d?\.com\/t\//,
    type: "redirect",
    name: "Campaign Monitor CreateSend",
  },

  // ========================================
  // Postmark
  // ========================================
  {
    pattern: /^https:\/\/click\.pstmrk\.it\//,
    type: "redirect",
    name: "Postmark",
  },

  // ========================================
  // SendGrid
  // ========================================
  {
    pattern: /^https:\/\/u\d+\.ct\.sendgrid\.net\//,
    type: "redirect",
    name: "SendGrid",
  },

  // ========================================
  // Constant Contact
  // ========================================
  {
    pattern: /^https:\/\/click\.em\.constantcontact\.com\//,
    type: "redirect",
    name: "Constant Contact",
  },

  // ========================================
  // ActiveCampaign
  // ========================================
  {
    pattern: /^https:\/\/[^.]+\.activehosted\.com\/lt\.php/,
    type: "redirect",
    name: "ActiveCampaign",
  },

  // ========================================
  // Drip
  // ========================================
  {
    pattern: /^https:\/\/click\.dripemail\d?\.com\//,
    type: "redirect",
    name: "Drip",
  },

  // ========================================
  // Generic email tracking patterns
  // ========================================
  {
    pattern: /^https:\/\/links\.e\.[^/]+\//,
    type: "redirect",
    name: "Generic Email Links",
  },
  {
    pattern: /^https:\/\/click\.e\.[^/]+\//,
    type: "redirect",
    name: "Generic Email Click",
  },
  {
    pattern: /^https:\/\/email\..*\/c\//,
    type: "redirect",
    name: "Generic Email Redirect",
  },

  // ========================================
  // URL Shorteners
  // ========================================
  {
    pattern: /^https:\/\/bit\.ly\//,
    type: "redirect",
    name: "bit.ly",
  },
  {
    pattern: /^https?:\/\/t\.co\//,
    type: "redirect",
    name: "t.co (Twitter)",
  },
  {
    pattern: /^https:\/\/tinyurl\.com\//,
    type: "redirect",
    name: "TinyURL",
  },
  {
    pattern: /^https:\/\/ow\.ly\//,
    type: "redirect",
    name: "ow.ly (Hootsuite)",
  },
  {
    pattern: /^https:\/\/is\.gd\//,
    type: "redirect",
    name: "is.gd",
  },
  {
    pattern: /^https:\/\/goo\.gl\//,
    type: "redirect",
    name: "goo.gl (Google)",
  },
  {
    pattern: /^https:\/\/buff\.ly\//,
    type: "redirect",
    name: "buff.ly (Buffer)",
  },
  {
    pattern: /^https:\/\/j\.mp\//,
    type: "redirect",
    name: "j.mp (Bitly)",
  },
  {
    pattern: /^https:\/\/spr\.ly\//,
    type: "redirect",
    name: "spr.ly (Sprinklr)",
  },
  {
    pattern: /^https:\/\/lnkd\.in\//,
    type: "redirect",
    name: "lnkd.in (LinkedIn)",
  },
  {
    pattern: /^https:\/\/rb\.gy\//,
    type: "redirect",
    name: "rb.gy (Rebrandly)",
  },
  {
    pattern: /^https:\/\/cutt\.ly\//,
    type: "redirect",
    name: "cutt.ly",
  },
  {
    pattern: /^https:\/\/shorturl\.at\//,
    type: "redirect",
    name: "shorturl.at",
  },

  // ========================================
  // Social Media Link Tracking
  // ========================================
  {
    pattern: /^https:\/\/l\.facebook\.com\/l\.php/,
    type: "extract",
    extract: (url) => {
      try {
        const parsed = new URL(url);
        const dest = parsed.searchParams.get("u");
        return dest;
      } catch {
        return null;
      }
    },
    name: "Facebook External Link",
  },
  {
    pattern: /^https:\/\/www\.linkedin\.com\/redir\//,
    type: "redirect",
    name: "LinkedIn Redirect",
  },

  // ========================================
  // News aggregator redirects
  // ========================================
  {
    pattern: /^https:\/\/news\.google\.com\/rss\/articles\//,
    type: "redirect",
    name: "Google News RSS",
  },
  {
    pattern: /^https:\/\/feedproxy\.google\.com\//,
    type: "redirect",
    name: "Google Feedproxy",
  },
];

/**
 * Check if a URL matches any known redirect pattern
 */
export function matchRedirectPattern(url: string): RedirectPattern | null {
  for (const pattern of REDIRECT_PATTERNS) {
    if (pattern.pattern.test(url)) {
      return pattern;
    }
  }
  return null;
}

/**
 * Try to extract destination URL from a wrapper URL without making HTTP request
 */
export function tryExtractDestination(url: string): string | null {
  const pattern = matchRedirectPattern(url);
  if (pattern?.type === "extract" && pattern.extract) {
    return pattern.extract(url);
  }
  return null;
}

/**
 * Check if a URL is a known redirect/wrapper that needs resolution
 */
export function isKnownRedirect(url: string): boolean {
  return matchRedirectPattern(url) !== null;
}
