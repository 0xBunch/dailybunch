import { NextRequest, NextResponse } from "next/server";
import { analyzeUnanalyzedLinks } from "@/lib/analyze";

/**
 * AI Analysis Cron Endpoint
 *
 * Processes unanalyzed links through Claude for:
 * - Category classification
 * - Entity extraction
 * - Summary generation
 *
 * Protected by CRON_SECRET header.
 * Recommended: Run every 5-10 minutes via Railway cron or external scheduler.
 */

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get limit from query params (default 10)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await analyzeUnanalyzedLinks(limit);

    return NextResponse.json({
      status: "ok",
      ...result,
    });
  } catch (error) {
    console.error("Cron analyze error:", error);
    return NextResponse.json(
      { error: "Failed to analyze links" },
      { status: 500 }
    );
  }
}

// Also support GET for easier testing
export async function GET(request: NextRequest) {
  return POST(request);
}
