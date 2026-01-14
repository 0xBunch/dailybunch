import { NextRequest, NextResponse } from "next/server";
import { enrichPendingLinks, getEnrichmentStatus } from "@/features/ai/services/enrichment";

// POST /api/cron/enrich-links - Enrich pending links with AI
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting link enrichment...");

    const result = await enrichPendingLinks(10);

    console.log("Link enrichment complete:", result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Link enrichment error:", error);
    return NextResponse.json(
      { error: "Failed to enrich links" },
      { status: 500 }
    );
  }
}

// GET /api/cron/enrich-links - Get enrichment status
export async function GET(req: NextRequest) {
  try {
    const status = await getEnrichmentStatus();

    return NextResponse.json({
      status: "Enrichment service active",
      ...status,
    });
  } catch (error) {
    console.error("Enrichment status error:", error);
    return NextResponse.json(
      { error: "Failed to get enrichment status" },
      { status: 500 }
    );
  }
}
