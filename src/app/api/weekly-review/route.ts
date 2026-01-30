import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * Weekly Review API
 *
 * GET - List all weekly reviews
 * POST - Save a new weekly review
 */

export async function GET() {
  try {
    const reviews = await prisma.weeklyReview.findMany({
      orderBy: { weekOf: "desc" },
      include: {
        sources: {
          include: {
            link: true,
          },
          orderBy: { footnoteNumber: "asc" },
        },
      },
      take: 50,
    });

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        weekOf: r.weekOf,
        status: r.status,
        byline: r.byline,
        createdAt: r.createdAt,
        publishedAt: r.publishedAt,
        contentPreview: r.content.substring(0, 200) + "...",
        sourceCount: r.sources.length,
      })),
    });
  } catch (error) {
    console.error("Error fetching weekly reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly reviews" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weekOf, content, byline, sources } = body as {
      weekOf: string;
      content: string;
      byline?: string;
      sources: Array<{
        linkId: string;
        footnoteNumber: number;
        claimText?: string;
      }>;
    };

    if (!weekOf || !content) {
      return NextResponse.json(
        { error: "weekOf and content are required" },
        { status: 400 }
      );
    }

    const review = await prisma.weeklyReview.create({
      data: {
        weekOf: new Date(weekOf),
        content,
        byline: byline || "Weekly Review",
        sources: {
          create: sources.map((s) => ({
            linkId: s.linkId,
            footnoteNumber: s.footnoteNumber,
            claimText: s.claimText,
          })),
        },
      },
      include: {
        sources: {
          include: {
            link: true,
          },
          orderBy: { footnoteNumber: "asc" },
        },
      },
    });

    return NextResponse.json({
      status: "created",
      review: {
        id: review.id,
        weekOf: review.weekOf,
        status: review.status,
        byline: review.byline,
        content: review.content,
        createdAt: review.createdAt,
        sources: review.sources.map((s) => ({
          footnoteNumber: s.footnoteNumber,
          linkId: s.linkId,
          url: s.link.canonicalUrl,
          title: s.link.title,
          claimText: s.claimText,
        })),
      },
    });
  } catch (error) {
    console.error("Error creating weekly review:", error);
    return NextResponse.json(
      { error: "Failed to create weekly review" },
      { status: 500 }
    );
  }
}
