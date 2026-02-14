/**
 * OPML Import API
 *
 * Parses OPML files and bulk imports RSS sources.
 * - Supports nested outline structures
 * - Skips duplicates (by URL)
 * - Returns import summary with skipped/added counts
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

interface OPMLOutline {
  title?: string;
  text?: string;
  xmlUrl?: string;
  htmlUrl?: string;
  type?: string;
  children?: OPMLOutline[];
}

function parseOPML(opmlContent: string): OPMLOutline[] {
  const outlines: OPMLOutline[] = [];

  // Extract all outline elements with their attributes
  const outlineRegex = /<outline\s+([^>]+?)(?:\/>|>[\s\S]*?<\/outline>)/gi;
  let match;

  while ((match = outlineRegex.exec(opmlContent)) !== null) {
    const attrString = match[1];

    // Parse attributes
    const getAttr = (name: string): string | undefined => {
      const attrRegex = new RegExp(`${name}=["']([^"']+)["']`, "i");
      const attrMatch = attrString.match(attrRegex);
      return attrMatch?.[1];
    };

    const outline: OPMLOutline = {
      title: getAttr("title"),
      text: getAttr("text"),
      xmlUrl: getAttr("xmlUrl"),
      htmlUrl: getAttr("htmlUrl"),
      type: getAttr("type"),
    };

    // Only add if it has an RSS URL
    if (outline.xmlUrl) {
      outlines.push(outline);
    }
  }

  return outlines;
}

function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const opmlContent = await file.text();
    const outlines = parseOPML(opmlContent);

    if (outlines.length === 0) {
      return NextResponse.json(
        { error: "No RSS feeds found in OPML file" },
        { status: 400 }
      );
    }

    // Get existing source URLs
    const existingUrls = await prisma.source.findMany({
      select: { url: true },
    });
    const existingUrlSet = new Set(existingUrls.map((s) => s.url?.toLowerCase()));

    // Separate feeds into new and duplicates
    const newFeeds: OPMLOutline[] = [];
    const duplicates: OPMLOutline[] = [];

    for (const outline of outlines) {
      if (outline.xmlUrl && existingUrlSet.has(outline.xmlUrl.toLowerCase())) {
        duplicates.push(outline);
      } else {
        newFeeds.push(outline);
      }
    }

    // Preview mode - just return what would be imported
    const previewOnly = formData.get("preview") === "true";
    if (previewOnly) {
      return NextResponse.json({
        preview: true,
        total: outlines.length,
        newFeeds: newFeeds.map((f) => ({
          name: f.title || f.text || "Untitled",
          url: f.xmlUrl,
        })),
        duplicates: duplicates.map((f) => ({
          name: f.title || f.text || "Untitled",
          url: f.xmlUrl,
        })),
      });
    }

    // Create new sources
    const created = await prisma.source.createMany({
      data: newFeeds.map((outline) => ({
        name: outline.title || outline.text || "Untitled Feed",
        url: outline.xmlUrl!,
        type: "rss",
        active: true,
        tier: "TIER_3",
        pollFrequency: "realtime",
        baseDomain: extractDomain(outline.xmlUrl!) || undefined,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      imported: created.count,
      skipped: duplicates.length,
      total: outlines.length,
      duplicates: duplicates.map((f) => ({
        name: f.title || f.text || "Untitled",
        url: f.xmlUrl,
      })),
    });
  } catch (error) {
    console.error("OPML import failed:", error);
    return NextResponse.json(
      { error: "Failed to import OPML" },
      { status: 500 }
    );
  }
}
