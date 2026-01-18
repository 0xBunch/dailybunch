import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const digest = await prisma.digest.findUnique({
      where: { id },
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

    if (!digest) {
      return NextResponse.json({ error: "Digest not found" }, { status: 404 });
    }

    return NextResponse.json({ digest });
  } catch (error) {
    console.error("Error fetching digest:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.digest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting digest:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
