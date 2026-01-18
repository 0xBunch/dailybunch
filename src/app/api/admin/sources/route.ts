/**
 * Sources API
 *
 * Create new RSS sources.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;
  const includeOwnLinks = formData.get("includeOwnLinks") === "true";

  if (!name || !url) {
    return NextResponse.json(
      { error: "Name and URL are required" },
      { status: 400 }
    );
  }

  try {
    await prisma.source.create({
      data: {
        name,
        url,
        type: "rss",
        active: true,
        includeOwnLinks,
      },
    });

    return redirectTo(request, "/admin/sources");
  } catch (error) {
    console.error("Failed to create source:", error);
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    );
  }
}
