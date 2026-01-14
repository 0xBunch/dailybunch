import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/links/[id]/vote - Vote on a link
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: linkId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { value } = body; // 1 for upvote, -1 for downvote, 0 to remove vote

    if (![1, -1, 0].includes(value)) {
      return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
    }

    const link = await prisma.link.findUnique({ where: { id: linkId } });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_linkId: {
          userId: session.user.id,
          linkId,
        },
      },
    });

    let scoreChange = 0;

    if (value === 0) {
      // Remove vote
      if (existingVote) {
        scoreChange = -existingVote.value;
        await prisma.vote.delete({
          where: { id: existingVote.id },
        });
      }
    } else if (existingVote) {
      // Update existing vote
      scoreChange = value - existingVote.value;
      await prisma.vote.update({
        where: { id: existingVote.id },
        data: { value },
      });
    } else {
      // Create new vote
      scoreChange = value;
      await prisma.vote.create({
        data: {
          userId: session.user.id,
          linkId,
          value,
        },
      });
    }

    // Update link score
    const updatedLink = await prisma.link.update({
      where: { id: linkId },
      data: {
        score: {
          increment: scoreChange,
        },
      },
    });

    return NextResponse.json({
      success: true,
      score: updatedLink.score,
      userVote: value === 0 ? null : value,
    });
  } catch (error) {
    console.error("Vote error:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
