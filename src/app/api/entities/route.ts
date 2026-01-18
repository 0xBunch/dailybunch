import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const entities = await prisma.entity.findMany({
      where: { isActive: true },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ entities });
  } catch (error) {
    console.error("Error fetching entities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
