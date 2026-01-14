import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLinksForEdition, sendNewsletter } from "@/features/newsletter/services/composer";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // Require admin role or cron secret
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isAdmin =
      session?.user?.role === "ADMIN" || session?.user?.role === "SUPERADMIN";

    if (!isCron && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { linkIds, testEmail, dryRun } = body;

    // Get links for the edition
    const links = await getLinksForEdition({
      linkIds,
      autoSelect: !linkIds || linkIds.length === 0,
      limit: 10,
    });

    if (links.length === 0) {
      return NextResponse.json(
        { error: "No links available for newsletter" },
        { status: 400 }
      );
    }

    // Send the newsletter
    const result = await sendNewsletter(links, { testEmail, dryRun });

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      editionId: result.editionId,
      linksIncluded: links.length,
    });
  } catch (error) {
    console.error("Newsletter send error:", error);
    return NextResponse.json(
      { error: "Failed to send newsletter" },
      { status: 500 }
    );
  }
}
