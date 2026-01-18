import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const suggestion = await prisma.suggestedEntity.update({
      where: { id },
      data: {
        isApproved: body.isApproved,
      },
    });

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("Error updating suggestion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
