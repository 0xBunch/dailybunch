/**
 * Source Settings API
 *
 * Update source settings like includeOwnLinks toggle.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { redirectTo } from "@/lib/redirect";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();
  const includeOwnLinks = formData.get("includeOwnLinks") === "true";

  try {
    await prisma.source.update({
      where: { id },
      data: { includeOwnLinks },
    });

    return redirectTo(request, "/admin/sources");
  } catch (error) {
    console.error("Failed to update source:", error);
    return NextResponse.json(
      { error: "Failed to update source" },
      { status: 500 }
    );
  }
}
