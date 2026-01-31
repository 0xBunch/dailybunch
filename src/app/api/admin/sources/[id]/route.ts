/**
 * Source Settings API
 *
 * Update source settings like includeOwnLinks and showOnDashboard toggles.
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
