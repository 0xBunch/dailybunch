/**
 * Bulk Entity Operations API
 *
 * Perform bulk actions on multiple entities at once.
 *
 * POST: Execute bulk operation
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// Valid entity types
const VALID_TYPES = ["person", "organization", "product", "athlete", "brand", "event", "place", "media_outlet"];

type BulkAction =
  | "activate"
  | "deactivate"
  | "show"
  | "hide"
  | "delete"
  | "addToBlocklist"
  | "changeType";

interface BulkRequest {
  entityIds: string[];
  action: BulkAction;
  newType?: string; // For changeType action
  blocklistReason?: string; // For addToBlocklist action
}

export async function POST(request: NextRequest) {
  try {
    const body: BulkRequest = await request.json();
    const { entityIds, action, newType, blocklistReason } = body;

    if (!entityIds || !Array.isArray(entityIds) || entityIds.length === 0) {
      return NextResponse.json(
        { error: "No entities selected" },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "No action specified" },
        { status: 400 }
      );
    }

    let affected = 0;

    switch (action) {
      case "activate":
        const activateResult = await prisma.entity.updateMany({
          where: { id: { in: entityIds } },
          data: { active: true },
        });
        affected = activateResult.count;
        break;

      case "deactivate":
        const deactivateResult = await prisma.entity.updateMany({
          where: { id: { in: entityIds } },
          data: { active: false },
        });
        affected = deactivateResult.count;
        break;

      case "show":
        const showResult = await prisma.entity.updateMany({
          where: { id: { in: entityIds } },
          data: { showInTrending: true },
        });
        affected = showResult.count;
        break;

      case "hide":
        const hideResult = await prisma.entity.updateMany({
          where: { id: { in: entityIds } },
          data: { showInTrending: false },
        });
        affected = hideResult.count;
        break;

      case "changeType":
        if (!newType || !VALID_TYPES.includes(newType)) {
          return NextResponse.json(
            { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
            { status: 400 }
          );
        }
        const changeTypeResult = await prisma.entity.updateMany({
          where: { id: { in: entityIds } },
          data: { type: newType },
        });
        affected = changeTypeResult.count;
        break;

      case "delete":
        // Delete related records first (cascade)
        await prisma.linkEntity.deleteMany({
          where: { entityId: { in: entityIds } },
        });

        const deleteResult = await prisma.entity.deleteMany({
          where: { id: { in: entityIds } },
        });
        affected = deleteResult.count;
        break;

      case "addToBlocklist":
        // Get entity names, add to blocklist, then delete entities
        const entities = await prisma.entity.findMany({
          where: { id: { in: entityIds } },
          select: { id: true, name: true },
        });

        // Add each name to blocklist (skip duplicates)
        for (const entity of entities) {
          try {
            await prisma.entityBlocklist.create({
              data: {
                name: entity.name,
                reason: blocklistReason || "Added via bulk operation",
              },
            });
          } catch {
            // Ignore duplicate errors
          }
        }

        // Delete related records
        await prisma.linkEntity.deleteMany({
          where: { entityId: { in: entityIds } },
        });

        // Delete entities
        const blocklistDeleteResult = await prisma.entity.deleteMany({
          where: { id: { in: entityIds } },
        });
        affected = blocklistDeleteResult.count;
        break;

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      affected,
    });
  } catch (error) {
    console.error("Bulk operation failed:", error);
    return NextResponse.json(
      { error: "Bulk operation failed" },
      { status: 500 }
    );
  }
}
