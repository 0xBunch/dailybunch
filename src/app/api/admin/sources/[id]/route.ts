/**
 * Source Settings API
 *
 * Update source settings like includeOwnLinks and showOnDashboard toggles.
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

  // Build update data based on which field was submitted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (formData.has("includeOwnLinks")) {
    updateData.includeOwnLinks = formData.get("includeOwnLinks") === "true";
  }

  if (formData.has("showOnDashboard")) {
    updateData.showOnDashboard = formData.get("showOnDashboard") === "true";
  }

  try {
    await prisma.source.update({
      where: { id },
      data: updateData,
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
