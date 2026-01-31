/**
 * URL Normalization Tests
 *
 * Tests for URL normalization functions (no network calls)
 */

import { describe, it, expect } from "vitest";
import {
  normalizeUrl,
  extractDomain,
  extractBaseDomain,
  shouldExclude,
  isSameDomain,
  isFromDomain,
  hasMeaningfulParams,
} from "../normalize";

describe("normalizeUrl", () => {
  // ========================================
  // Protocol normalization
  // ========================================
  describe("protocol normalization", () => {
    it("converts http to https", () => {
      expect(normalizeUrl("http://example.com/article")).toBe(
        "https://example.com/article"
      );
    });

    it("keeps https unchanged", () => {
      expect(normalizeUrl("https://example.com/article")).toBe(
        "https://example.com/article"
      );
    });

    it("handles http with port 80", () => {
      expect(normalizeUrl("http://example.com:80/article")).toBe(
        "https://example.com/article"
      );
    });

    it("handles https with port 443", () => {
      expect(normalizeUrl("https://example.com:443/article")).toBe(
        "https://example.com/article"
      );
    });

    it("preserves non-standard ports", () => {
      expect(normalizeUrl("https://example.com:8080/article")).toBe(
        "https://example.com:8080/article"
      );
    });
  });

  // ========================================
  // Hostname normalization
  // ========================================
  describe("hostname normalization", () => {
    it("lowercases hostname", () => {
      expect(normalizeUrl("https://EXAMPLE.COM/article")).toBe(
        "https://example.com/article"
      );
    });

    it("removes www prefix", () => {
      expect(normalizeUrl("https://www.example.com/article")).toBe(
        "https://example.com/article"
      );
    });

    it("removes WWW prefix (uppercase)", () => {
      expect(normalizeUrl("https://WWW.EXAMPLE.COM/article")).toBe(
        "https://example.com/article"
      );
    });

    it("keeps subdomains other than www", () => {
      expect(normalizeUrl("https://blog.example.com/article")).toBe(
        "https://blog.example.com/article"
      );
    });
  });

  // ========================================
  // Trailing slash normalization
  // ========================================
  describe("trailing slash normalization", () => {
    it("removes trailing slash from path", () => {
      expect(normalizeUrl("https://example.com/article/")).toBe(
        "https://example.com/article"
      );
    });

    it("keeps root path with trailing slash", () => {
      const result = normalizeUrl("https://example.com/");
      // Root path should normalize consistently
      expect(result).toMatch(/^https:\/\/example\.com\/?$/);
    });

    it("removes multiple trailing slashes", () => {
      expect(normalizeUrl("https://example.com/article///")).toBe(
        "https://example.com/article"
      );
    });

    it("collapses multiple slashes in path", () => {
      expect(normalizeUrl("https://example.com//article//page")).toBe(
        "https://example.com/article/page"
      );
    });
  });

  // ========================================
  // Fragment removal
  // ========================================
  describe("fragment removal", () => {
    it("removes fragment identifier", () => {
      expect(normalizeUrl("https://example.com/article#section1")).toBe(
        "https://example.com/article"
      );
    });

    it("removes empty fragment", () => {
      expect(normalizeUrl("https://example.com/article#")).toBe(
        "https://example.com/article"
      );
    });
  });

  // ========================================
  // UTM parameter stripping
  // ========================================
  describe("UTM parameter stripping", () => {
    it("strips utm_source", () => {
      expect(
        normalizeUrl("https://example.com/article?utm_source=newsletter")
      ).toBe("https://example.com/article");
    });

    it("strips utm_medium", () => {
      expect(
        normalizeUrl("https://example.com/article?utm_medium=email")
      ).toBe("https://example.com/article");
    });

    it("strips utm_campaign", () => {
      expect(
        normalizeUrl("https://example.com/article?utm_campaign=spring2024")
      ).toBe("https://example.com/article");
    });

    it("strips utm_term", () => {
      expect(
        normalizeUrl("https://example.com/article?utm_term=keyword")
      ).toBe("https://example.com/article");
    });

    it("strips utm_content", () => {
      expect(
        normalizeUrl("https://example.com/article?utm_content=cta_button")
      ).toBe("https://example.com/article");
    });

    it("strips all UTM parameters at once", () => {
      const url =
        "https://example.com/article?utm_source=newsletter&utm_medium=email&utm_campaign=spring&utm_term=keyword&utm_content=cta";
      expect(normalizeUrl(url)).toBe("https://example.com/article");
    });
  });

  // ========================================
  // Social/ad tracking parameter stripping
  // ========================================
  describe("social/ad tracking parameter stripping", () => {
    it("strips fbclid (Facebook)", () => {
      expect(
        normalizeUrl(
          "https://example.com/article?fbclid=IwAR123456789"
        )
      ).toBe("https://example.com/article");
    });

    it("strips gclid (Google Ads)", () => {
      expect(
        normalizeUrl("https://example.com/article?gclid=CjwKCAiA123")
      ).toBe("https://example.com/article");
    });

    it("strips msclkid (Microsoft Ads)", () => {
      expect(
        normalizeUrl("https://example.com/article?msclkid=abc123")
      ).toBe("https://example.com/article");
    });

    it("strips twclid (Twitter)", () => {
      expect(
        normalizeUrl("https://example.com/article?twclid=abc123")
      ).toBe("https://example.com/article");
    });
  });

  // ========================================
  // Email platform parameter stripping
  // ========================================
  describe("email platform parameter stripping", () => {
    it("strips mc_cid (Mailchimp campaign)", () => {
      expect(
        normalizeUrl("https://example.com/article?mc_cid=abc123")
      ).toBe("https://example.com/article");
    });

    it("strips mc_eid (Mailchimp email)", () => {
      expect(
        normalizeUrl("https://example.com/article?mc_eid=abc123")
      ).toBe("https://example.com/article");
    });

    it("strips ck_subscriber_id (ConvertKit)", () => {
      expect(
        normalizeUrl("https://example.com/article?ck_subscriber_id=12345")
      ).toBe("https://example.com/article");
    });
  });

  // ========================================
  // Preserves meaningful parameters
  // ========================================
  describe("preserves meaningful parameters", () => {
    it("keeps id parameter", () => {
      expect(normalizeUrl("https://example.com/article?id=12345")).toBe(
        "https://example.com/article?id=12345"
      );
    });

    it("keeps page parameter", () => {
      expect(normalizeUrl("https://example.com/articles?page=2")).toBe(
        "https://example.com/articles?page=2"
      );
    });

    it("keeps YouTube v parameter", () => {
      expect(normalizeUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
        "https://youtube.com/watch?v=dQw4w9WgXcQ"
      );
    });

    it("keeps search query parameter", () => {
      expect(normalizeUrl("https://example.com/search?q=test")).toBe(
        "https://example.com/search?q=test"
      );
    });

    it("strips tracking but keeps meaningful params", () => {
      expect(
        normalizeUrl(
          "https://example.com/article?id=123&utm_source=newsletter&page=2"
        )
      ).toBe("https://example.com/article?id=123&page=2");
    });
  });

  // ========================================
  // Query parameter sorting
  // ========================================
  describe("query parameter sorting", () => {
    it("sorts query parameters alphabetically", () => {
      expect(normalizeUrl("https://example.com/article?z=1&a=2&m=3")).toBe(
        "https://example.com/article?a=2&m=3&z=1"
      );
    });
  });

  // ========================================
  // Error handling
  // ========================================
  describe("error handling", () => {
    it("returns original for invalid URLs", () => {
      expect(normalizeUrl("not-a-valid-url")).toBe("not-a-valid-url");
    });

    it("returns original for empty string", () => {
      expect(normalizeUrl("")).toBe("");
    });
  });

  // ========================================
  // Real-world examples
  // ========================================
  describe("real-world examples", () => {
    it("normalizes NYTimes article URL", () => {
      const url =
        "https://www.nytimes.com/2024/01/15/technology/article.html?smid=tw-nytimes&smtyp=cur&utm_source=twitter&utm_medium=social";
      expect(normalizeUrl(url)).toBe(
        "https://nytimes.com/2024/01/15/technology/article.html"
      );
    });

    it("normalizes Substack post URL", () => {
      const url =
        "https://newsletter.substack.com/p/article-title?utm_source=post-email-title&publication_id=12345&isFreemail=true";
      // publication_id is not a tracking param, isFreemail might be kept
      const result = normalizeUrl(url);
      expect(result).toContain("https://newsletter.substack.com/p/article-title");
      expect(result).not.toContain("utm_source");
    });

    it("normalizes Medium article URL", () => {
      const url =
        "https://medium.com/@author/article-title-abc123?source=rss-abc123&utm_campaign=rss";
      const result = normalizeUrl(url);
      expect(result).toContain("https://medium.com/@author/article-title-abc123");
      expect(result).not.toContain("utm_campaign");
    });
  });
});

