import { NextRequest, NextResponse } from "next/server";
import { getTrendingLinks, getTopDomains } from "@/features/links/services/trending";
import type { TrendingPeriod } from "@/types";

// GET /api/links/trending
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const period = (searchParams.get("period") || "day") as TrendingPeriod;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const domain = searchParams.get("domain") || undefined;
    const includeDomains = searchParams.get("includeDomains") === "true";

    const result = await getTrendingLinks({
      period,
      limit,
      offset,
      domain,
    });

    // Optionally include top domains
    let topDomains = null;
    if (includeDomains) {
      topDomains = await getTopDomains(period, 10);
    }

    return NextResponse.json({
      ...result,
      period,
      topDomains,
    });
  } catch (error) {
    console.error("Trending fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending links" },
      { status: 500 }
    );
  }
}
