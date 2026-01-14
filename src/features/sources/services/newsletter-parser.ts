import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import { extractDomain } from "@/lib/utils";

interface ParsedLink {
  url: string;
  title: string;
  context?: string;
}

interface ParseResult {
  success: boolean;
  linksFound: number;
  linksAdded: number;
  error?: string;
}

// Domains to exclude from link extraction
const excludedDomains = [
  "unsubscribe",
  "mailto:",
  "twitter.com",
  "facebook.com",
  "linkedin.com",
  "instagram.com",
  "youtube.com",
  "manage-preferences",
  "view-in-browser",
  "forward-to-friend",
];

// URL patterns to exclude
const excludedPatterns = [
  /unsubscribe/i,
  /manage.?preferences/i,
  /view.?in.?browser/i,
  /forward/i,
  /share/i,
  /privacy.?policy/i,
  /terms/i,
  /\.(gif|jpg|jpeg|png|svg|ico)$/i,
];

export function extractLinksFromHtml(html: string): ParsedLink[] {
  const $ = cheerio.load(html);
  const links: ParsedLink[] = [];
  const seenUrls = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    // Skip excluded domains and patterns
    const isExcluded =
      excludedDomains.some((domain) => href.toLowerCase().includes(domain)) ||
      excludedPatterns.some((pattern) => pattern.test(href));

    if (isExcluded) return;

    // Try to normalize URL
    let url: string;
    try {
      const parsed = new URL(href);
      // Only include http/https links
      if (!["http:", "https:"].includes(parsed.protocol)) return;
      url = parsed.toString();
    } catch {
      // Skip invalid URLs
      return;
    }

    // Skip duplicates
    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    // Get link text as title
    let title = $(element).text().trim();
    if (!title || title.length < 3) {
      // Try to get title from surrounding context
      const parent = $(element).parent();
      title = parent.text().trim().slice(0, 200);
    }

    // Get surrounding context
    const parent = $(element).parent();
    const context = parent.next("p, div").text().trim().slice(0, 300);

    links.push({
      url,
      title: title || url,
      context,
    });
  });

  return links;
}

export async function resolveRedirect(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": "DailyBunch/1.0 (+https://dailybunch.com)",
      },
    });

    // Return the final URL after redirects
    return response.url;
  } catch {
    // Return original URL if resolution fails
    return url;
  }
}

export async function processNewsletterEmail(
  newsletterId: string,
  subject: string | undefined,
  html: string
): Promise<ParseResult> {
  try {
    // Create issue record
    const issue = await prisma.newsletterIssue.create({
      data: {
        newsletterId,
        subject,
        rawHtml: html,
      },
    });

    // Extract links
    const rawLinks = extractLinksFromHtml(html);
    let linksAdded = 0;

    for (const rawLink of rawLinks) {
      try {
        // Resolve redirects
        const resolvedUrl = await resolveRedirect(rawLink.url);
        const domain = extractDomain(resolvedUrl);

        // Upsert link
        const link = await prisma.link.upsert({
          where: { url: resolvedUrl },
          create: {
            url: resolvedUrl,
            title: rawLink.title,
            description: rawLink.context,
            domain,
            status: "PENDING",
          },
          update: {
            // Only update if no description exists
            description: rawLink.context || undefined,
          },
        });

        // Create mention record
        await prisma.mention.upsert({
          where: {
            linkId_sourceType_sourceId: {
              linkId: link.id,
              sourceType: "NEWSLETTER",
              sourceId: newsletterId,
            },
          },
          create: {
            linkId: link.id,
            sourceType: "NEWSLETTER",
            sourceId: newsletterId,
          },
          update: {},
        });

        linksAdded++;
      } catch (error) {
        console.error(`Error processing link ${rawLink.url}:`, error);
      }
    }

    // Update issue with link count
    await prisma.newsletterIssue.update({
      where: { id: issue.id },
      data: {
        linkCount: linksAdded,
        processedAt: new Date(),
      },
    });

    // Update newsletter last received
    await prisma.newsletter.update({
      where: { id: newsletterId },
      data: {
        lastReceivedAt: new Date(),
        lastError: null,
      },
    });

    return {
      success: true,
      linksFound: rawLinks.length,
      linksAdded,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await prisma.newsletter.update({
      where: { id: newsletterId },
      data: { lastError: errorMessage },
    });

    return {
      success: false,
      linksFound: 0,
      linksAdded: 0,
      error: errorMessage,
    };
  }
}

// Generate unique inbox email for newsletter
export function generateInboxEmail(newsletterName: string): string {
  const slug = newsletterName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 20);
  const random = Math.random().toString(36).substring(2, 8);
  const domain = process.env.INBOUND_EMAIL_DOMAIN || "ingest.dailybunch.com";
  return `${slug}-${random}@${domain}`;
}
