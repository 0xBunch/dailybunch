import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateWeeklyReview, type LinkForReview } from "@/lib/claude";

/**
 * Generate Weekly Review API
 *
 * POST - Generate a new weekly review from high-velocity links
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      startDate,
      endDate,
      minVelocity = 2,
      maxLinks = 20,
      categories,
    } = body as {
      startDate?: string;
      endDate?: string;
      minVelocity?: number;
      maxLinks?: number;
      categories?: string[];
    };

    // Default to last 7 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch links with their mentions for velocity calculation
    const links = await prisma.link.findMany({
      where: {
        firstSeenAt: {
          gte: start,
          lte: end,
        },
        ...(categories?.length
          ? {
              category: {
                name: { in: categories },
              },
            }
          : {}),
      },
      include: {
        mentions: {
          include: {
            source: true,
          },
        },
        category: true,
      },
    });

    // Calculate velocity and filter
    const linksWithVelocity = links
      .map((link) => ({
        ...link,
        velocity: link.mentions.length,
      }))
      .filter((link) => link.velocity >= minVelocity)
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, maxLinks);

    if (linksWithVelocity.length === 0) {
      return NextResponse.json(
        {
          error: "No links found matching criteria",
          suggestion:
            "Try expanding the date range or lowering the minimum velocity",
        },
        { status: 400 }
      );
    }

    // Format links for the prompt
    const formattedLinks: LinkForReview[] = linksWithVelocity.map((link) => ({
      id: link.id,
      url: link.canonicalUrl,
      title: link.title || link.fallbackTitle || link.domain,
      summary:
        link.aiSummary || link.description || link.title || "No summary available",
      sourceName: link.mentions[0]?.source?.name || "Unknown Source",
      velocity: link.velocity,
      category: link.category?.name,
    }));

    // Format week of string
    const weekOf = `${start.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })} - ${end.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`;

    // Generate the review
    const result = await generateWeeklyReview(formattedLinks, weekOf);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Map footnotes to source data
    const sources = result.footnotes.map((fn) => {
      const link = formattedLinks.find((l) => l.id === fn.linkId);
      return {
        footnoteNumber: fn.number,
        linkId: fn.linkId,
        url: link?.url || "",
        title: link?.title || "",
        claimText: fn.claim,
      };
    });

    return NextResponse.json({
      content: result.content,
      sources,
      weekOf: start.toISOString(),
      linksUsed: formattedLinks.length,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    });
  } catch (error) {
    console.error("Error generating weekly review:", error);
    return NextResponse.json(
      { error: "Failed to generate weekly review" },
      { status: 500 }
    );
  }
}
