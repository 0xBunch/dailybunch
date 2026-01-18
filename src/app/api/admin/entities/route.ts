import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const entities = await prisma.entity.findMany({
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, aliases } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type required" },
        { status: 400 }
      );
    }

    const entity = await prisma.entity.create({
      data: {
        name,
        type,
        aliases: aliases || [],
      },
    });

    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    console.error("Error creating entity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
