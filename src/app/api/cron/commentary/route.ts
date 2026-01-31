/**
 * Commentary Generation Cron Job
 *
 * Generates commentary for high-velocity links that don't have it yet.
 * Run via cron (e.g., every 6 hours) or manually triggered.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateMissingCommentary } from "@/lib/ai";
import { log } from "@/lib/logger";

export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow if CRON_SECRET matches or if in development
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "15");

  log.info("Starting commentary generation cron", { service: "cron", operation: "commentary", limit });

  try {
    const result = await generateMissingCommentary(limit);

    log.info("Commentary generation cron complete", {
      service: "cron",
      operation: "commentary",
      ...result,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Commentary generation cron failed", {
      service: "cron",
      operation: "commentary",
      error: message,
    });

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
