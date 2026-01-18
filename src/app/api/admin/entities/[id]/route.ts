/**
 * Entity Settings API
 *
 * Toggle entity active status.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();
  const active = formData.get("active") === "true";

  try {
    await prisma.entity.update({
      where: { id },
      data: { active },
    });

    return NextResponse.redirect(new URL("/admin/entities", request.url));
  } catch (error) {
    console.error("Failed to update entity:", error);
    return NextResponse.json(
      { error: "Failed to update entity" },
      { status: 500 }
    );
  }
}
