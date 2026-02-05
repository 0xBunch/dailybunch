/**
 * Source Settings API
 *
 * Update source settings like includeOwnLinks and showOnDashboard toggles.
 * DELETE to remove a source and all links that came exclusively from it.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { redirectTo } from "@/lib/redirect";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();

  // Build update data based on which field was submitted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (formData.has("includeOwnLinks")) {
    updateData.includeOwnLinks = formData.get("includeOwnLinks") === "true";
  }

  if (formData.has("showOnDashboard")) {
    updateData.showOnDashboard = formData.get("showOnDashboard") === "true";
  }

  if (formData.has("active")) {
    updateData.active = formData.get("active") === "true";
  }

  if (formData.has("internalDomains")) {
    const domainsString = formData.get("internalDomains") as string;
    // Split by newlines or commas, trim whitespace, filter empty
    const domains = domainsString
      .split(/[\n,]/)
      .map((d) => d.trim().toLowerCase())
      .filter((d) => d.length > 0);
    updateData.internalDomains = domains;
  }

  if (formData.has("tier")) {
    const tier = formData.get("tier") as string;
    // Validate tier value
    if (["TIER_1", "TIER_2", "TIER_3", "TIER_4"].includes(tier)) {
      updateData.tier = tier;
      // Auto-set trustScore based on tier
      const trustScores: Record<string, number> = {
        TIER_1: 10,
        TIER_2: 7,
        TIER_3: 5,
        TIER_4: 2,
      };
      updateData.trustScore = trustScores[tier];
    }
  }

  if (formData.has("pollFrequency")) {
    const frequency = formData.get("pollFrequency") as string;
    // Validate frequency value
    if (["realtime", "hourly", "daily"].includes(frequency)) {
      updateData.pollFrequency = frequency;
    }
  }

  try {
    await prisma.source.update({
      where: { id },
      data: updateData,
    });

    return redirectTo(request, "/admin/sources");
  } catch (error) {
    console.error("Failed to update source:", error);
    return NextResponse.json(
      { error: "Failed to update source" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sources/[id]
 *
 * Deletes a source and all links that came exclusively from it.
 * Links mentioned by other sources are preserved.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // First, find the source to make sure it exists
    const source = await prisma.source.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!source) {
      return NextResponse.json({ error: "Source not found" }, { status: 404 });
    }

    // Find links that are ONLY mentioned by this source
    // These are links where all mentions have sourceId = this source
    const orphanedLinks = await prisma.$queryRaw<{ id: string }[]>`
      SELECT l.id
      FROM "Link" l
      WHERE EXISTS (
        SELECT 1 FROM "Mention" m WHERE m."linkId" = l.id AND m."sourceId" = ${id}
      )
      AND NOT EXISTS (
        SELECT 1 FROM "Mention" m WHERE m."linkId" = l.id AND m."sourceId" != ${id}
      )
    `;

    const orphanedLinkIds = orphanedLinks.map((l) => l.id);

    // Delete orphaned links (cascades to mentions, linkEntities, storyLinks, etc.)
    if (orphanedLinkIds.length > 0) {
      await prisma.link.deleteMany({
        where: { id: { in: orphanedLinkIds } },
      });
    }

    // Now delete the source (cascades to remaining mentions and sourceItems)
    await prisma.source.delete({
      where: { id },
    });

    console.log(
      `[Admin] Deleted source "${source.name}" and ${orphanedLinkIds.length} orphaned links`
    );

    return NextResponse.json({
      success: true,
      deletedSource: source.name,
      deletedLinks: orphanedLinkIds.length,
    });
  } catch (error) {
    console.error("Failed to delete source:", error);
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 }
    );
  }
}
