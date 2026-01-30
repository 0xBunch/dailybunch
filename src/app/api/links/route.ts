import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * Links API
 *
 * GET - List links with optional filters
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "newest";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const category = searchParams.get("category");
    const search = searchParams.get("q");

    // Build where clause - include links with either title OR fallbackTitle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      OR: [
        { title: { not: null } },
        { fallbackTitle: { not: null } },
      ],
    };

    if (category) {
      whereClause.category = { slug: category };
    }

    if (search) {
      whereClause.AND = [
        {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { fallbackTitle: { contains: search, mode: "insensitive" } },
            { domain: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Get links
    const links = await prisma.link.findMany({
      where: whereClause,
      include: {
        category: true,
        mentions: {
          include: { source: true },
        },
      },
      orderBy:
        sort === "oldest"
          ? { firstSeenAt: "asc" }
          : sort === "velocity"
            ? { mentions: { _count: "desc" } }
            : { firstSeenAt: "desc" },
      take: Math.min(limit, 100),
    });

    // Process links
    const processedLinks = links.map((link) => ({
      id: link.id,
      title: link.title,
      fallbackTitle: link.fallbackTitle,
      canonicalUrl: link.canonicalUrl,
      domain: link.domain,
      aiSummary: link.aiSummary,
      category: link.category ? { name: link.category.name } : null,
      velocity: link.mentions.length,
      sources: [...new Set(link.mentions.map((m) => m.source.name))],
      firstSeenAt: link.firstSeenAt,
    }));

    return NextResponse.json({ links: processedLinks });
  } catch (error) {
    console.error("Error fetching links:", error);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}
