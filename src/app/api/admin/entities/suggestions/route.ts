import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const suggestions = await prisma.suggestedEntity.findMany({
      where: {
        isApproved: null, // Only pending suggestions
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
