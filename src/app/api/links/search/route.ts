import { NextRequest, NextResponse } from "next/server";
import { searchLinks } from "@/features/links/services/trending";

// GET /api/links/search
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const result = await searchLinks(query, { limit, offset });

    return NextResponse.json({
      ...result,
      query,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search links" },
      { status: 500 }
    );
  }
}
