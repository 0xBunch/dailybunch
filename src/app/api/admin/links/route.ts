import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { LinkStatus, Prisma } from "@prisma/client";

const createLinkSchema = z.object({
  url: z.string().url("Invalid URL"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "FEATURED", "REJECTED"]).optional(),
});

const validStatuses: LinkStatus[] = ["PENDING", "APPROVED", "FEATURED", "ARCHIVED", "REJECTED"];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Prisma.LinkWhereInput = statusParam && validStatuses.includes(statusParam as LinkStatus)
      ? { status: statusParam as LinkStatus }
      : {};

    const [links, total] = await Promise.all([
      prisma.link.findMany({
        where,
        include: {
          submitter: {
            select: { id: true, name: true },
          },
          _count: {
            select: { mentions: true, comments: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.link.count({ where }),
    ]);

    return NextResponse.json({ links, total });
  } catch (error) {
    console.error("Admin links fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}

// Create a new link (manual submission)
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
    const parsed = createLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { url, title, description, status } = parsed.data;

    // Extract domain from URL
    const domain = new URL(url).hostname.replace("www.", "");

    // Check for existing link
    const existingLink = await prisma.link.findUnique({
      where: { url },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: "Link already exists", link: existingLink },
        { status: 409 }
      );
    }

    const link = await prisma.link.create({
      data: {
        url,
        title,
        description: description || null,
        domain,
        status: status || "APPROVED",
        submitterId: session.user.id,
        firstSeenAt: new Date(),
        score: 1,
      },
    });

    return NextResponse.json({ success: true, link }, { status: 201 });
  } catch (error) {
    console.error("Link creation error:", error);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 }
    );
  }
}
