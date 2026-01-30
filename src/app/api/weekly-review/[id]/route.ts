import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * Weekly Review by ID API
 *
 * GET - Get a specific weekly review
 * PATCH - Update a weekly review
 * DELETE - Delete a weekly review
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const review = await prisma.weeklyReview.findUnique({
      where: { id },
      include: {
        sources: {
          include: {
            link: {
              include: {
                category: true,
              },
            },
          },
          orderBy: { footnoteNumber: "asc" },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Weekly review not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      review: {
        id: review.id,
        weekOf: review.weekOf,
        content: review.content,
        status: review.status,
        byline: review.byline,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        publishedAt: review.publishedAt,
        sources: review.sources.map((s) => ({
          footnoteNumber: s.footnoteNumber,
          linkId: s.linkId,
          url: s.link.canonicalUrl,
          title: s.link.title,
          domain: s.link.domain,
          category: s.link.category?.name,
          claimText: s.claimText,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching weekly review:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly review" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { content, status, byline } = body as {
      content?: string;
      status?: string;
      byline?: string;
    };

    const updateData: Record<string, unknown> = {};
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;
    if (byline !== undefined) updateData.byline = byline;

    // If publishing, set publishedAt
    if (status === "published") {
      updateData.publishedAt = new Date();
    }

    const review = await prisma.weeklyReview.update({
      where: { id },
      data: updateData,
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
      status: "updated",
      review: {
        id: review.id,
        weekOf: review.weekOf,
        content: review.content,
        status: review.status,
        byline: review.byline,
        updatedAt: review.updatedAt,
        publishedAt: review.publishedAt,
      },
    });
  } catch (error) {
    console.error("Error updating weekly review:", error);
    return NextResponse.json(
      { error: "Failed to update weekly review" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.weeklyReview.delete({
      where: { id },
    });

    return NextResponse.json({ status: "deleted" });
  } catch (error) {
    console.error("Error deleting weekly review:", error);
    return NextResponse.json(
      { error: "Failed to delete weekly review" },
      { status: 500 }
    );
  }
}
