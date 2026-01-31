/**
 * Manual Link Processing Endpoint
 *
 * Accepts a URL, canonicalizes it, fetches metadata, and stores it.
 * Used for the manual link entry form.
 *
 * Error Handling:
 * - Graceful degradation on canonicalization failure
 * - Status tracking for failed canonicalizations
 * - needsManualReview flag for links requiring attention
 * - Structured logging for all operations
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { canonicalizeUrl } from "@/lib/canonicalize";
import { detectMediaType } from "@/lib/media-type";
import { log } from "@/lib/logger";
import { wrapError } from "@/lib/errors";
import { withRetryResult, RetryPresets } from "@/lib/retry";

// Timeout for metadata fetch (ms)
const METADATA_TIMEOUT = 10000;

// Fetch metadata from a URL with retry
async function fetchMetadata(url: string): Promise<{
  title?: string;
  description?: string;
  imageUrl?: string;
  error?: string;
}> {
  const context = { service: "links", operation: "fetchMetadata", url };

  const result = await withRetryResult(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), METADATA_TIMEOUT);

      const startTime = performance.now();

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)",
          },
        });

        clearTimeout(timeoutId);
        const durationMs = Math.round(performance.now() - startTime);

        log.externalCall("metadata", "GET", url, durationMs, response.status);

        if (!response.ok) {
          return {};
        }

        const html = await response.text();

        // Extract title
        let title: string | undefined;
        const ogTitleMatch = html.match(
          /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
        );
        const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        title = ogTitleMatch?.[1] || titleTagMatch?.[1];

        // Extract description
        let description: string | undefined;
        const ogDescMatch = html.match(
          /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
        );
        const metaDescMatch = html.match(
          /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
        );
        description = ogDescMatch?.[1] || metaDescMatch?.[1];

        // Extract image
        let imageUrl: string | undefined;
        const ogImageMatch = html.match(
          /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
        );
        imageUrl = ogImageMatch?.[1];

        return {
          title: title?.trim(),
          description: description?.trim().substring(0, 500),
          imageUrl,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    context,
    RetryPresets.metadata // No retry for metadata
  );

  if (result.success) {
    return result.data;
  }

  // Return empty metadata on failure (graceful degradation)
  log.warn("Metadata fetch failed", {
    ...context,
    errorCode: result.error.code,
    errorMessage: result.error.message,
  });

  return { error: result.error.message };
}

// Check if URL matches blacklist
async function isBlacklisted(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "");

    const blacklistEntry = await prisma.blacklist.findFirst({
      where: {
        OR: [
          { type: "domain", pattern: domain },
          { type: "domain", pattern: `www.${domain}` },
          { type: "url", pattern: url },
        ],
      },
    });

    return !!blacklistEntry;
  } catch {
    return true;
  }
}

export async function POST(request: NextRequest) {
  const op = log.operationStart("api", "links/process", {});

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      op.end({ status: "failed", reason: "missing_url" });
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      op.end({ status: "failed", reason: "invalid_url" });
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    log.info("Processing manual link", {
      service: "links",
      operation: "process",
      url: url.slice(0, 100),
    });

    // Step 1: Check blacklist
    if (await isBlacklisted(url)) {
      op.end({ status: "failed", reason: "blacklisted" });
      return NextResponse.json(
        { error: "URL is blacklisted" },
        { status: 400 }
      );
    }

    // Step 2: Canonicalize
    const canonResult = await canonicalizeUrl(url);

    // Log canonicalization result
    if (canonResult.status === "failed") {
      log.warn("Canonicalization failed for manual link", {
        service: "links",
        operation: "canonicalize",
        url: url.slice(0, 100),
        error: canonResult.error,
      });
    }

    // Step 3: Check canonical URL blacklist
    if (await isBlacklisted(canonResult.canonicalUrl)) {
      op.end({ status: "failed", reason: "canonical_blacklisted" });
      return NextResponse.json(
        { error: "Canonical URL is blacklisted" },
        { status: 400 }
      );
    }

    // Step 4: Check if link already exists
    const existingLink = await prisma.link.findUnique({
      where: { canonicalUrl: canonResult.canonicalUrl },
      include: {
        category: true,
        subcategory: true,
        entities: {
          include: { entity: true },
        },
        mentions: {
          include: { source: true },
        },
      },
    });

    if (existingLink) {
      // Update lastSeenAt and return existing data
      await prisma.link.update({
        where: { id: existingLink.id },
        data: { lastSeenAt: new Date() },
      });

      op.end({ status: "exists", linkId: existingLink.id });

      return NextResponse.json({
        status: "exists",
        link: {
          id: existingLink.id,
          canonicalUrl: existingLink.canonicalUrl,
          originalUrl: existingLink.originalUrl,
          domain: existingLink.domain,
          title: existingLink.title,
          description: existingLink.description,
          imageUrl: existingLink.imageUrl,
          aiSummary: existingLink.aiSummary,
          category: existingLink.category,
          subcategory: existingLink.subcategory,
          entities: existingLink.entities.map((le) => le.entity),
          velocity: existingLink.mentions.length,
          sources: existingLink.mentions.map((m) => m.source.name),
          firstSeenAt: existingLink.firstSeenAt,
          lastSeenAt: existingLink.lastSeenAt,
          canonicalStatus: existingLink.canonicalStatus,
          needsManualReview: existingLink.needsManualReview,
        },
        redirectChain: canonResult.redirectChain,
      });
    }

    // Step 5: Fetch metadata for new links
    const metadata = await fetchMetadata(canonResult.canonicalUrl);

    // Step 6: Detect media type and create new link with status tracking
    const mediaType = detectMediaType(canonResult.canonicalUrl);

    const newLink = await prisma.link.create({
      data: {
        canonicalUrl: canonResult.canonicalUrl,
        originalUrl: url,
        domain: canonResult.domain,
        title: metadata.title || null,
        description: metadata.description || null,
        imageUrl: metadata.imageUrl || null,
        // Track canonicalization status
        canonicalStatus: canonResult.status,
        canonicalError: canonResult.error || null,
        needsManualReview: canonResult.status === "failed",
        // Content type
        mediaType,
      },
    });

    log.info("Created new link from manual entry", {
      service: "links",
      operation: "create",
      linkId: newLink.id,
      canonicalStatus: canonResult.status,
      needsManualReview: canonResult.status === "failed",
    });

    op.end({
      status: "created",
      linkId: newLink.id,
      canonicalStatus: canonResult.status,
    });

    return NextResponse.json({
      status: "created",
      link: {
        id: newLink.id,
        canonicalUrl: newLink.canonicalUrl,
        originalUrl: newLink.originalUrl,
        domain: newLink.domain,
        title: newLink.title,
        description: newLink.description,
        imageUrl: newLink.imageUrl,
        aiSummary: null,
        category: null,
        subcategory: null,
        entities: [],
        velocity: 0,
        sources: [],
        firstSeenAt: newLink.firstSeenAt,
        lastSeenAt: newLink.lastSeenAt,
        canonicalStatus: newLink.canonicalStatus,
        needsManualReview: newLink.needsManualReview,
      },
      redirectChain: canonResult.redirectChain,
      message:
        canonResult.status === "failed"
          ? "Link created with original URL (redirect following failed). AI analysis will run asynchronously."
          : "Link created. AI analysis will run asynchronously.",
      metadataError: metadata.error,
    });
  } catch (error) {
    const serviceError = wrapError(error, {
      service: "links",
      operation: "process",
    });

    log.error(serviceError);
    op.end({ status: "failed", errorCode: serviceError.code });

    return NextResponse.json(
      { error: "Failed to process link", errorCode: serviceError.code },
      { status: 500 }
    );
  }
}
