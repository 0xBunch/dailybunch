/**
 * Bulk Entity Suggestion API
 *
 * Approve or reject suggestions. Supports:
 * - Individual: by name+type (FormData, existing behavior)
 * - Type-wide: approve/reject ALL pending suggestions of a given type (JSON body)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  // JSON body → type-wide bulk operations
  if (contentType.includes("application/json")) {
    return handleJsonBulk(request);
  }

  // FormData → individual name+type operations (existing behavior)
  return handleFormDataBulk(request);
}

async function handleJsonBulk(request: NextRequest) {
  try {
    const { action, bulkType } = await request.json();

    if (!action || !bulkType) {
      return NextResponse.json(
        { error: "action and bulkType are required" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Get all unique pending suggestions of this type
      const suggestions = await prisma.entitySuggestion.findMany({
        where: { type: bulkType, status: "pending" },
        distinct: ["name"],
      });

      let created = 0;
      for (const suggestion of suggestions) {
        // Check if entity already exists
        const exists = await prisma.entity.findFirst({
          where: {
            name: { equals: suggestion.name, mode: "insensitive" },
          },
        });

        if (!exists) {
          try {
            await prisma.entity.create({
              data: {
                name: suggestion.name,
                type: suggestion.type,
                aliases: suggestion.aliases || [],
                active: true,
              },
            });
            created++;
          } catch {
            // Skip duplicates from race conditions
          }
        }
      }

      // Mark all as approved
      const updated = await prisma.entitySuggestion.updateMany({
        where: { type: bulkType, status: "pending" },
        data: { status: "approved", reviewedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        action: "approve",
        type: bulkType,
        entitiesCreated: created,
        suggestionsUpdated: updated.count,
      });
    } else if (action === "reject") {
      const updated = await prisma.entitySuggestion.updateMany({
        where: { type: bulkType, status: "pending" },
        data: { status: "rejected", reviewedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        action: "reject",
        type: bulkType,
        suggestionsUpdated: updated.count,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Bulk type suggestion operation failed:", error);
    return NextResponse.json(
      { error: "Operation failed" },
      { status: 500 }
    );
  }
}

async function handleFormDataBulk(request: NextRequest) {
  const formData = await request.formData();
  const action = formData.get("action") as string;
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;

  if (!name || !type) {
    return NextResponse.json(
      { error: "Name and type are required" },
      { status: 400 }
    );
  }

  try {
    if (action === "approve") {
      // Check if entity already exists
      const existingEntity = await prisma.entity.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          type,
        },
      });

      if (!existingEntity) {
        // Get one suggestion to extract aliases
        const suggestion = await prisma.entitySuggestion.findFirst({
          where: {
            name: { equals: name, mode: "insensitive" },
            type,
            status: "pending",
          },
        });

        // Create the entity
        await prisma.entity.create({
          data: {
            name,
            type,
            aliases: suggestion?.aliases || [],
            active: true,
          },
        });
      }

      // Mark ALL matching suggestions as approved
      await prisma.entitySuggestion.updateMany({
        where: {
          name: { equals: name, mode: "insensitive" },
          type,
          status: "pending",
        },
        data: {
          status: "approved",
          reviewedAt: new Date(),
        },
      });
    } else if (action === "reject") {
      // Mark ALL matching suggestions as rejected
      await prisma.entitySuggestion.updateMany({
        where: {
          name: { equals: name, mode: "insensitive" },
          type,
          status: "pending",
        },
        data: {
          status: "rejected",
          reviewedAt: new Date(),
        },
      });
    }

    return redirectTo(request, "/admin/entities");
  } catch (error) {
    console.error("Failed to bulk process suggestions:", error);
    return NextResponse.json(
      { error: "Failed to process suggestions" },
      { status: 500 }
    );
  }
}