describe("extractDomain", () => {
  it("extracts domain from URL", () => {
    expect(extractDomain("https://www.example.com/article")).toBe(
      "example.com"
    );
  });

  it("removes www prefix", () => {
    expect(extractDomain("https://www.nytimes.com/article")).toBe(
      "nytimes.com"
    );
  });

  it("keeps subdomains", () => {
    expect(extractDomain("https://blog.example.com/post")).toBe(
      "blog.example.com"
    );
  });

  it("returns empty for invalid URL", () => {
    expect(extractDomain("not-a-url")).toBe("");
  });

  it("lowercases domain", () => {
    expect(extractDomain("https://EXAMPLE.COM/article")).toBe("example.com");
  });
});

describe("extractBaseDomain", () => {
  it("extracts base domain from subdomain", () => {
    expect(extractBaseDomain("https://blog.example.com")).toBe("example.com");
  });

  it("handles two-part TLDs", () => {
    expect(extractBaseDomain("https://news.bbc.co.uk")).toBe("bbc.co.uk");
  });

  it("returns domain as-is for simple domains", () => {
    expect(extractBaseDomain("https://example.com")).toBe("example.com");
  });
});

describe("shouldExclude", () => {
  it("excludes non-http protocols", () => {
    expect(shouldExclude("mailto:test@example.com")).toBe(true);
    expect(shouldExclude("javascript:void(0)")).toBe(true);
    expect(shouldExclude("tel:+1234567890")).toBe(true);
    expect(shouldExclude("ftp://files.example.com")).toBe(true);
  });

  it("excludes localhost", () => {
    expect(shouldExclude("http://localhost:3000")).toBe(true);
    expect(shouldExclude("http://127.0.0.1:8080")).toBe(true);
  });

  it("excludes IP addresses", () => {
    expect(shouldExclude("http://192.168.1.1/admin")).toBe(true);
  });

  it("allows valid http/https URLs", () => {
    expect(shouldExclude("https://example.com")).toBe(false);
    expect(shouldExclude("http://example.com")).toBe(false);
  });

  it("excludes invalid URLs", () => {
    expect(shouldExclude("not-a-url")).toBe(true);
  });
});

