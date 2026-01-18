import { NextRequest, NextResponse } from "next/server";
import { getLinksWithVelocity } from "@/services/links";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const hours = parseInt(searchParams.get("hours") || "24");
    const categoryId = searchParams.get("categoryId") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const links = await getLinksWithVelocity({
      hours,
      categoryId,
      entityId,
      limit,
      offset,
    });

    return NextResponse.json({ links });
  } catch (error) {
    console.error("Error fetching links:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
