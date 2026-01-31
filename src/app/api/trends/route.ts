/**
 * Trends API
 *
 * Returns rising links and hidden gems for display on the dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRisingLinks, getHiddenGems, getTopEntities, getRisingEntities } from "@/lib/trends";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "all";
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");

  try {
    switch (type) {
      case "rising":
        return NextResponse.json({
          success: true,
          data: await getRisingLinks(limit),
        });

      case "hidden-gems":
        return NextResponse.json({
          success: true,
          data: await getHiddenGems(limit),
        });

      case "top-entities":
        const period = (request.nextUrl.searchParams.get("period") || "week") as "week" | "month";
        return NextResponse.json({
          success: true,
          data: await getTopEntities(period, limit),
        });

      case "rising-entities":
        return NextResponse.json({
          success: true,
          data: await getRisingEntities(limit),
        });

      case "all":
      default:
        const [rising, hiddenGems, topEntities, risingEntities] = await Promise.all([
          getRisingLinks(5),
          getHiddenGems(5),
          getTopEntities("week", 10),
          getRisingEntities(5),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            rising,
            hiddenGems,
            topEntities,
            risingEntities,
          },
        });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
