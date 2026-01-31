/**
 * Trends Update Cron Job
 *
 * Updates entity velocity metrics and trend calculations.
 * Run via cron (e.g., every 6 hours) or manually triggered.
 */

import { NextRequest, NextResponse } from "next/server";
import { updateEntityVelocities } from "@/lib/trends";
import { log } from "@/lib/logger";

export const maxDuration = 120; // 2 minutes max

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow if CRON_SECRET matches or if in development
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  log.info("Starting trends update cron", { service: "cron", operation: "trends" });

  try {
    const result = await updateEntityVelocities();

    log.info("Trends update cron complete", {
      service: "cron",
      operation: "trends",
      ...result,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("Trends update cron failed", {
      service: "cron",
      operation: "trends",
      error: message,
    });

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
