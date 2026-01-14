import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/links/[id] - Get single link
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    const link = await prisma.link.findUnique({
      where: { id },
      include: {
        submitter: {
          select: { id: true, name: true, image: true },
        },
        tags: {
          include: { tag: true },
        },
        mentions: true,
        _count: {
          select: { comments: true, votes: true, mentions: true },
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Get user's vote if logged in
    let userVote = null;
    if (session?.user) {
      const vote = await prisma.vote.findUnique({
        where: {
          userId_linkId: {
            userId: session.user.id,
            linkId: id,
          },
        },
      });
      userVote = vote?.value || null;
    }

    return NextResponse.json({
      ...link,
      tags: link.tags.map((t) => t.tag.name),
      commentCount: link._count.comments,
      mentionCount: link._count.mentions,
      userVote,
    });
  } catch (error) {
    console.error("Link fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch link" },
      { status: 500 }
    );
  }
}

// PATCH /api/links/[id] - Update link (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { status, title, description, aiSummary } = body;

    const link = await prisma.link.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(aiSummary !== undefined && { aiSummary }),
      },
    });

    return NextResponse.json({ success: true, link });
  } catch (error) {
    console.error("Link update error:", error);
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500 }
    );
  }
}

// DELETE /api/links/[id] - Delete link (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or the submitter
    const link = await prisma.link.findUnique({ where: { id } });
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const isAdmin =
      session.user.role === "ADMIN" || session.user.role === "SUPERADMIN";
    const isSubmitter = link.submitterId === session.user.id;

    if (!isAdmin && !isSubmitter) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.link.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Link delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 }
    );
  }
}
