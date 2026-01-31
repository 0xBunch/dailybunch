/**
 * Cultural Analysis Cron Job
 *
 * Analyzes high-velocity links that haven't been culturally analyzed yet.
 * Run via cron (e.g., every 6 hours) or manually triggered.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeHighVelocityLinks } from "@/lib/ai";
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

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");

  log.info("Starting cultural analysis cron", { service: "cron", operation: "cultural-analysis", limit });

  try {
    const result = await analyzeHighVelocityLinks(limit);

    log.info("Cultural analysis cron complete", {
      service: "cron",
      operation: "cultural-analysis",
      ...result,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Cultural analysis cron failed", {
      service: "cron",
      operation: "cultural-analysis",
      error: message,
    });

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
