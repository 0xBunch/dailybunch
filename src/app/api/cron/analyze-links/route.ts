import { NextRequest, NextResponse } from "next/server";
import { processUnanalyzedLinks } from "@/services/ai";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  if (providedSecret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting AI analysis cron job...");

    const result = await processUnanalyzedLinks(10);

    console.log(
      `AI analysis complete: ${result.processed} processed, ${result.errors} errors`
    );

    return NextResponse.json({
      message: "AI analysis complete",
      ...result,
    });
  } catch (error) {
    console.error("Error in AI analysis cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
