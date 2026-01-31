/**
 * Redirect Pattern Tests
 *
 * Tests for known redirect pattern matching (no network calls)
 */

import { describe, it, expect } from "vitest";
import {
  matchRedirectPattern,
  tryExtractDestination,
  isKnownRedirect,
  REDIRECT_PATTERNS,
} from "../patterns";

describe("matchRedirectPattern", () => {
  // ========================================
  // Substack patterns
  // ========================================
  describe("Substack patterns", () => {
    it("matches Substack mg email redirect", () => {
      const url = "https://email.mg1.substack.com/c/abc123xyz";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
      expect(match?.name).toContain("Substack");
    });

    it("matches Substack mg2 email redirect", () => {
      const url = "https://email.mg2.substack.com/c/def456";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });

    it("matches Substack redirect path", () => {
      const url = "https://substack.com/redirect/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });

    it("matches publication-specific Substack redirect", () => {
      const url = "https://newsletter.substack.com/redirect/xyz";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });
  });

  // ========================================
  // Beehiiv patterns
  // ========================================
  describe("Beehiiv patterns", () => {
    it("matches Beehiiv mail link", () => {
      const url = "https://link.mail.beehiiv.com/ss/c/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
      expect(match?.name).toContain("Beehiiv");
    });

    it("matches Beehiiv clicks", () => {
      const url = "https://newsletter.beehiiv.com/clicks/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });
  });

  // ========================================
  // ConvertKit patterns
  // ========================================
  describe("ConvertKit patterns", () => {
    it("matches ConvertKit click", () => {
      const url = "https://click.convertkit-mail.com/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
      expect(match?.name).toContain("ConvertKit");
    });

    it("matches ConvertKit numbered domains", () => {
      const url = "https://click.convertkit-mail2.com/xyz789";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });
  });

  // ========================================
  // Mailchimp patterns
  // ========================================
  describe("Mailchimp patterns", () => {
    it("matches Mailchimp click", () => {
      const url = "https://click.mailchimp.com/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
      expect(match?.name).toContain("Mailchimp");
    });

    it("matches list-manage track click", () => {
      const url = "https://xyz.list-manage.com/track/click?u=abc&id=123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });
  });

  // ========================================
  // URL shorteners
  // ========================================
  describe("URL shorteners", () => {
    it("matches bit.ly", () => {
      const url = "https://bit.ly/3abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
      expect(match?.name).toBe("bit.ly");
    });

    it("matches t.co (Twitter)", () => {
      const url = "https://t.co/abc123XYZ";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
      expect(match?.name).toContain("t.co");
    });

    it("matches http t.co", () => {
      const url = "http://t.co/abc123XYZ";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });

    it("matches tinyurl.com", () => {
      const url = "https://tinyurl.com/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
      expect(match?.name).toBe("TinyURL");
    });

    it("matches ow.ly (Hootsuite)", () => {
      const url = "https://ow.ly/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });

    it("matches is.gd", () => {
      const url = "https://is.gd/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });

    it("matches goo.gl", () => {
      const url = "https://goo.gl/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });

    it("matches buff.ly (Buffer)", () => {
      const url = "https://buff.ly/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });

    it("matches lnkd.in (LinkedIn)", () => {
      const url = "https://lnkd.in/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });
  });

  // ========================================
  // Other email platforms
  // ========================================
  describe("other email platforms", () => {
    it("matches Buttondown links", () => {
      const url = "https://links.buttondown.email/ss/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
      expect(match?.name).toContain("Buttondown");
    });

    it("matches Campaign Monitor", () => {
      const url = "https://link.mail.campaignmonitor.com/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });

    it("matches Postmark", () => {
      const url = "https://click.pstmrk.it/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });

    it("matches SendGrid", () => {
      const url = "https://u12345.ct.sendgrid.net/abc123";
      const match = matchRedirectPattern(url);
      expect(match).not.toBeNull();
    });
  });

  // ========================================
  // Non-matching URLs
  // ========================================
  describe("non-matching URLs", () => {
    it("does not match regular article URLs", () => {
      expect(matchRedirectPattern("https://nytimes.com/article")).toBeNull();
      expect(matchRedirectPattern("https://stratechery.com/post")).toBeNull();
      expect(matchRedirectPattern("https://example.com/page")).toBeNull();
    });

    it("does not match similar but different domains", () => {
      expect(matchRedirectPattern("https://notbitly.com/abc")).toBeNull();
      expect(matchRedirectPattern("https://substack.org/redirect")).toBeNull();
    });
  });
});

describe("tryExtractDestination", () => {
  describe("Substack URI extraction", () => {
    it("extracts destination from Substack redirect with URI param", () => {
      const url =
        "https://substack.com/redirect/abc123?uri=https%3A%2F%2Fexample.com%2Farticle";
      const destination = tryExtractDestination(url);
      expect(destination).toBe("https://example.com/article");
    });
  });

  describe("Mailchimp URL extraction", () => {
    it("extracts destination from list-manage URL param", () => {
      const url =
        "https://abc.list-manage.com/track/click?u=123&id=456&url=https%3A%2F%2Fexample.com%2Fpage";
      const destination = tryExtractDestination(url);
      expect(destination).toBe("https://example.com/page");
    });
  });

  describe("Facebook extraction", () => {
    it("extracts destination from Facebook l.php", () => {
      const url =
        "https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Farticle";
      const destination = tryExtractDestination(url);
      expect(destination).toBe("https://example.com/article");
    });
  });

  describe("non-extractable URLs", () => {
    it("returns null for redirect-only patterns", () => {
      // bit.ly needs to be followed, not extracted
      expect(tryExtractDestination("https://bit.ly/abc123")).toBeNull();
    });

    it("returns null for regular URLs", () => {
      expect(tryExtractDestination("https://example.com/article")).toBeNull();
    });
  });
});

describe("isKnownRedirect", () => {
  it("returns true for known redirect patterns", () => {
    expect(isKnownRedirect("https://bit.ly/abc123")).toBe(true);
    expect(isKnownRedirect("https://t.co/xyz789")).toBe(true);
    expect(isKnownRedirect("https://email.mg1.substack.com/c/abc")).toBe(true);
    expect(isKnownRedirect("https://click.convertkit-mail.com/xyz")).toBe(true);
  });

  it("returns false for regular URLs", () => {
    expect(isKnownRedirect("https://example.com/article")).toBe(false);
    expect(isKnownRedirect("https://nytimes.com/2024/article")).toBe(false);
    expect(isKnownRedirect("https://stratechery.com/post")).toBe(false);
  });
});

describe("REDIRECT_PATTERNS coverage", () => {
  it("has patterns for major email platforms", () => {
    const platformNames = REDIRECT_PATTERNS.map((p) => p.name);
    expect(platformNames.some((n) => n.includes("Substack"))).toBe(true);
    expect(platformNames.some((n) => n.includes("Beehiiv"))).toBe(true);
    expect(platformNames.some((n) => n.includes("ConvertKit"))).toBe(true);
    expect(platformNames.some((n) => n.includes("Mailchimp"))).toBe(true);
    expect(platformNames.some((n) => n.includes("Buttondown"))).toBe(true);
  });

  it("has patterns for major URL shorteners", () => {
    const platformNames = REDIRECT_PATTERNS.map((p) => p.name);
    expect(platformNames.some((n) => n.includes("bit.ly"))).toBe(true);
    expect(platformNames.some((n) => n.includes("t.co"))).toBe(true);
    expect(platformNames.some((n) => n.includes("TinyURL"))).toBe(true);
  });

  it("has at least 20 patterns", () => {
    expect(REDIRECT_PATTERNS.length).toBeGreaterThanOrEqual(20);
  });
});
