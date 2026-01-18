import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      include: {
        category: true,
        subcategory: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Error fetching sources:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, url, emailTrigger, categoryId, subcategoryId } = body;

    if (!name || !type || !categoryId) {
      return NextResponse.json(
        { error: "Name, type, and category required" },
        { status: 400 }
      );
    }

    const source = await prisma.source.create({
      data: {
        name,
        type,
        url,
        emailTrigger,
        categoryId,
        subcategoryId,
      },
      include: {
        category: true,
        subcategory: true,
      },
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error("Error creating source:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
