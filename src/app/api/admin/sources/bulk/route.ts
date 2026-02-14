/**
 * Bulk Actions API for Sources
 *
 * Supports bulk operations:
 * - Set tier
 * - Set categories (multi-select)
 * - Add tags
 * - Set poll frequency
 * - Toggle dashboard visibility
 * - Activate/deactivate
 * - Delete
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

type BulkAction =
  | { action: "setTier"; tier: string }
  | { action: "setCategories"; categoryIds: string[] }
  | { action: "addTags"; tags: string[] }
  | { action: "removeTags"; tags: string[] }
  | { action: "setPollFrequency"; frequency: string }
  | { action: "setDashboardVisibility"; visible: boolean }
  | { action: "activate" }
  | { action: "deactivate" }
  | { action: "delete" };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceIds, ...actionData } = body as { sourceIds: string[] } & BulkAction;

    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      return NextResponse.json(
        { error: "sourceIds array is required" },
        { status: 400 }
      );
    }

    const action = actionData.action;

    switch (action) {
      case "setTier": {
        const validTiers = ["TIER_1", "TIER_2", "TIER_3", "TIER_4"];
        if (!validTiers.includes(actionData.tier)) {
          return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
        }
        await prisma.source.updateMany({
          where: { id: { in: sourceIds } },
          data: { tier: actionData.tier },
        });
        break;
      }

      case "setCategories": {
        // Clear existing categories and set new ones (many-to-many)
        const { categoryIds } = actionData;

        // Delete existing SourceCategory entries for these sources
        await prisma.sourceCategory.deleteMany({
          where: { sourceId: { in: sourceIds } },
        });

        // Create new entries
        if (categoryIds && categoryIds.length > 0) {
          const newEntries = sourceIds.flatMap((sourceId) =>
            categoryIds.map((categoryId) => ({
              sourceId,
              categoryId,
            }))
          );
          await prisma.sourceCategory.createMany({
            data: newEntries,
            skipDuplicates: true,
          });
        }
        break;
      }

      case "addTags": {
        const { tags } = actionData;
        if (!tags || !Array.isArray(tags)) {
          return NextResponse.json({ error: "tags array required" }, { status: 400 });
        }

        // Fetch current tags and merge
        const sources = await prisma.source.findMany({
          where: { id: { in: sourceIds } },
          select: { id: true, tags: true },
        });

        await Promise.all(
          sources.map((source) => {
            const existingTags = source.tags || [];
            const mergedTags = [...new Set([...existingTags, ...tags])];
            return prisma.source.update({
              where: { id: source.id },
              data: { tags: mergedTags },
            });
          })
        );
        break;
      }

      case "removeTags": {
        const { tags } = actionData;
        if (!tags || !Array.isArray(tags)) {
          return NextResponse.json({ error: "tags array required" }, { status: 400 });
        }

        const sources = await prisma.source.findMany({
          where: { id: { in: sourceIds } },
          select: { id: true, tags: true },
        });

        await Promise.all(
          sources.map((source) => {
            const existingTags = source.tags || [];
            const filteredTags = existingTags.filter((t) => !tags.includes(t));
            return prisma.source.update({
              where: { id: source.id },
              data: { tags: filteredTags },
            });
          })
        );
        break;
      }

      case "setPollFrequency": {
        const validFrequencies = ["realtime", "hourly", "daily"];
        if (!validFrequencies.includes(actionData.frequency)) {
          return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
        }
        await prisma.source.updateMany({
          where: { id: { in: sourceIds } },
          data: { pollFrequency: actionData.frequency },
        });
        break;
      }

      case "setDashboardVisibility": {
        await prisma.source.updateMany({
          where: { id: { in: sourceIds } },
          data: { showOnDashboard: actionData.visible },
        });
        break;
      }

      case "activate": {
        await prisma.source.updateMany({
          where: { id: { in: sourceIds } },
          data: { active: true },
        });
        break;
      }

      case "deactivate": {
        await prisma.source.updateMany({
          where: { id: { in: sourceIds } },
          data: { active: false },
        });
        break;
      }

      case "delete": {
        await prisma.source.deleteMany({
          where: { id: { in: sourceIds } },
        });
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      affectedCount: sourceIds.length,
    });
  } catch (error) {
    console.error("Bulk action failed:", error);
    return NextResponse.json(
      { error: "Bulk action failed" },
      { status: 500 }
    );
  }
}
