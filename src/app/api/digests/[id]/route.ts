import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * Single Digest API
 *
 * GET - Get digest details
 * DELETE - Delete a digest
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const digest = await prisma.digest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            link: {
              include: {
                category: true,
                subcategory: true,
                mentions: {
                  include: { source: true },
                },
                entities: {
                  include: { entity: true },
                },
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!digest) {
      return NextResponse.json({ error: "Digest not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: digest.id,
      title: digest.headline,
      createdAt: digest.createdAt,
      sentAt: digest.sentAt,
      items: digest.items.map((item) => ({
        id: item.id,
        position: item.position,
        headline: null,
        notes: item.note,
        link: {
          id: item.link.id,
          title: item.link.title,
          canonicalUrl: item.link.canonicalUrl,
          domain: item.link.domain,
          description: item.link.description,
          aiSummary: item.link.aiSummary,
          category: item.link.category?.name,
          subcategory: item.link.subcategory?.name,
          velocity: item.link.mentions.length,
          sources: [...new Set(item.link.mentions.map((m) => m.source.name))],
          entities: item.link.entities.map((e) => ({
            name: e.entity.name,
            type: e.entity.type,
          })),
        },
      })),
    });
  } catch (error) {
    console.error("Error fetching digest:", error);
    return NextResponse.json(
      { error: "Failed to fetch digest" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete items first (cascade not automatic with Prisma)
    await prisma.digestItem.deleteMany({
      where: { digestId: id },
    });

    await prisma.digest.delete({
      where: { id },
    });

    return NextResponse.json({ status: "deleted" });
  } catch (error) {
    console.error("Error deleting digest:", error);
    return NextResponse.json(
      { error: "Failed to delete digest" },
      { status: 500 }
    );
  }
}
