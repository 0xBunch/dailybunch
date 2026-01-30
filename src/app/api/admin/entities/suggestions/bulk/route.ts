/**
 * Bulk Entity Suggestion API
 *
 * Approve or reject ALL pending suggestions matching name+type.
 * Used for de-duped suggestion management.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: NextRequest) {
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
