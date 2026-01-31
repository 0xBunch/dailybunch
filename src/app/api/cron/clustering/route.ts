/**
 * Clustering Cron Endpoint
 *
 * Groups related links into stories using embedding similarity.
 *
 * Schedule: Every 6 hours via Railway cron
 *
 * GET /api/cron/clustering - Run story clustering
 */

import { NextResponse } from "next/server";
import { runClustering } from "@/lib/clustering";

export async function GET() {
  try {
    const startTime = Date.now();
    const result = await runClustering();
    const duration = Date.now() - startTime;

    console.log(
      `[Clustering] Completed in ${duration}ms:`,
      `${result.processed} links processed,`,
      `${result.clustersCreated} new stories,`,
      `${result.linksGrouped} links grouped.`
    );

    return NextResponse.json({
      status: "ok",
      ...result,
      durationMs: duration,
    });
  } catch (error) {
    console.error("[Clustering] Fatal error:", error);
    return NextResponse.json(
      { error: "Clustering failed", message: String(error) },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
