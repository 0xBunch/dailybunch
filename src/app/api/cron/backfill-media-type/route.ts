/**
 * Backfill Media Type Endpoint
 *
 * Sets mediaType for existing links that don't have one.
 * Run once to populate existing data.
 *
 * GET /api/cron/backfill-media-type
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { detectMediaType } from "@/lib/media-type";

const BATCH_SIZE = 500;

export async function GET() {
  try {
    // Get links without mediaType
    const links = await prisma.link.findMany({
      where: { mediaType: null },
      select: {
        id: true,
        canonicalUrl: true,
        domain: true,
      },
      take: BATCH_SIZE,
    });

    if (links.length === 0) {
      return NextResponse.json({
        status: "complete",
        message: "All links have mediaType set",
      });
    }

    // Process in batches for efficiency
    let updated = 0;
    const typeCount: Record<string, number> = {};

    for (const link of links) {
      const mediaType = detectMediaType(link.canonicalUrl);
      typeCount[mediaType] = (typeCount[mediaType] || 0) + 1;

      await prisma.link.update({
        where: { id: link.id },
        data: { mediaType },
      });

      updated++;
    }

    // Check remaining
    const remaining = await prisma.link.count({
      where: { mediaType: null },
    });

    console.log(
      `[Backfill] Updated ${updated} links. Types:`,
      typeCount,
      `Remaining: ${remaining}`
    );

    return NextResponse.json({
      status: "ok",
      updated,
      typeCount,
      remaining,
      message: remaining > 0 ? "Run again to process more" : "All complete",
    });
  } catch (error) {
    console.error("[Backfill] Error:", error);
    return NextResponse.json(
      { error: "Backfill failed", message: String(error) },
      { status: 500 }
    );
  }
}
