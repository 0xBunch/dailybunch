import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const digests = await prisma.digest.findMany({
      include: {
        items: {
          include: {
            link: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json({ digests });
  } catch (error) {
    console.error("Error fetching digests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { headline, items } = body;

    if (!headline || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Headline and at least one item required" },
        { status: 400 }
      );
    }

    const digest = await prisma.digest.create({
      data: {
        headline,
        items: {
          create: items.map(
            (item: { linkId: string; note?: string; position: number }) => ({
              linkId: item.linkId,
              note: item.note || null,
              position: item.position,
            })
          ),
        },
      },
      include: {
        items: {
          include: {
            link: true,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    return NextResponse.json({ digest }, { status: 201 });
  } catch (error) {
    console.error("Error creating digest:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