describe("isSameDomain", () => {
  it("returns true for same domain", () => {
    expect(
      isSameDomain("https://example.com/a", "https://example.com/b")
    ).toBe(true);
  });

  it("returns false for different domains", () => {
    expect(
      isSameDomain("https://example.com/a", "https://other.com/b")
    ).toBe(false);
  });

  it("ignores www prefix", () => {
    expect(
      isSameDomain("https://www.example.com/a", "https://example.com/b")
    ).toBe(true);
  });
});

describe("isFromDomain", () => {
  it("matches exact domain", () => {
    expect(isFromDomain("https://example.com/article", "example.com")).toBe(
      true
    );
  });

  it("matches subdomain", () => {
    expect(
      isFromDomain("https://blog.example.com/post", "example.com")
    ).toBe(true);
  });

  it("does not match different domain", () => {
    expect(isFromDomain("https://example.com/article", "other.com")).toBe(
      false
    );
  });
});

describe("hasMeaningfulParams", () => {
  it("returns false for only tracking params", () => {
    expect(
      hasMeaningfulParams("https://example.com?utm_source=test&fbclid=123")
    ).toBe(false);
  });

  it("returns true for meaningful params", () => {
    expect(hasMeaningfulParams("https://example.com?id=123")).toBe(true);
  });

  it("returns true for mixed params", () => {
    expect(
      hasMeaningfulParams("https://example.com?id=123&utm_source=test")
    ).toBe(true);
  });

  it("returns false for no params", () => {
    expect(hasMeaningfulParams("https://example.com/article")).toBe(false);
  });
});
