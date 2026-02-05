/**
 * Entity Settings API
 *
 * POST: Toggle entity fields (form data) - for quick toggles
 * PATCH: Update entity details (JSON) - for full edits
 * DELETE: Remove entity
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { redirectTo } from "@/lib/redirect";

// Valid entity types
const VALID_TYPES = ["person", "organization", "product", "athlete", "brand", "event", "place", "media_outlet"];

/**
 * POST - Toggle fields via form data (for quick toggles)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();

  // Build update data based on which field was submitted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (formData.has("active")) {
    updateData.active = formData.get("active") === "true";
  }

  if (formData.has("showInTrending")) {
    updateData.showInTrending = formData.get("showInTrending") === "true";
  }

  try {
    await prisma.entity.update({
      where: { id },
      data: updateData,
    });

    return redirectTo(request, "/admin/entities");
  } catch (error) {
    console.error("Failed to update entity:", error);
    return NextResponse.json(
      { error: "Failed to update entity" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update entity details via JSON (for full edits)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    // Name update
    if (body.name && typeof body.name === "string" && body.name.trim()) {
      updateData.name = body.name.trim();
    }

    // Type update (with validation)
    if (body.type && typeof body.type === "string") {
      if (!VALID_TYPES.includes(body.type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.type = body.type;
    }

    // Aliases update
    if (body.aliases !== undefined) {
      if (Array.isArray(body.aliases)) {
        updateData.aliases = body.aliases.filter((a: unknown) => typeof a === "string" && a.trim());
      } else if (typeof body.aliases === "string") {
        // Support comma-separated string
        updateData.aliases = body.aliases.split(",").map((a: string) => a.trim()).filter(Boolean);
      }
    }

    // Boolean toggles (also supported via PATCH)
    if (typeof body.active === "boolean") {
      updateData.active = body.active;
    }
    if (typeof body.showInTrending === "boolean") {
      updateData.showInTrending = body.showInTrending;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.entity.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, entity: updated });
  } catch (error) {
    console.error("Failed to update entity:", error);
    return NextResponse.json(
      { error: "Failed to update entity" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove entity and its mentions
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Delete related records first (cascade)
    await prisma.linkEntity.deleteMany({
      where: { entityId: id },
    });

    // Delete the entity
    await prisma.entity.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete entity:", error);
    return NextResponse.json(
      { error: "Failed to delete entity" },
      { status: 500 }
    );
  }
}
