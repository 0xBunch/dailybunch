/**
 * Narratives Cron Endpoint
 *
 * Generates AI summaries for story clusters missing narratives.
 *
 * Schedule: Every 6 hours via Railway cron (after clustering)
 *
 * GET /api/cron/narratives - Generate missing story narratives
 */

import { NextResponse } from "next/server";
import { generateMissingNarratives } from "@/lib/ai/narrative";

export async function GET() {
  try {
    const startTime = Date.now();
    const result = await generateMissingNarratives();
    const duration = Date.now() - startTime;

    console.log(
      `[Narratives] Completed in ${duration}ms:`,
      `${result.generated} generated,`,
      `${result.failed} failed.`
    );

    return NextResponse.json({
      status: "ok",
      ...result,
      durationMs: duration,
    });
  } catch (error) {
    console.error("[Narratives] Fatal error:", error);
    return NextResponse.json(
      { error: "Narrative generation failed", message: String(error) },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
