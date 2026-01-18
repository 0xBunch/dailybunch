import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { canonicalizeUrl } from "@/lib/canonicalize";

/**
 * Manual Link Processing Endpoint
 *
 * Accepts a URL, canonicalizes it, fetches metadata, and stores it.
 * Used for the manual link entry form.
 */

// Fetch metadata from a URL
async function fetchMetadata(url: string): Promise<{
  title?: string;
  description?: string;
  imageUrl?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; DailyBunch/1.0; +https://dailybunch.com)",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {};
    }

    const html = await response.text();

    // Extract title
    let title: string | undefined;
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = ogTitleMatch?.[1] || titleTagMatch?.[1];

    // Extract description
    let description: string | undefined;
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    description = ogDescMatch?.[1] || metaDescMatch?.[1];

    // Extract image
    let imageUrl: string | undefined;
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    imageUrl = ogImageMatch?.[1];

    return {
      title: title?.trim(),
      description: description?.trim().substring(0, 500),
      imageUrl,
    };
  } catch {
    return {};
  }
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
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Step 1: Check blacklist
    if (await isBlacklisted(url)) {
      return NextResponse.json(
        { error: "URL is blacklisted" },
        { status: 400 }
      );
    }

    // Step 2: Canonicalize
    const canonResult = await canonicalizeUrl(url);

    // Step 3: Check canonical URL blacklist
    if (await isBlacklisted(canonResult.canonicalUrl)) {
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
        },
        redirectChain: canonResult.redirectChain,
      });
    }

    // Step 5: Fetch metadata for new links
    const metadata = await fetchMetadata(canonResult.canonicalUrl);

    // Step 6: Create new link
    const newLink = await prisma.link.create({
      data: {
        canonicalUrl: canonResult.canonicalUrl,
        originalUrl: url,
        domain: canonResult.domain,
        title: metadata.title || null,
        description: metadata.description || null,
        imageUrl: metadata.imageUrl || null,
      },
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
      },
      redirectChain: canonResult.redirectChain,
      message: "Link created. AI analysis will run asynchronously.",
    });
  } catch (error) {
    console.error("Link processing error:", error);
    return NextResponse.json(
      { error: "Failed to process link" },
      { status: 500 }
    );
  }
}
