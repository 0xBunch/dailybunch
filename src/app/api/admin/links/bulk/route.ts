/**
 * Bulk Actions API for Links
 *
 * Supports bulk operations for Newsroom curation:
 * - promote: Mark links for public site promotion
 * - hide: Hide links from public site
 * - unhide: Remove hidden status
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

type BulkAction = "promote" | "hide" | "unhide";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { linkIds, action } = body as { linkIds: string[]; action: BulkAction };

    if (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
      return NextResponse.json(
        { error: "linkIds array is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "promote": {
        await prisma.link.updateMany({
          where: { id: { in: linkIds } },
          data: { promoted: true },
        });
        break;
      }

      case "hide": {
        await prisma.link.updateMany({
          where: { id: { in: linkIds } },
          data: { hidden: true },
        });
        break;
      }

      case "unhide": {
        await prisma.link.updateMany({
          where: { id: { in: linkIds } },
          data: { hidden: false },
        });
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      affectedCount: linkIds.length,
    });
  } catch (error) {
    console.error("Bulk action failed:", error);
    return NextResponse.json(
      { error: "Bulk action failed" },
      { status: 500 }
    );
  }
}
