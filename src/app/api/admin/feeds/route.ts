import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const feedSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.string().url("Invalid URL"),
  description: z.string().optional(),
});

// GET /api/admin/feeds - List all feeds
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const feeds = await prisma.rssFeed.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { subscribers: true },
        },
      },
    });

    return NextResponse.json({ feeds });
  } catch (error) {
    console.error("Feeds fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feeds" },
      { status: 500 }
    );
  }
}

// POST /api/admin/feeds - Create new feed
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = feedSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, url, description } = parsed.data;

    // Check for duplicate
    const existing = await prisma.rssFeed.findUnique({
      where: { url },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This feed URL already exists" },
        { status: 409 }
      );
    }

    const feed = await prisma.rssFeed.create({
      data: {
        name,
        url,
        description,
      },
    });

    return NextResponse.json({ success: true, feed }, { status: 201 });
  } catch (error) {
    console.error("Feed creation error:", error);
    return NextResponse.json(
      { error: "Failed to create feed" },
      { status: 500 }
    );
  }
}
