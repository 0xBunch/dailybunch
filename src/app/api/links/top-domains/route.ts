import { NextRequest, NextResponse } from "next/server";
import { getTopDomains } from "@/features/links/services/trending";
import type { TrendingPeriod } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") as TrendingPeriod) || "week";
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const domains = await getTopDomains(period, limit);

    return NextResponse.json({ domains });
  } catch (error) {
    console.error("Top domains fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch top domains" },
      { status: 500 }
    );
  }
}
