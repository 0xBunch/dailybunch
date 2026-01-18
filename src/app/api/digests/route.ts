import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * Digest API
 *
 * GET - List all digests
 * POST - Create a new digest from selected links
 */

export async function GET() {
  try {
    const digests = await prisma.digest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            link: {
              include: {
                category: true,
                mentions: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
      take: 50,
    });

    return NextResponse.json({
      digests: digests.map((d) => ({
        id: d.id,
        title: d.headline,
        createdAt: d.createdAt,
        sentAt: d.sentAt,
        itemCount: d.items.length,
      })),
    });
  } catch (error) {
    console.error("Error fetching digests:", error);
    return NextResponse.json(
      { error: "Failed to fetch digests" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, linkIds, notes } = body as {
      title?: string;
      linkIds: string[];
      notes?: Record<string, string>;
    };

    if (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
      return NextResponse.json(
        { error: "At least one link is required" },
        { status: 400 }
      );
    }

    // Generate default title
    const digestTitle =
      title ||
      `Digest - ${new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;

    // Create digest with items
    const digest = await prisma.digest.create({
      data: {
        headline: digestTitle,
        items: {
          create: linkIds.map((linkId, index) => ({
            linkId,
            position: index,
            note: notes?.[linkId] || null,
          })),
        },
      },
      include: {
        items: {
          include: {
            link: {
              include: {
                category: true,
                mentions: true,
              },
            },
          },
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({
      status: "created",
      digest: {
        id: digest.id,
        title: digest.headline,
        createdAt: digest.createdAt,
        items: digest.items.map((item) => ({
          id: item.id,
          position: item.position,
          headline: null,
          link: {
            id: item.link.id,
            title: item.link.title,
            canonicalUrl: item.link.canonicalUrl,
            domain: item.link.domain,
            aiSummary: item.link.aiSummary,
            category: item.link.category?.name,
            velocity: item.link.mentions.length,
          },
        })),
      },
    });
  } catch (error) {
    console.error("Error creating digest:", error);
    return NextResponse.json(
      { error: "Failed to create digest" },
      { status: 500 }
    );
  }
}
