import { NextRequest, NextResponse } from "next/server";
import { fetchAllRssFeeds, seedDefaultFeeds } from "@/features/sources/services/rss-fetcher";

// POST /api/cron/fetch-rss - Fetch all RSS feeds
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting RSS fetch...");

    const results = await fetchAllRssFeeds();

    const summary = {
      totalFeeds: results.length,
      successfulFeeds: results.filter((r) => r.success).length,
      failedFeeds: results.filter((r) => !r.success).length,
      totalLinksFound: results.reduce((acc, r) => acc + r.linksFound, 0),
      totalLinksAdded: results.reduce((acc, r) => acc + r.linksAdded, 0),
      results,
    };

    console.log("RSS fetch complete:", summary);

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error("RSS fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch RSS feeds" },
      { status: 500 }
    );
  }
}

// GET /api/cron/fetch-rss - Manual trigger (for testing)
export async function GET(req: NextRequest) {
  // Check if this is a seed request
  const seed = req.nextUrl.searchParams.get("seed");

  if (seed === "true") {
    try {
      const added = await seedDefaultFeeds();
      return NextResponse.json({
        success: true,
        message: `Seeded ${added} default feeds`,
      });
    } catch (error) {
      console.error("Seed error:", error);
      return NextResponse.json(
        { error: "Failed to seed feeds" },
        { status: 500 }
      );
    }
  }

  // Otherwise, perform a fetch
  return POST(req);
}
