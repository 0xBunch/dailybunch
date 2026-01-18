/**
 * Entity Suggestion API
 *
 * Approve or reject AI-suggested entities.
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
  const action = formData.get("action") as string;

  try {
    const suggestion = await prisma.entitySuggestion.findUnique({
      where: { id },
    });

    if (!suggestion) {
      return NextResponse.json(
        { error: "Suggestion not found" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      // Create the entity
      await prisma.entity.create({
        data: {
          name: suggestion.name,
          type: suggestion.type,
          aliases: suggestion.aliases,
          active: true,
        },
      });

      // Mark suggestion as approved
      await prisma.entitySuggestion.update({
        where: { id },
        data: {
          status: "approved",
          reviewedAt: new Date(),
        },
      });
    } else if (action === "reject") {
      // Mark suggestion as rejected
      await prisma.entitySuggestion.update({
        where: { id },
        data: {
          status: "rejected",
          reviewedAt: new Date(),
        },
      });
    }

    return redirectTo(request, "/admin/entities");
  } catch (error) {
    console.error("Failed to process suggestion:", error);
    return NextResponse.json(
      { error: "Failed to process suggestion" },
      { status: 500 }
    );
  }
}
