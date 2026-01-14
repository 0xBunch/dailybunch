import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecentEditions } from "@/features/newsletter/services/composer";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const editions = await getRecentEditions(20);

    return NextResponse.json({ editions });
  } catch (error) {
    console.error("Editions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch editions" },
      { status: 500 }
    );
  }
}
