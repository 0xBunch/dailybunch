import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLinksForEdition, composeNewsletter } from "@/features/newsletter/services/composer";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { linkIds } = body;

    // Get links for the edition
    const links = await getLinksForEdition({
      linkIds,
      autoSelect: !linkIds || linkIds.length === 0,
      limit: 10,
    });

    if (links.length === 0) {
      return NextResponse.json(
        { error: "No links available for preview" },
        { status: 400 }
      );
    }

    // Generate preview HTML
    const html = await composeNewsletter(links);

    return NextResponse.json({
      html,
      links,
      linkCount: links.length,
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    );
  }
}
