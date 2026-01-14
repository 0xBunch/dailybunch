import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { extractDomain } from "@/lib/utils";
import { z } from "zod";

const linkSchema = z.object({
  url: z.string().url("Invalid URL"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(500).optional(),
});

// GET /api/links - List links
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const status = searchParams.get("status") || "APPROVED";
    const sort = searchParams.get("sort") || "score";
    const period = searchParams.get("period") || "day";

    // Calculate date filter based on period
    const now = new Date();
    let dateFilter: Date | undefined;
    switch (period) {
      case "day":
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = undefined;
    }

    const where = {
      status: status as "PENDING" | "APPROVED" | "FEATURED" | "ARCHIVED" | "REJECTED",
      ...(dateFilter && { createdAt: { gte: dateFilter } }),
    };

    const [links, total] = await Promise.all([
      prisma.link.findMany({
        where,
        orderBy:
          sort === "score"
            ? [{ score: "desc" }, { createdAt: "desc" }]
            : [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          submitter: {
            select: { id: true, name: true },
          },
          tags: {
            include: { tag: true },
          },
          _count: {
            select: { comments: true, mentions: true, votes: true },
          },
        },
      }),
      prisma.link.count({ where }),
    ]);

    return NextResponse.json({
      items: links.map((link) => ({
        id: link.id,
        url: link.url,
        title: link.title,
        description: link.description,
        domain: link.domain,
        aiSummary: link.aiSummary,
        score: link.score,
        status: link.status,
        firstSeenAt: link.firstSeenAt,
        createdAt: link.createdAt,
        submitter: link.submitter,
        tags: link.tags.map((t) => t.tag.name),
        commentCount: link._count.comments,
        mentionCount: link._count.mentions,
      })),
      total,
      page,
      pageSize: limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error("Links fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}

// POST /api/links - Create a new link
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = linkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { url, title, description } = parsed.data;
    const domain = extractDomain(url);

    // Check for duplicate URL
    const existing = await prisma.link.findUnique({
      where: { url },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This link has already been submitted", linkId: existing.id },
        { status: 409 }
      );
    }

    const link = await prisma.link.create({
      data: {
        url,
        title,
        description,
        domain,
        submitterId: session.user.id,
        status: "PENDING",
        score: 1, // Start with 1 (submitter's implicit upvote)
      },
    });

    // Create initial vote from submitter
    await prisma.vote.create({
      data: {
        userId: session.user.id,
        linkId: link.id,
        value: 1,
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
